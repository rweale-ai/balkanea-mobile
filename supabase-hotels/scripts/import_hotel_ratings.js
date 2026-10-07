// Import RateHawk's production hotel guest-review dump into
// balkanea_hotels_poc_v2's `hotel_ratings` table
// (20260921000000_hotel_ratings_schema.sql + 20261006000000_hotel_ratings_rating_column.sql).
//
// Source: POST /api/b2b/v3/hotel/reviews/dump/ via the VPN relay
// (production key, whitelisted IP) -> {status, data: {url, last_update}}.
// The url is a presigned S3 link to feed_v3_<lang>.json.gz.
//
// Real file format (checked against production 2026-10-06, and the
// sandbox file 2026-09-28) -- NOT what RateHawk's docs page implies:
//   - gzip, ~11 MB compressed for `en` -- small enough to download and
//     JSON.parse whole, so no streaming parser.
//   - ONE JSON object for the whole file, not JSONL:
//       { "<slug>": { "hid": 6291619, "rating": 8.9,
//                     "detailed_ratings": {...}, "reviews": [...] } | null, ... }
//   - Each entry carries `hid`, so matching is by hid (idx_hotels_hid),
//     which avoids the non-unique-slug problem entirely.
//   - Reviews DO have an `id`; per-review `detailed` values can be strings
//     ("perfect", "unspecified"), not only numbers -- kept as-is in JSONB.
//
// A hid can exist under two country_code partitions in `hotels` (a region
// reassigned between hotel-content imports leaves a stale row). The most
// recently updated row wins, so the FK to hotels(country_code, hid) holds.
//
// Re-runnable: upserts on (country_code, hid). Each run requests a fresh
// dump URL (presigned links expire; dump calls count toward RateHawk's
// 100/day limit).
//
// Requires in Mobile/supabase-hotels/.env:
//   SUPABASE_HOTELS_POC_DB_URL, RATEHAWK_PROXY_URL, RATEHAWK_PROXY_SECRET,
//   RATEHAWK_PRODUCTION_KEY_ID / RATEHAWK_PRODUCTION_API_KEY
//
// Run: node scripts/import_hotel_ratings.js [language]   (default: en)

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const zlib = require('zlib');
const crypto = require('crypto');
const { Client } = require('pg');

const LANGUAGE = process.argv[2] || 'en';
const BATCH_SIZE = 300; // same conservative cap as import_hotels_poc.js -- see that file for why
const PROGRESS_EVERY = 50_000;
// If this many entries resolve to no hotel at all, something is wrong with
// matching (wrong DB, wrong id field) -- stop instead of reporting a
// misleading "0 matched" success.
const ABORT_IF_ZERO_MATCHES_AFTER = 5_000;

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

// Same relay-signing shape as import_hotels_poc.js's relayPost() --
// duplicated rather than shared since these scripts run standalone.
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

function download(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) { res.resume(); reject(new Error(`S3 GET failed: ${res.statusCode}`)); return; }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

// Entries are null for hotels RateHawk lists but has no feedback for.
function hasData(v) {
  return v && v.hid != null && (
    typeof v.rating === 'number' ||
    (v.detailed_ratings && Object.values(v.detailed_ratings).some((x) => x != null)) ||
    (Array.isArray(v.reviews) && v.reviews.length > 0)
  );
}

const RATINGS_COLS = [
  'country_code', 'hid', 'slug', 'rating', 'detailed_ratings', 'reviews', 'review_count',
  'source_language', 'source_last_update',
];
const RATINGS_UPDATE_COLS = RATINGS_COLS.filter((c) => c !== 'country_code' && c !== 'hid');

function buildUpsert(rows) {
  const params = [];
  const valueGroups = rows.map((row) => {
    const placeholders = row.map((v) => { params.push(v); return `$${params.length}`; });
    return `(${placeholders.join(',')})`;
  });
  const setClause = RATINGS_UPDATE_COLS.map((c) => `${c} = excluded.${c}`).join(', ');
  const sql = `
    insert into hotel_ratings (${RATINGS_COLS.join(', ')})
    values ${valueGroups.join(',')}
    on conflict (country_code, hid) do update set
      ${setClause}, updated_at = now()
  `;
  return { sql, params };
}

