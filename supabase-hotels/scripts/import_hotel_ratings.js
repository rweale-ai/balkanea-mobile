// Import RateHawk's hotel guest-review dump into balkanea_hotels_poc_v2's
// new `hotel_ratings` table (20260921000000_hotel_ratings_schema.sql).
//
// *** UNTESTED AGAINST A REAL DUMP FILE ***
// The RateHawk static-IP relay has been down since at least 2026-09-15
// (re-confirmed 2026-09-21, same day this was written) -- authenticated
// relay calls hang for 20s+ regardless of endpoint. This script is
// written entirely from RateHawk's own docs
// (docs.emergingtravel.com/docs/b2b-api/static-content/
// retrieve-hotel-reviews-dump/, fetched 2026-09-21) and has never seen one
// real byte of the actual file. Do not treat a clean run as proof the
// parsing logic is correct -- treat the FIRST real run's scanned/matched/
// skipped counts (logged below) as the actual verification step. If
// `matched` stays near 0 while `scanned` climbs, the file is probably not
// JSONL (see the format note below) and the parse loop needs rethinking,
// not just a retry.
//
// Source endpoint: POST /api/b2b/v3/hotel/reviews/dump/ -- same envelope
// shape as hotel/info/dump/ ({status, data: {url, last_update}}), per
// RateHawk's static-content docs being one consistent family -- this
// specific envelope shape is INFERRED from that pattern, not shown
// verbatim on the reviews-dump doc page itself.
//
// Format note: RateHawk's own docs page states the reviews dump file is
// "a GZIP archive" -- NOT the .jsonl.zst zstd format import_hotels_poc.js
// uses for the hotel-content dump. That's why this script uses Node's
// built-in zlib.createGunzip() instead of the zstd-napi dependency. (The
// *incremental* reviews dump's doc page shows a .jsonl.zst example
// filename instead -- a real inconsistency between the two review
// endpoints' docs, or a docs error; irrelevant here since this script
// only calls the full dump, but don't copy this gunzip assumption over to
// an incremental-reviews importer without checking that page's claim
// again.) Assumed still JSONL (one JSON object per line) once
// decompressed, same as every other RateHawk dump in this codebase --
// each line's JSON is a single-key object keyed by hotel slug:
//   { "<slug>": { "detailed_ratings": {...}, "reviews": [...] } }
//
// Slug resolution: the dump has no hid/country_code, only slug -- and
// slug is NOT globally unique in `hotels` (confirmed 2026-09-21: 98
// duplicate slugs across 3,489,439 rows). Rather than loading a ~3.5M-row
// slug map into memory, this resolves slugs in the same batches it
// buffers reviews in, via one `WHERE slug = ANY($1)` query per batch
// (uses the existing idx_hotels_slug index, confirmed present in this
// project 2026-09-21 -- no new index needed).
//
// A duplicate slug is handled two different ways, confirmed by real
// testing against this DB (2026-09-21): if every matching row shares the
// SAME hid (just a different country_code), it's one real hotel whose
// region got reassigned between two hotel-content import runs, leaving a
// stale row in its old partition -- resolved by taking the most recently
// updated_at row, counted separately as resolvedSameHid. Only a slug
// matching genuinely DIFFERENT hids is skipped as truly ambiguous -- no
// signal exists there for which hotel the review actually belongs to.
//
// Requires in Mobile/supabase-hotels/.env (same as import_hotels_poc.js):
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
const readline = require('readline');
const { Client } = require('pg');

const LANGUAGE = process.argv[2] || 'en';
const BATCH_SIZE = 300; // same conservative cap as import_hotels_poc.js -- see that file for why
const PROGRESS_EVERY = 50_000;
// If we've scanned this many lines and matched none at all, the file is
// almost certainly not JSONL-per-line (e.g. one giant JSON object for the
// whole file) -- abort loudly instead of grinding through millions of
// parse errors and reporting a misleading "0 matched" success.
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

