// Import RateHawk's production hotel guest-review dumps (all languages)
// into balkanea_hotels_poc_v2's `hotel_ratings` table
// (20260921000000_hotel_ratings_schema.sql + 20261006000000_hotel_ratings_rating_column.sql).
//
// Source: POST /api/b2b/v3/hotel/reviews/dump/ {language} via the VPN relay
// (production key, whitelisted IP) -> {status, data: {url, last_update}}.
// The url is a presigned S3 link to feed_v3_<lang>.json.gz.
//
// Real file format (checked against production 2026-10-06/07) -- NOT what
// RateHawk's docs page implies:
//   - One file PER REVIEW LANGUAGE. A hotel appears in a language's file
//     only if it has reviews in that language, and that file carries only
//     those reviews. The hotel-level `rating` / `detailed_ratings` are the
//     same in every file. Sizes vary hugely (2026-10-06: ru 318 MB gz,
//     en 11 MB, de 1.5 MB), so a "full" load means every language merged.
//   - gzip of ONE JSON object, written one hotel per line:
//       {
//       "<slug>":{"hid":6291619,"rating":8.9,"detailed_ratings":{...},"reviews":[...]},
//       ...
//       }
//     Streamed line by line (ru is too big to JSON.parse whole).
//   - Each entry carries `hid`, so matching is by hid (idx_hotels_hid),
//     which avoids the non-unique-slug problem entirely.
//   - Reviews DO have an `id`; per-review `detailed` values can be strings
//     ("perfect", "unspecified"), not only numbers -- kept as-is in JSONB.
//
// Merge: one row per hotel. Each review is tagged with `lang`. Loading a
// language replaces only that language's reviews on the row, so any
// language can be re-run on its own. source_language lists the languages
// merged into the row.
//
// A hid can exist under two country_code partitions in `hotels` (a region
// reassigned between hotel-content imports leaves a stale row). The most
// recently updated row wins, so the FK to hotels(country_code, hid) holds.
//
// Each language requests a fresh dump URL (presigned links expire; dump
// calls count toward RateHawk's 100/day limit).
//
// Requires in Mobile/supabase-hotels/.env:
//   SUPABASE_HOTELS_POC_DB_URL, RATEHAWK_PROXY_URL, RATEHAWK_PROXY_SECRET,
//   RATEHAWK_PRODUCTION_KEY_ID / RATEHAWK_PRODUCTION_API_KEY
//
// Run: node scripts/import_hotel_ratings.js            # every language
//      node scripts/import_hotel_ratings.js ru de      # just these

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const zlib = require('zlib');
const crypto = require('crypto');
const readline = require('readline');
const { Client } = require('pg');

// RateHawk's documented content languages. Codes RateHawk rejects are
// logged and skipped, not fatal.
const ALL_LANGUAGES = [
  'en', 'ru', 'de', 'fr', 'es', 'it', 'pt', 'pt_PT', 'nl', 'pl', 'cs', 'sk', 'hu', 'ro', 'bg', 'el',
  'sr', 'hr', 'sl', 'sq', 'mk', 'tr', 'uk', 'kk', 'ar', 'he', 'fi', 'sv', 'da', 'no', 'ja', 'ko',
  'th', 'vi', 'zh_CN', 'zh_TW',
];
const LANGUAGES = process.argv.slice(2).length ? process.argv.slice(2) : ALL_LANGUAGES;
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

function openStream(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode !== 200) { res.resume(); reject(new Error(`S3 GET failed: ${res.statusCode}`)); return; }
      resolve(res);
    }).on('error', reject);
  });
}

