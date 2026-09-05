// Import RateHawk's REAL, GLOBAL, PRODUCTION hotel content dump into
// balkanea_hotels_poc (see project_balkanea_hotels_poc_database memory).
//
// Differs from import_hotels.js/py in three ways, per Ray's explicit
// direction (2026-09-04):
//   1. No TARGET_COUNTRIES filter -- every country is imported (the POC
//      database's partition scheme was expanded to cover all ISO 3166-1
//      alpha-2 codes for exactly this reason).
//   2. English only (language: 'en') -- RateHawk's dump is one full global
//      file PER language (33 supported, confirmed via a real API call --
//      see project_balkanea_ratehawk_dump_scope memory); loading more than
//      one means running this again with a different LANGUAGE below, and
//      would need a schema change (source_language isn't part of the key
//      today) since a second language pull would just overwrite English
//      rows for the same (country_code, hid), not add a translated variant.
//   3. Streams the dump directly from RateHawk's own API/S3 (via the
//      RATEHAWK_PROXY_URL relay + RATEHAWK_PRODUCTION_KEY_ID/API_KEY),
//      through zstd-napi's DecompressStream, rather than reading an
//      already-decompressed file someone handed over out of band. The
//      dump format is .jsonl.zst -- confirmed by directly calling the
//      endpoint, since RateHawk's own docs are partner-gated (403'd every
//      public/search attempt).
//
// Requires in Mobile/supabase-hotels/.env:
//   SUPABASE_HOTELS_POC_DB_URL  -- the new project's connection string
//   RATEHAWK_PROXY_URL          -- the VPN relay (Chat/infra/vpn-relay)
//   RATEHAWK_PROXY_SECRET       -- HMAC secret shared with that relay
//   RATEHAWK_PRODUCTION_KEY_ID / RATEHAWK_PRODUCTION_API_KEY

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const readline = require('readline');
const { Client } = require('pg');
const { DecompressStream } = require('zstd-napi');

const LANGUAGE = process.argv[2] || 'en';
// Deliberately much smaller than import_hotels.js/.py's 2000 -- see the
// comment at the flush-trigger check below for why (a real pg query
// failure at 31,496 params, only one data point on the real ceiling).
const BATCH_SIZE = 300;
const PROGRESS_EVERY = 500_000;

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  const text = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim();
  }
  return env;
}

// Same relay-signing shape as Chat/lib/ratehawk.js's post() -- separate
// implementation here since this script runs standalone, not inside the
// Vercel backend.
function relayPost(proxyUrl, proxySecret, keyId, apiKey, urlPath, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const url = new URL(urlPath, proxyUrl);
    const signature = crypto.createHmac('sha256', proxySecret).update(data, 'utf8').digest('hex');
    const req = https.request({
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + Buffer.from(`${keyId}:${apiKey}`).toString('base64'),
        'X-Balkanea-Proxy-Signature': signature,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch (e) { reject(new Error('Invalid JSON from relay: ' + raw.slice(0, 200))); }
      });
    });
    req.on('error', reject);
    req.setTimeout(20000, () => req.destroy(new Error('relay timeout')));
    req.write(data);
    req.end();
  });
}

function jsonOrEmptyArray(v) { return JSON.stringify(v ?? []); }
function jsonOrEmptyObject(v) { return JSON.stringify(v ?? {}); }

function hotelRow(rec, countryCode) {
  const region = rec.region || {};
  return [
    rec.hid ?? null, countryCode, rec.id ?? null, rec.name ?? null, rec.kind ?? null,
    rec.star_rating ?? null, rec.address ?? null, region.id ?? null, region.name ?? null,
    region.type ?? null, rec.latitude ?? null, rec.longitude ?? null, rec.phone ?? null,
    rec.email ?? null, rec.postal_code ?? null, rec.check_in_time ?? null, rec.check_out_time ?? null,
    jsonOrEmptyArray(rec.images), jsonOrEmptyArray(rec.amenity_groups), jsonOrEmptyArray(rec.description_struct),
    !!rec.deleted, LANGUAGE,
  ];
}