const RATINGS_COLS = [
  'country_code', 'hid', 'slug', 'detailed_ratings', 'reviews', 'review_count', 'source_language',
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
  const dumpUrl = dumpRes.body.data.url;
  console.log(`Got dump URL (last_update: ${dumpRes.body.data.last_update}). Streaming...`);

  let client = new Client({ connectionString: dbUrl });
  await client.connect();

  let pending = []; // [{ slug, detailedRatings, reviews }]
  let scanned = 0, parseErrors = 0, matched = 0, skippedNoMatch = 0, skippedAmbiguous = 0;
  let resolvedSameHid = 0, nonArrayReviews = 0;
  let abortChecked = false;
  const start = Date.now();

  async function reconnect() {
    try { await client.end(); } catch (_) {}
    client = new Client({ connectionString: dbUrl });
    await client.connect();
  }

  // Two DB round trips per batch: resolve slugs -> (country_code, hid),
  // then upsert only the unambiguous matches. Not wrapped in BEGIN/COMMIT
  // since the select doesn't need to be transactional with the write, and
  // there's only ever one write statement per flush (unlike
  // import_hotels_poc.js's hotels+rooms pair, which needed a transaction
  // to keep both writes atomic).
  async function flush() {
    if (pending.length === 0) return;
    const MAX_ATTEMPTS = 20;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        const slugs = pending.map((p) => p.slug);
        const lookup = await client.query(
          'select country_code, hid, slug, updated_at from hotels where slug = any($1)',
          [slugs],
        );
        const matchesBySlug = new Map();
        for (const row of lookup.rows) {
          if (!matchesBySlug.has(row.slug)) matchesBySlug.set(row.slug, []);
          matchesBySlug.get(row.slug).push(row);
        }

        const rows = [];
        for (const item of pending) {
          const matches = matchesBySlug.get(item.slug) || [];
          let chosen;
          if (matches.length === 0) {
            skippedNoMatch += 1;
            continue;
          } else if (matches.length === 1) {
            chosen = matches[0];
          } else {
            // Real case, confirmed 2026-09-21 testing: a slug can match
            // multiple rows that all share the same hid, just under
            // different country_code partitions -- one hotel whose region
            // was reassigned between two hotel-content import runs,
            // leaving a stale row behind in its old partition (the
            // importer upserts by (country_code, hid), so a changed
            // country_code creates a new row rather than moving the old
            // one). That's ONE hotel, not a real collision -- resolve it
            // by taking the most recently updated_at row. Only count as
            // genuinely ambiguous when the matches are different hids
            // entirely (a true multi-hotel slug collision, where there's
            // no signal for which one the review actually belongs to).
            const uniqueHids = new Set(matches.map((m) => m.hid));
            if (uniqueHids.size === 1) {
              resolvedSameHid += 1;
              chosen = matches.reduce((a, b) => (new Date(b.updated_at) > new Date(a.updated_at) ? b : a));
            } else {
              skippedAmbiguous += 1;
              continue;
            }
          }
          const { country_code, hid } = chosen;
          matched += 1;
          const reviews = Array.isArray(item.reviews) ? item.reviews : [];
          if (item.reviews != null && !Array.isArray(item.reviews)) nonArrayReviews += 1;
          rows.push([
            country_code, hid, item.slug,
            JSON.stringify(item.detailedRatings ?? null),
            JSON.stringify(reviews),
            reviews.length,
            LANGUAGE,
          ]);
        }

        if (rows.length > 0) {
          const { sql, params } = buildUpsert(rows);
          await client.query(sql, params);
        }
        pending = [];
        return;
      } catch (err) {
        console.error(`flush failed (attempt ${attempt + 1}/${MAX_ATTEMPTS}): ${err.message}`);
        // Same disk-auto-resize read-only window import_hotels_poc.js
        // hit -- see that file's comment. Expected to be far less likely
        // here (this table should stay small relative to hotels/rooms),
        // but the retry/backoff shape is kept identical for consistency.
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
  const decompressed = res.pipe(zlib.createGunzip());
  const rl = readline.createInterface({ input: decompressed, crlfDelay: Infinity });

  // for-await over readline, not rl.on('line', ...) -- see
  // import_hotels_poc.js's comment on the real overlapping-flush() bug
  // that pattern caused; same fix applies here.
  for await (const rawLine of rl) {
    scanned += 1;
    const line = rawLine.trim();
    if (!line) continue;

    let obj;
    try { obj = JSON.parse(line); }
    catch (_) { parseErrors += 1; continue; }

    const entries = Object.entries(obj);
    if (entries.length !== 1) { parseErrors += 1; continue; }
    const [slug, data] = entries[0];
    if (!slug || !data) { parseErrors += 1; continue; }

    pending.push({
      slug,
      detailedRatings: data.detailed_ratings,
      reviews: data.reviews,
    });

    if (pending.length >= BATCH_SIZE) {
      await flush();
    }

    if (scanned % PROGRESS_EVERY === 0) {
      const elapsed = (Date.now() - start) / 1000;
      console.log(`scanned ${scanned.toLocaleString()} | matched ${matched.toLocaleString()} (same-hid-resolved ${resolvedSameHid}) | no-match ${skippedNoMatch.toLocaleString()} | ambiguous ${skippedAmbiguous} | non-array reviews ${nonArrayReviews} | parse errors ${parseErrors} | ${elapsed.toFixed(0)}s elapsed`);
    }

    if (!abortChecked && scanned >= ABORT_IF_ZERO_MATCHES_AFTER) {
      abortChecked = true;
      if (matched === 0 && resolvedSameHid === 0) {
        throw new Error(
          `Scanned ${scanned} lines with 0 matches -- the file is likely not ` +
          `one-JSON-object-per-line as assumed. Inspect the raw decompressed file directly ` +
          `(don't keep running this) before deciding how to re-parse it.`
        );
      }
    }
  }
  await flush();

  await client.end();

  const elapsed = (Date.now() - start) / 1000;
  console.log(`\nDone in ${elapsed.toFixed(0)}s`);
  console.log(`Lines scanned: ${scanned.toLocaleString()}`);
  console.log(`Hotels matched + written: ${matched.toLocaleString()} (of which same-hid-across-partitions resolved: ${resolvedSameHid.toLocaleString()})`);
  console.log(`Skipped, no matching hotel: ${skippedNoMatch.toLocaleString()}`);
  console.log(`Skipped, ambiguous slug (matched >1 distinct hid): ${skippedAmbiguous.toLocaleString()}`);
  console.log(`Reviews field wasn't an array (coerced to []): ${nonArrayReviews.toLocaleString()}`);
  console.log(`Parse errors: ${parseErrors}`);
}

main().catch((err) => { console.error(err); process.exit(1); });