// One hotel per line: `"slug":{...},` -- wrap it back into an object.
// Returns [slug, entry] or null for the opening/closing brace lines.
function parseLine(rawLine) {
  const line = rawLine.trim().replace(/,$/, '');
  if (!line || line === '{' || line === '}') return null;
  const obj = JSON.parse(`{${line}}`);
  const [slug, entry] = Object.entries(obj)[0];
  return [slug, entry];
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

// Merge upsert: keep other languages' reviews, replace this language's.
function buildUpsert(rows) {
  const params = [];
  const valueGroups = rows.map((row) => {
    const placeholders = row.map((v) => { params.push(v); return `$${params.length}`; });
    return `(${placeholders.join(',')})`;
  });
  const sql = `
    insert into hotel_ratings as t (${RATINGS_COLS.join(', ')})
    values ${valueGroups.join(',')}
    on conflict (country_code, hid) do update set
      slug = excluded.slug,
      rating = coalesce(excluded.rating, t.rating),
      detailed_ratings = coalesce(nullif(excluded.detailed_ratings, 'null'::jsonb), t.detailed_ratings),
      reviews = coalesce((select jsonb_agg(e) from jsonb_array_elements(t.reviews) e
                           where e->>'lang' is distinct from excluded.source_language), '[]'::jsonb)
                || excluded.reviews,
      review_count = (select count(*) from jsonb_array_elements(t.reviews) e
                       where e->>'lang' is distinct from excluded.source_language)
                     + excluded.review_count,
      source_language = case
        when excluded.source_language = any(string_to_array(t.source_language, ',')) then t.source_language
        else t.source_language || ',' || excluded.source_language end,
      source_last_update = greatest(t.source_last_update, excluded.source_last_update),
      updated_at = now()
  `;
  return { sql, params };
}

async function importLanguage(env, getClient, reconnect, lang) {
  const dumpRes = await relayPost(
    env.RATEHAWK_PROXY_URL, env.RATEHAWK_PROXY_SECRET,
    env.RATEHAWK_PRODUCTION_KEY_ID, env.RATEHAWK_PRODUCTION_API_KEY,
    '/api/b2b/v3/hotel/reviews/dump/', { language: lang },
  );
  if (dumpRes.status !== 200 || dumpRes.body.status !== 'ok' || !dumpRes.body.data?.url) {
    console.log(`[${lang}] skipped -- dump request returned ${JSON.stringify(dumpRes.body).slice(0, 200)}`);
    return null;
  }
  const lastUpdate = dumpRes.body.data.last_update || null;
  const start = Date.now();
  console.log(`[${lang}] dump last_update ${lastUpdate}, streaming...`);

  const stats = { lang, entries: 0, matched: 0, noMatch: 0, reviews: 0, parseErrors: 0 };
  let pending = [];

  async function flush() {
    if (pending.length === 0) return;
    const batch = pending;
    pending = [];
    const MAX_ATTEMPTS = 20;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        const client = getClient();
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
          const reviews = (Array.isArray(v.reviews) ? v.reviews : []).map((r) => ({ ...r, lang }));
          batchReviews += reviews.length;
          rows.push([
            cc, v.hid, slug,
            typeof v.rating === 'number' ? v.rating : null,
            JSON.stringify(v.detailed_ratings ?? null),
            JSON.stringify(reviews),
            reviews.length,
            lang,
            lastUpdate,
          ]);
        }
        if (rows.length > 0) {
          const { sql, params } = buildUpsert(rows);
          await client.query(sql, params);
        }
        stats.matched += rows.length;
        stats.noMatch += batch.length - rows.length;
        stats.reviews += batchReviews;
        return;
      } catch (err) {
        console.error(`[${lang}] flush failed (attempt ${attempt + 1}/${MAX_ATTEMPTS}): ${err.message}`);
        // Same disk-auto-resize read-only window import_hotels_poc.js hit.
        const isReadOnly = /read-only transaction/i.test(err.message);
        await new Promise((r) => setTimeout(r, isReadOnly ? 30_000 : 10_000));
        await reconnect();
      }
    }
    throw new Error(`[${lang}] flush failed after ${MAX_ATTEMPTS} retries`);
  }

  const res = await openStream(dumpRes.body.data.url);
  const rl = readline.createInterface({ input: res.pipe(zlib.createGunzip()), crlfDelay: Infinity });
  let nextProgress = PROGRESS_EVERY;

  // for-await over readline, not rl.on('line', ...) -- see
  // import_hotels_poc.js's comment on the overlapping-flush() bug.
  for await (const rawLine of rl) {
    let parsed;
    try { parsed = parseLine(rawLine); }
    catch (_) { stats.parseErrors += 1; continue; }
    if (!parsed || !hasData(parsed[1])) continue;

    stats.entries += 1;
    pending.push(parsed);
    if (pending.length >= BATCH_SIZE) await flush();

    if (stats.entries >= ABORT_IF_ZERO_MATCHES_AFTER && stats.matched === 0 && pending.length === 0) {
      throw new Error(`[${lang}] ${stats.entries} entries resolved to 0 hotels -- check SUPABASE_HOTELS_POC_DB_URL and the dump's hid field before re-running.`);
    }
    if (stats.entries >= nextProgress) {
      nextProgress += PROGRESS_EVERY;
      console.log(`[${lang}] ${stats.entries.toLocaleString()} entries | matched ${stats.matched.toLocaleString()} | reviews ${stats.reviews.toLocaleString()} | ${((Date.now() - start) / 1000).toFixed(0)}s`);
    }
  }
  await flush();

  console.log(`[${lang}] done in ${((Date.now() - start) / 1000).toFixed(0)}s: ${stats.entries.toLocaleString()} entries, ${stats.matched.toLocaleString()} matched, ${stats.noMatch.toLocaleString()} hid not in hotels, ${stats.reviews.toLocaleString()} reviews, ${stats.parseErrors} parse errors`);
  return stats;
}