async function main() {
  const env = loadEnv();
  const dbUrl = env.SUPABASE_HOTELS_POC_DB_URL;
  if (!dbUrl) throw new Error('SUPABASE_HOTELS_POC_DB_URL not set in .env');

  console.log(`Requesting fresh reviews-dump URL for language=${LANGUAGE}...`);
  const dumpRes = await relayPost(
    env.RATEHAWK_PROXY_URL, env.RATEHAWK_PROXY_SECRET,
    env.RATEHAWK_PRODUCTION_KEY_ID, env.RATEHAWK_PRODUCTION_API_KEY,
    '/api/b2b/v3/hotel/reviews/dump/', { language: LANGUAGE },
  );
  if (dumpRes.status !== 200 || dumpRes.body.status !== 'ok') {
    throw new Error(`Dump request failed: ${JSON.stringify(dumpRes.body)}`);
  }
  const lastUpdate = dumpRes.body.data.last_update || null;
  console.log(`Got dump URL (last_update: ${lastUpdate}). Downloading...`);

  const start = Date.now();
  const gz = await download(dumpRes.body.data.url);
  const dump = JSON.parse(zlib.gunzipSync(gz).toString('utf8'));
  const allKeys = Object.keys(dump).length;
  const entries = Object.entries(dump).filter(([, v]) => hasData(v));
  console.log(`Downloaded ${(gz.length / 1e6).toFixed(1)} MB gz. Dump entries: ${allKeys.toLocaleString()}, with rating/reviews: ${entries.length.toLocaleString()}`);

  let client = new Client({ connectionString: dbUrl });
  await client.connect();
  async function reconnect() {
    try { await client.end(); } catch (_) {}
    client = new Client({ connectionString: dbUrl });
    await client.connect();
  }

  let matched = 0, skippedNoMatch = 0, reviewsWritten = 0;

  // Two DB round trips per batch: resolve hid -> country_code (most
  // recently updated row if a hid sits in two partitions), then upsert.
  async function flush(batch) {
    const MAX_ATTEMPTS = 20;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        const lookup = await client.query(
          `select distinct on (hid) country_code, hid
             from hotels where hid = any($1::bigint[])
            order by hid, updated_at desc`,
          [batch.map(([, v]) => v.hid)],
        );
        const countryByHid = new Map(lookup.rows.map((r) => [String(r.hid), r.country_code]));
        const rows = [];
        let batchReviews = 0;
        for (const [slug, v] of batch) {
          const cc = countryByHid.get(String(v.hid));
          if (!cc) continue;
          const reviews = Array.isArray(v.reviews) ? v.reviews : [];
          batchReviews += reviews.length;
          rows.push([
            cc, v.hid, slug,
            typeof v.rating === 'number' ? v.rating : null,
            JSON.stringify(v.detailed_ratings ?? null),
            JSON.stringify(reviews),
            reviews.length,
            LANGUAGE,
            lastUpdate,
          ]);
        }
        if (rows.length > 0) {
          const { sql, params } = buildUpsert(rows);
          await client.query(sql, params);
        }
        matched += rows.length;
        skippedNoMatch += batch.length - rows.length;
        reviewsWritten += batchReviews;
        return;
      } catch (err) {
        console.error(`flush failed (attempt ${attempt + 1}/${MAX_ATTEMPTS}): ${err.message}`);
        // Same disk-auto-resize read-only window import_hotels_poc.js hit.
        const isReadOnly = /read-only transaction/i.test(err.message);
        await new Promise((r) => setTimeout(r, isReadOnly ? 30_000 : 10_000));
        await reconnect();
      }
    }
    throw new Error(`flush failed after ${MAX_ATTEMPTS} retries`);
  }

  let nextProgress = PROGRESS_EVERY;
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    await flush(entries.slice(i, i + BATCH_SIZE));
    const processed = Math.min(i + BATCH_SIZE, entries.length);
    if (processed >= ABORT_IF_ZERO_MATCHES_AFTER && matched === 0) {
      throw new Error(`${processed} entries resolved to 0 hotels -- check SUPABASE_HOTELS_POC_DB_URL and the dump's hid field before re-running.`);
    }
    if (processed >= nextProgress) {
      nextProgress += PROGRESS_EVERY;
      console.log(`processed ${processed.toLocaleString()}/${entries.length.toLocaleString()} | matched ${matched.toLocaleString()} | no-match ${skippedNoMatch.toLocaleString()} | ${((Date.now() - start) / 1000).toFixed(0)}s`);
    }
  }

  const { rows: [t] } = await client.query(
    `select count(*)::int n, count(*) filter (where review_count > 0)::int with_reviews,
            coalesce(sum(review_count), 0)::bigint reviews from hotel_ratings`,
  );
  await client.end();

  console.log(`\nDone in ${((Date.now() - start) / 1000).toFixed(0)}s`);
  console.log(`Dump entries: ${allKeys.toLocaleString()} (with rating/reviews: ${entries.length.toLocaleString()})`);
  console.log(`Matched + written: ${matched.toLocaleString()} (${reviewsWritten.toLocaleString()} reviews)`);
  console.log(`Skipped, hid not in hotels: ${skippedNoMatch.toLocaleString()}`);
  console.log(`hotel_ratings now: ${t.n.toLocaleString()} hotels, ${t.with_reviews.toLocaleString()} with reviews, ${Number(t.reviews).toLocaleString()} reviews`);
}

main().catch((err) => { console.error(err); process.exit(1); });
