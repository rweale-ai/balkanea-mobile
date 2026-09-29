# Hotel ratings import -- handoff to Hristijan

## RateHawk connection assumed working

This handoff assumes you already have a working RateHawk **test
production** connection set up -- the same `RATEHAWK_PRODUCTION_KEY_ID` /
`RATEHAWK_PRODUCTION_API_KEY` credential tier used by the existing
`import_hotels_poc.js`/`import_hotels_incremental.js` scripts, reached
through the shared AWS static-IP relay (`RATEHAWK_PROXY_URL`).

One thing worth knowing in case it resurfaces: as of 2026-09-21, that
relay had a real, confirmed outage -- the front door responded but
authenticated calls hung for ~20s then timed out. If you run this and see
it hang for ~20s per batch and then fail with "relay timeout," that's this
same class of infra issue, not a bug in the script below -- check with Ray
on the relay's status before spending time debugging the script itself.

## What's been done

- **Migration applied already** (2026-09-21): `hotel_ratings` table exists
  in `balkanea_hotels_poc_v2`, partitioned by `country_code` to match
  `hotels`/`rooms`, FK'd to `hotels`. See
  `supabase/migrations/20260921000000_hotel_ratings_schema.sql` for the
  exact SQL (already run against the real DB, not just written).
- **Import script written**: `scripts/import_hotel_ratings.js`.
- **What's NOT done**: the script has never been run against a real
  RateHawk reviews file. It's written entirely from RateHawk's public docs
  (fetched 2026-09-21) plus a synthetic-data test against the real DB
  (proves the slug-lookup/upsert SQL works; does NOT prove the real file's
  shape matches what the script expects). The first real run IS the actual
  test -- see "What to watch for" below.

## How to run it

```
cd Mobile/supabase-hotels
node scripts/import_hotel_ratings.js        # defaults to language=en
node scripts/import_hotel_ratings.js de     # or any other RateHawk-supported language code
```

Needs the same `.env` as the other import scripts here (`vercel env pull`
from the Balkanea project gets you all of these):
`SUPABASE_HOTELS_POC_DB_URL`, `RATEHAWK_PROXY_URL`, `RATEHAWK_PROXY_SECRET`,
`RATEHAWK_PRODUCTION_KEY_ID`, `RATEHAWK_PRODUCTION_API_KEY`.

## What to watch for on the first real run

The script logs progress every 50,000 lines: `scanned`, `matched`
(with a `same-hid-resolved` sub-count), `no-match`, `ambiguous`,
`non-array reviews`, `parse errors`. On a real run:

- **If `matched` stays at 0 (and `same-hid-resolved` is also 0) once
  `scanned` passes 5,000**, the script aborts itself on purpose with an
  explicit error. That means the file isn't one-JSON-object-per-line the
  way every other RateHawk dump in this codebase is -- go look at the raw
  decompressed file by hand before changing anything in the script
  blindly.
- **`no-match` and `ambiguous` are expected to both be nonzero, not
  bugs**: RateHawk's review coverage won't perfectly overlap our
  ~3.49M-hotel content snapshot (different sourcing, different point in
  time), and slug isn't a perfectly unique key (98 confirmed duplicate
  slugs in `hotels` as of 2026-09-21). Most of those duplicates turned out
  to be the same hotel under two `country_code`s (a stale row from a
  region reassignment between import runs) -- the script resolves those
  automatically (see `same-hid-resolved`) rather than skipping them. Only
  a slug matching genuinely different hids is skipped as `ambiguous` --
  that's deliberate, see the migration file's column comments, not
  something to "fix" by guessing which hotel is right.
- **`non-array reviews` should be 0.** If it's not, the real dump's
  `reviews` field isn't shaped like an array for at least one hotel --
  those rows get written with `reviews: []` rather than crashing, but the
  real shape needs a look before trusting the data.
- **Expected runtime**: unknown -- no way to size the real reviews file
  without the relay working. The hotel-content full dump (a much bigger
  file, ~4M hotels/26GB) took ~8 hours; reviews should be smaller since
  RateHawk only has reviews for a subset of hotels, but treat that as a
  guess, not a number to plan around.
- **Re-running is safe**: every row is upserted by `(country_code, hid)`,
  and each hotel's `reviews` array is fully replaced (not merged) on every
  run -- RateHawk's dump has no review-level id, so there's no reliable way
  to merge individual reviews in anyway. Re-running just gets you whatever
  RateHawk's dump currently reflects.

## If the file format assumption is wrong

The script assumes the decompressed file is **gzip** (RateHawk's own docs
page says so explicitly, unlike the hotel-content dump which is
`.jsonl.zst`/zstd). If `zlib.createGunzip()` throws immediately on a real
response, the file may actually be zstd despite what the docs say -- swap
in `zstd-napi`'s `DecompressStream` (already a dependency, see
`import_hotels_poc.js` for the exact pattern) as the fix.

## Open items not covered by this handoff

- No decision made yet on whether/how real ratings should surface on
  search-result cards vs. only the hotel detail page -- that's a product
  question for Ray, not something to decide while doing this import.
- No legal/compliance review done on displaying RateHawk's review text
  publicly ("reviews indexing isn't allowed" was flagged as an open
  question in an earlier call) -- don't wire review text into any
  user-facing page without checking that first.
- The incremental reviews dump endpoint
  (`hotel/incremental_reviews/dump/`) is out of scope here -- this is the
  full-dump importer only, matching the pattern of `import_hotels_poc.js`
  (full) vs `import_hotels_incremental.js` (daily delta) for hotel
  content. A daily incremental ratings importer would be a separate
  follow-up, once the full import has actually run once.
