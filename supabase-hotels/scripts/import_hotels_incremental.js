// Daily incremental refresh of balkanea_hotels_poc, layered on top of the
// full weekly dump (import_hotels_poc.js) per RateHawk's own documented
// model -- see project_balkanea_hotels_poc_database /
// project_balkanea_ratehawk_incremental_dump memory. Confirmed real
// endpoint behavior (2026-09-04, direct API testing, docs are
// partner-gated):
//   - POST /api/b2b/v3/hotel/info/incremental_dump/, only `language` is a
//     real param -- no `date` param exists, you always get "whatever
//     RateHawk currently has staged", never a specific historical day.
//     This is exactly why the weekly full dump still runs: it's the only
//     way to correct drift from a missed/failed daily run.
//   - Each line is a FULL hotel record, not a diff/patch -- same shape as
//     the full dump, same upsert logic applies.
//   - No `updated_at` field on real records, despite RateHawk's own blog
//     claiming "incremental logic based on updated_at and NEW/UPDATED
//     filters" -- that doesn't match the real payload. Every record in the
//     file gets processed as a full replacement row; there's no cheaper
//     partial-update path available.
//
// Differs from import_hotels_poc.js in two ways:
//   1. Calls incremental_dump instead of dump.
//   2. `deleted: true` records are SOFT-DELETED (UPDATE is_deleted=true on
//      the existing row) instead of skipped. import_hotels_poc.js's skip
//      behavior is correct there (loading into empty tables, a deleted
//      hotel was never in the DB to begin with) but wrong here -- if a
//      hotel already loaded from a prior run gets marked deleted in an
//      incremental file, skipping it would leave the stale row in the DB
//      forever, never reflecting the removal.
// No index drop/rebuild here -- the daily changed-hotel set is a tiny
// fraction of the ~3.5M total rows, so incremental index maintenance cost
// isn't worth the operational complexity of dropping/rebuilding for it.
//
// Requires in Mobile/supabase-hotels/.env (same as import_hotels_poc.js):
//   SUPABASE_HOTELS_POC_DB_URL, RATEHAWK_PROXY_URL, RATEHAWK_PROXY_SECRET,
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
const BATCH_SIZE = 300; // same conservative cap as import_hotels_poc.js -- see that file for why 300
const PROGRESS_EVERY = 50_000; // incremental file is much smaller than the full dump

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
    false, LANGUAGE, // is_deleted always false here -- deleted:true records never reach this function, see the split below
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

// Soft-delete: only touches rows that already exist (a deleted hotel we
// never had isn't worth inserting just to mark it deleted).
function buildSoftDelete(pairs) {
  const params = [];
  const valueGroups = pairs.map(([countryCode, hid]) => {
    params.push(countryCode, hid);
    return `($${params.length - 1}, $${params.length})`;
  });
  const sql = `
    update hotels set is_deleted = true, updated_at = now()
    from (values ${valueGroups.join(',')}) as d(country_code, hid)
    where hotels.country_code = d.country_code and hotels.hid = d.hid
  `;
  return { sql, params };
}

async function main() {
  const env = loadEnv();
  const dbUrl = env.SUPABASE_HOTELS_POC_DB_URL;
  if (!dbUrl) throw new Error('SUPABASE_HOTELS_POC_DB_URL not set in .env');

  console.log(`Requesting incremental dump URL for language=${LANGUAGE}...`);
  const dumpRes = await relayPost(
    env.RATEHAWK_PROXY_URL, env.RATEHAWK_PROXY_SECRET,
    env.RATEHAWK_PRODUCTION_KEY_ID, env.RATEHAWK_PRODUCTION_API_KEY,
    '/api/b2b/v3/hotel/info/incremental_dump/', { language: LANGUAGE },
  );
  if (dumpRes.status !== 200 || dumpRes.body.status !== 'ok') {
    throw new Error(`Incremental dump request failed: ${JSON.stringify(dumpRes.body)}`);
  }
  const dumpUrl = dumpRes.body.data.url;
  console.log(`Got incremental dump URL (last_update: ${dumpRes.body.data.last_update}). Streaming...`);

  let client = new Client({ connectionString: dbUrl });
  await client.connect();

  let hotelBatch = new Map();
  let roomBatch = new Map();
  let deleteBatch = new Map();
  let scanned = 0, upserted = 0, softDeleted = 0, parseErrors = 0;
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
        if (deleteBatch.size > 0) {
          const { sql, params } = buildSoftDelete([...deleteBatch.values()]);
          await client.query(sql, params);
        }
        await client.query('COMMIT');
        hotelBatch.clear();
        roomBatch.clear();
        deleteBatch.clear();
        return;
      } catch (err) {
        console.error(`flush failed (attempt ${attempt + 1}/${MAX_ATTEMPTS}): ${err.message}`);
        try { await client.query('ROLLBACK'); } catch (_) {}
        // Same read-only-during-disk-resize handling as import_hotels_poc.js,
        // though far less likely to trigger given the daily payload is tiny.
        const isReadOnly = /read-only transaction/i.test(err.message);
        await new Promise((r) => setTimeout(r, isReadOnly ? 30_000 : 10_000));
        await reconnect();
      }
    }
    throw new Error(`flush failed after ${MAX_ATTEMPTS} retries`);
  }

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

    if (rec.deleted) {
      softDeleted += 1;
      const hid = rec.hid ?? null;
      if (hid != null) deleteBatch.set(`${countryCode}|${hid}`, [countryCode, hid]);
      continue;
    }

    upserted += 1;
    const hrow = hotelRow(rec, countryCode);
    hotelBatch.set(`${hrow[1]}|${hrow[0]}`, hrow);
    for (const rrow of roomRows(rec, countryCode)) {
      roomBatch.set(`${rrow[1]}|${rrow[0]}|${rrow[2]}`, rrow);
    }

    if (hotelBatch.size >= BATCH_SIZE || roomBatch.size >= BATCH_SIZE || deleteBatch.size >= BATCH_SIZE) {
      await flush();
    }

    if (scanned % PROGRESS_EVERY === 0) {
      const elapsed = (Date.now() - start) / 1000;
      console.log(`scanned ${scanned.toLocaleString()} | upserted ${upserted.toLocaleString()} | soft-deleted ${softDeleted.toLocaleString()} | errors ${parseErrors} | ${elapsed.toFixed(0)}s elapsed`);
    }
  }
  await flush();

  await client.end();

  const elapsed = (Date.now() - start) / 1000;
  console.log(`\nDone in ${elapsed.toFixed(0)}s`);
  console.log(`Lines scanned: ${scanned.toLocaleString()}`);
  console.log(`Hotels upserted: ${upserted.toLocaleString()}`);
  console.log(`Hotels soft-deleted: ${softDeleted.toLocaleString()}`);
  console.log(`Parse errors: ${parseErrors}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