async function main() {
  const env = loadEnv();
  const dbUrl = env.SUPABASE_HOTELS_POC_DB_URL;
  if (!dbUrl) throw new Error('SUPABASE_HOTELS_POC_DB_URL not set in .env');

  let client = new Client({ connectionString: dbUrl });
  await client.connect();
  const getClient = () => client;
  async function reconnect() {
    try { await client.end(); } catch (_) {}
    client = new Client({ connectionString: dbUrl });
    await client.connect();
  }

  // Rows from the first (en-only, untagged) load: tag their reviews so a
  // re-run of en replaces them instead of duplicating them.
  const tagged = await client.query(`
    update hotel_ratings
       set reviews = (select coalesce(jsonb_agg(e || '{"lang":"en"}'::jsonb), '[]'::jsonb)
                        from jsonb_array_elements(reviews) e)
     where source_language = 'en'
       and exists (select 1 from jsonb_array_elements(reviews) e where not e ? 'lang')`);
  if (tagged.rowCount) console.log(`Tagged reviews on ${tagged.rowCount.toLocaleString()} earlier en-only rows`);

  const start = Date.now();
  const results = [];
  for (const lang of LANGUAGES) {
    const s = await importLanguage(env, getClient, reconnect, lang);
    if (s) results.push(s);
  }

  const { rows: [t] } = await client.query(
    `select count(*)::int n, count(*) filter (where review_count > 0)::int with_reviews,
            coalesce(sum(review_count), 0)::bigint reviews from hotel_ratings`,
  );
  await client.end();

  console.log(`\nAll done in ${((Date.now() - start) / 60000).toFixed(1)} min`);
  for (const s of results) {
    console.log(`  ${s.lang.padEnd(6)} ${String(s.matched).padStart(9)} hotels  ${String(s.reviews).padStart(10)} reviews  (${s.noMatch} hid not in hotels)`);
  }
  console.log(`hotel_ratings now: ${t.n.toLocaleString()} hotels, ${t.with_reviews.toLocaleString()} with reviews, ${Number(t.reviews).toLocaleString()} reviews`);
}

main().catch((err) => { console.error(err); process.exit(1); });
