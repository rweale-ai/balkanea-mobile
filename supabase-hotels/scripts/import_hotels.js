// Import hotel content from RateHawk's static-content dump into the
// partitioned hotels/rooms tables.
//
// Node port of import_hotels.py (2026-09-03) -- same logic, same upsert
// SQL, same safety properties (streaming read, batched upsert, retry-with-
// reconnect, re-runnable). Ported because this machine doesn't have Python
// installed and the production hosting-migration evaluation (see call
// transcript, 2026-09-03) needs this ready to run the moment RateHawk
// whitelists production for balkanea.com -- not blocked on installing a
// second language runtime first.
//
// Source: a JSONL export from RateHawk's retrieve_hotel_dump endpoint
// (https://docs.emergingtravel.com/docs/b2b-api/static-content/retrieve-hotel-dump/),
// same as the Python version -- a large file provided out of band (cPanel/
// FTP from Hristijan for the original 850k-hotel import), not fetched live
// by this script.
//
// Re-runnable: upserts on (country_code, hid) for hotels and
// (country_code, hotel_hid, room_group_id) for rooms.
//
// Usage:
//   node import_hotels.js [path-to-jsonl]
//   (defaults to D:\balkanea-hotel-data\combined_all_hotels.jsonl, same as
//   the Python version -- change TARGET_COUNTRIES below before a real
//   production-scale run if Balkanea's full footprint covers more than
//   these 10 countries; see the call transcript's ~1.5M vs 850k gap.)
//
// Requires SUPABASE_DB_URL in a .env file alongside this script's parent
// directory (supabase-hotels/.env, not committed) -- same file the Python
// version reads.

'use strict';

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { Client } = require('pg');

// Countries: filtered to the 10 current destination countries only, per
// Ray's 2026-08-06 scope note in the original script. Property kind is
// NOT filtered -- every kind is imported (business decision still pending,
// filter at query time once decided, not here).
const TARGET_COUNTRIES = new Set(['HR', 'CZ', 'EG', 'FR', 'GR', 'IT', 'ME', 'MK', 'ES', 'TR']);
const BATCH_SIZE = 2000;
const DEFAULT_SOURCE = 'D:\\balkanea-hotel-data\\combined_all_hotels.jsonl';
const PROGRESS_EVERY = 500_000;

function loadDbUrl() {
  const envPath = path.join(__dirname, '..', '.env');
  const text = fs.readFileSync(envPath, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.startsWith('SUPABASE_DB_URL=')) {
      return line.slice('SUPABASE_DB_URL='.length).trim();
    }
  }
  throw new Error('SUPABASE_DB_URL not found in .env');
}

function jsonOrEmptyArray(v) {
  return JSON.stringify(v ?? []);
}
function jsonOrEmptyObject(v) {
  return JSON.stringify(v ?? {});
}

function hotelRow(rec, countryCode) {
  const region = rec.region || {};
  return [
    rec.hid ?? null,
    countryCode,
    rec.id ?? null, // RateHawk's string id -> our `slug` column
    rec.name ?? null,
    rec.kind ?? null,
    rec.star_rating ?? null,
    rec.address ?? null,
    region.id ?? null,
    region.name ?? null,
    region.type ?? null,
    rec.latitude ?? null,
    rec.longitude ?? null,
    rec.phone ?? null,
    rec.email ?? null,
    rec.postal_code ?? null,
    rec.check_in_time ?? null,
    rec.check_out_time ?? null,
    jsonOrEmptyArray(rec.images),
    jsonOrEmptyArray(rec.amenity_groups),
    jsonOrEmptyArray(rec.description_struct),
    !!rec.deleted,
    'en',
  ];
}