function* roomRows(rec, countryCode) {
  const hid = rec.hid ?? null;
  for (const rg of rec.room_groups || []) {
    yield [
      hid, countryCode, rg.room_group_id ?? null, rg.name ?? null,
      jsonOrEmptyArray(rg.room_amenities), jsonOrEmptyObject(rg.rg_ext),
      jsonOrEmptyObject(rg.name_struct), jsonOrEmptyArray(rg.images),
    ];
  }
}

const HOTEL_COLS = [
  'hid', 'country_code', 'slug', 'name', 'kind', 'star_rating', 'address',
  'region_id', 'region_name', 'region_type', 'latitude', 'longitude',
  'phone', 'email', 'postal_code', 'check_in_time', 'check_out_time',
  'images', 'amenity_groups', 'description_struct', 'is_deleted', 'source_language',
];
const HOTEL_UPDATE_COLS = HOTEL_COLS.filter((c) => c !== 'hid' && c !== 'country_code');

const ROOM_COLS = [
  'hotel_hid', 'country_code', 'room_group_id', 'name',
  'room_amenities', 'rg_ext', 'name_struct', 'images',
];
const ROOM_UPDATE_COLS = ROOM_COLS.filter((c) => c !== 'hotel_hid' && c !== 'country_code' && c !== 'room_group_id');

function buildUpsert(table, cols, conflictCols, updateCols, rows) {
  const params = [];
  const valueGroups = rows.map((row) => {
    const placeholders = row.map((v) => { params.push(v); return `$${params.length}`; });
    return `(${placeholders.join(',')})`;
  });
  const setClause = updateCols.map((c) => `${c} = excluded.${c}`).join(', ');
  const sql = `
    insert into ${table} (${cols.join(', ')})
    values ${valueGroups.join(',')}
    on conflict (${conflictCols.join(', ')}) do update set
      ${setClause}, updated_at = now()
  `;
  return { sql, params };
}

