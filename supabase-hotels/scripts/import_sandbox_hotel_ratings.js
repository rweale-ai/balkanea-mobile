// Import RateHawk's SANDBOX guest ratings/reviews into sandbox.hotel_ratings
// (supabase/migrations/20260928000000_sandbox_hotel_ratings.sql).
//
// Fetches the reviews dump live from api-sandbox.worldota.net (directly --
// the sandbox needs no IP whitelisting, so no relay/VPN), gunzips it, and
// upserts one row per hotel that has a rating or reviews. Only hids that
// exist in sandbox.hotels are loaded. Re-runnable; rows for hotels that no
// longer have data in the dump are removed so the table mirrors the dump.
//
// Usage (from Mobile/supabase-hotels):
//   node scripts/import_sandbox_hotel_ratings.js            # import
//   node scripts/import_sandbox_hotel_ratings.js --dry-run  # report only
//
// Requires SUPABASE_DB_URL in .env (the project holding the `sandbox`
// schema). RATEHAWK_KEY_ID/RATEHAWK_API_KEY default to the sandbox pair,
// same default as Chat/lib/ratehawk.js's directRequest().

'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { Client } = require('pg');

for (const line of fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z_0-9]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
}

const KEY_ID = process.env.RATEHAWK_SANDBOX_KEY_ID || '973';
const API_KEY = process.env.RATEHAWK_SANDBOX_API_KEY || '8bc39f4d-07ee-4fc8-a89a-931074bd79da';
const DRY_RUN = process.argv.includes('--dry-run');

async function main() {
  const auth = 'Basic ' + Buffer.from(`${KEY_ID}:${API_KEY}`).toString('base64');
  const meta = await fetch('https://api-sandbox.worldota.net/api/b2b/v3/hotel/reviews/dump/', {
    method: 'POST',
    headers: { Authorization: auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ language: 'en' }),
    signal: AbortSignal.timeout(60000),
  }).then(r => r.json());
  if (meta.status !== 'ok' || !meta.data?.url) throw new Error(`reviews/dump failed: ${JSON.stringify(meta.error || meta)}`);
  console.log(`dump: ${meta.data.url} (last_update ${meta.data.last_update})`);

  const gz = Buffer.from(await (await fetch(meta.data.url, { signal: AbortSignal.timeout(120000) })).arrayBuffer());
  const dump = JSON.parse(zlib.gunzipSync(gz).toString('utf8'));
  const entries = Object.entries(dump).filter(([, v]) => v && v.hid);
  console.log(`dump hotels: ${Object.keys(dump).length}, with data: ${entries.length}`);

  const db = new Client({ connectionString: process.env.SUPABASE_DB_URL });
  await db.connect();
  try {
    const { rows } = await db.query('select hid from sandbox.hotels');
    const known = new Set(rows.map(r => String(r.hid)));
    const toLoad = entries.filter(([, v]) => known.has(String(v.hid)));
    const skipped = entries.length - toLoad.length;
    console.log(`matching sandbox.hotels: ${toLoad.length}, skipped (hid not in sandbox.hotels): ${skipped}`);
    if (DRY_RUN) { console.log('dry run -- nothing written'); return; }

    await db.query('begin');
    for (const [slug, v] of toLoad) {
      const reviews = Array.isArray(v.reviews) ? v.reviews : [];
      await db.query(
        `insert into sandbox.hotel_ratings (hid, slug, rating, detailed_ratings, reviews, review_count, source_last_update, imported_at)
         values ($1, $2, $3, $4, $5, $6, $7, now())
         on conflict (hid) do update set slug = excluded.slug, rating = excluded.rating,
           detailed_ratings = excluded.detailed_ratings, reviews = excluded.reviews,
           review_count = excluded.review_count, source_last_update = excluded.source_last_update,
           imported_at = now()`,
        [v.hid, slug, typeof v.rating === 'number' ? v.rating : null,
         v.detailed_ratings ? JSON.stringify(v.detailed_ratings) : null,
         JSON.stringify(reviews), reviews.length, meta.data.last_update || null],
      );
    }
    const loadedHids = toLoad.map(([, v]) => v.hid);
    const del = await db.query('delete from sandbox.hotel_ratings where not (hid = any($1::bigint[]))', [loadedHids]);
    await db.query('commit');
    const { rows: [c] } = await db.query('select count(*)::int n, count(*) filter (where review_count > 0)::int with_reviews, coalesce(sum(review_count),0)::int reviews from sandbox.hotel_ratings');
    console.log(`upserted ${toLoad.length}, removed stale ${del.rowCount}. Table now: ${c.n} hotels, ${c.with_reviews} with reviews, ${c.reviews} reviews.`);
  } catch (e) {
    await db.query('rollback').catch(() => {});
    throw e;
  } finally {
    await db.end();
  }
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