function* roomRows(rec, countryCode) {
  const hid = rec.hid ?? null;
  for (const rg of rec.room_groups || []) {
    yield [
      hid,
      countryCode,
      rg.room_group_id ?? null,
      rg.name ?? null,
      jsonOrEmptyArray(rg.room_amenities),
      jsonOrEmptyObject(rg.rg_ext),
      jsonOrEmptyObject(rg.name_struct),
      jsonOrEmptyArray(rg.images),
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

// Builds a multi-row `INSERT ... VALUES ($1,$2,...),($n+1,...) ON CONFLICT
// DO UPDATE` with a flat params array -- Node's pg has no execute_values
// equivalent, this is the parameterized-placeholder version of the same
// batched upsert the Python script does via psycopg2.extras.execute_values.
function buildUpsert(table, cols, conflictCols, updateCols, rows) {
  const params = [];
  const valueGroups = rows.map((row) => {
    const placeholders = row.map((v) => {
      params.push(v);
      return `$${params.length}`;
    });
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

async function getDbSizeMb(client) {
  const res = await client.query('select pg_database_size(current_database()) as size');
  return Number(res.rows[0].size) / (1024 * 1024);
}

async function main() {
  const source = process.argv[2] || DEFAULT_SOURCE;
  const dbUrl = loadDbUrl();

  let client = new Client({ connectionString: dbUrl });
  await client.connect();

  // Keyed by natural key, not arrays -- de-dupes within a batch (Postgres
  // errors if ON CONFLICT DO UPDATE would touch the same row twice in one
  // statement); the source data has some duplicate hotel/room records,
  // last-one-wins here matches the upsert semantics used on conflict.
  // Same known gap as the Python version: rooms with a null
  // room_group_id all collide on this key in a JS Map too.
  let hotelBatch = new Map();
  let roomBatch = new Map();
  let scanned = 0;
  let matched = 0;
  let skippedDeleted = 0;
  let parseErrors = 0;
  const start = Date.now();

  async function reconnect() {
    try { await client.end(); } catch (_) {}
    client = new Client({ connectionString: dbUrl });
    await client.connect();
  }

  async function flush() {
    for (let attempt = 0; attempt < 5; attempt++) {
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
        console.error(`flush failed (attempt ${attempt + 1}/5): ${err.message}`);
        try { await client.query('ROLLBACK'); } catch (_) {}
        await new Promise((r) => setTimeout(r, 10_000));
        await reconnect();
      }
    }
    throw new Error('flush failed after 5 retries');
  }

  const rl = readline.createInterface({
    input: fs.createReadStream(source, { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  for await (const rawLine of rl) {
    scanned += 1;
    const line = rawLine.trim();
    if (!line) continue;

    let rec;
    try {
      rec = JSON.parse(line);
    } catch (_) {
      parseErrors += 1;
      continue;
    }

    const countryCode = (rec.region || {}).country_code;
    if (!TARGET_COUNTRIES.has(countryCode)) continue;
    if (rec.deleted) { skippedDeleted += 1; continue; }

    matched += 1;
    const hrow = hotelRow(rec, countryCode);
    hotelBatch.set(`${hrow[1]}|${hrow[0]}`, hrow); // country_code|hid
    for (const rrow of roomRows(rec, countryCode)) {
      roomBatch.set(`${rrow[1]}|${rrow[0]}|${rrow[2]}`, rrow); // country_code|hotel_hid|room_group_id
    }

    if (hotelBatch.size >= BATCH_SIZE) {
      await flush();
    }

    if (scanned % PROGRESS_EVERY === 0) {
      const elapsed = (Date.now() - start) / 1000;
      const dbSize = await getDbSizeMb(client);
      console.log(`scanned ${scanned.toLocaleString()} lines | matched ${matched.toLocaleString()} | errors ${parseErrors} | ${elapsed.toFixed(0)}s elapsed | db size ${dbSize.toFixed(0)}MB`);
    }
  }

  await flush();
  await client.end();

  const elapsed = (Date.now() - start) / 1000;
  console.log(`\nDone in ${elapsed.toFixed(0)}s`);
  console.log(`Lines scanned: ${scanned.toLocaleString()}`);
  console.log(`Hotels matched (target countries, not deleted): ${matched.toLocaleString()}`);
  console.log(`Skipped as deleted: ${skippedDeleted.toLocaleString()}`);
  console.log(`Parse errors: ${parseErrors}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