async function main() {
  const env = loadEnv();
  const dbUrl = env.SUPABASE_HOTELS_POC_DB_URL;
  if (!dbUrl) throw new Error('SUPABASE_HOTELS_POC_DB_URL not set in .env');

  console.log(`Requesting fresh dump URL for language=${LANGUAGE}...`);
  const dumpRes = await relayPost(
    env.RATEHAWK_PROXY_URL, env.RATEHAWK_PROXY_SECRET,
    env.RATEHAWK_PRODUCTION_KEY_ID, env.RATEHAWK_PRODUCTION_API_KEY,
    '/api/b2b/v3/hotel/info/dump/', { language: LANGUAGE },
  );
  if (dumpRes.status !== 200 || dumpRes.body.status !== 'ok') {
    throw new Error(`Dump request failed: ${JSON.stringify(dumpRes.body)}`);
  }
  const dumpUrl = dumpRes.body.data.url;
  console.log(`Got dump URL (last_update: ${dumpRes.body.data.last_update}). Streaming...`);

  let client = new Client({ connectionString: dbUrl });
  await client.connect();

  let hotelBatch = new Map();
  let roomBatch = new Map();
  let scanned = 0, matched = 0, skippedDeleted = 0, parseErrors = 0;
  const start = Date.now();

  async function reconnect() {
    try { await client.end(); } catch (_) {}
    client = new Client({ connectionString: dbUrl });
    await client.connect();
  }

  async function flush() {
    const MAX_ATTEMPTS = 20;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        await client.query('BEGIN');
        if (hotelBatch.size > 0) {
          const { sql, params } = buildUpsert('hotels', HOTEL_COLS, ['country_code', 'hid'], HOTEL_UPDATE_COLS, [...hotelBatch.values()]);
          await client.query(sql, params);
        }
        if (roomBatch.size > 0) {
          const { sql, params } = buildUpsert('rooms', ROOM_COLS, ['country_code', 'hotel_hid', 'room_group_id'], ROOM_UPDATE_COLS, [...roomBatch.values()]);
          await client.query(sql, params);
        }
        await client.query('COMMIT');
        hotelBatch.clear();
        roomBatch.clear();
        return;
      } catch (err) {
        console.error(`flush failed (attempt ${attempt + 1}/${MAX_ATTEMPTS}): ${err.message}`);
        try { await client.query('ROLLBACK'); } catch (_) {}
        // Confirmed 2026-09-04: this project's disk started at just 2GB
        // and auto-expands on Supabase's Pro plan when usage hits 90% --
        // the database goes briefly read-only during the resize itself
        // ("cannot execute INSERT in a read-only transaction"), not a bug,
        // and can take a few minutes, not seconds. Give that specific
        // error much longer to clear than a generic transient failure --
        // this WILL happen again as the import grows toward the full
        // global scope (~20-25GB estimated, see
        // project_balkanea_hotels_poc_database memory).
        const isReadOnly = /read-only transaction/i.test(err.message);
        await new Promise((r) => setTimeout(r, isReadOnly ? 30_000 : 10_000));
        await reconnect();
      }
    }
    throw new Error(`flush failed after ${MAX_ATTEMPTS} retries`);
  }

  // for-await over readline, exactly like import_hotels.js's proven
  // pattern -- NOT rl.on('line', async ...) with manual pause()/resume().
  // First attempt (2026-09-04, killed after ~2,000 hotels) used the event
  // form: readline can emit several 'line' events synchronously before an
  // async handler's rl.pause() call actually takes effect, so flush()
  // calls overlapped on the same pg Client (surfaced as a "client already
  // executing a query" deprecation warning). for-await's loop body is
  // fully awaited before the next line is pulled, so there's no window
  // for two flush() calls to ever be in flight at once.
  const res = await new Promise((resolve, reject) => {
    https.get(dumpUrl, resolve).on('error', reject);
  });
  if (res.statusCode !== 200) {
    throw new Error(`S3 GET failed: ${res.statusCode}`);
  }
  const decompressed = res.pipe(new DecompressStream());
  const rl = readline.createInterface({ input: decompressed, crlfDelay: Infinity });

  for await (const rawLine of rl) {
    scanned += 1;
    const line = rawLine.trim();
    if (!line) continue;

    let rec;
    try { rec = JSON.parse(line); }
    catch (_) { parseErrors += 1; continue; }

    const countryCode = (rec.region || {}).country_code;
    if (!countryCode) continue;
    if (rec.deleted) { skippedDeleted += 1; continue; }

    matched += 1;
    const hrow = hotelRow(rec, countryCode);
    hotelBatch.set(`${hrow[1]}|${hrow[0]}`, hrow);
    for (const rrow of roomRows(rec, countryCode)) {
      roomBatch.set(`${rrow[1]}|${rrow[0]}|${rrow[2]}`, rrow);
    }

    // Cap BOTH batches independently -- the original script only checked
    // hotelBatch.size, but rooms have a many-per-hotel relationship, so
    // roomBatch can grow well past a hotel-sized threshold while
    // hotelBatch is still small. Confirmed 2026-09-04: an unflushed room
    // batch of 3,937 rows (31,496 params at 8 cols/row) made a real query
    // fail server-side ("bind message has 31496 parameter formats but 0
    // parameters") -- looks like a real pg driver limitation with large
    // single-query parameter counts, not something worth retrying
    // through. Only one data point on where the real ceiling is, so
    // BATCH_SIZE is deliberately small (300) to stay well clear of it in
    // both directions -- worst case is hotels at 300 rows x 22 cols =
    // 6,600 params, rooms at 300 x 8 = 2,400, both far under the 31,496
    // that broke.
    if (hotelBatch.size >= BATCH_SIZE || roomBatch.size >= BATCH_SIZE) {
      await flush();
    }

    if (scanned % PROGRESS_EVERY === 0) {
      const elapsed = (Date.now() - start) / 1000;
      console.log(`scanned ${scanned.toLocaleString()} | matched ${matched.toLocaleString()} | errors ${parseErrors} | ${elapsed.toFixed(0)}s elapsed`);
    }
  }
  await flush();

  await client.end();

  const elapsed = (Date.now() - start) / 1000;
  console.log(`\nDone in ${elapsed.toFixed(0)}s`);
  console.log(`Lines scanned: ${scanned.toLocaleString()}`);
  console.log(`Hotels matched (not deleted): ${matched.toLocaleString()}`);
  console.log(`Skipped as deleted: ${skippedDeleted.toLocaleString()}`);
  console.log(`Parse errors: ${parseErrors}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
