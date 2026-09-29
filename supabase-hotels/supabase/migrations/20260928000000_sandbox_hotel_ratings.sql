-- Guest ratings + reviews for the SANDBOX hotels (sandbox.hotels,
-- 20260826000000_sandbox_hotels_schema.sql), from RateHawk's real sandbox
-- reviews dump -- so the mobile app, which runs entirely on the RateHawk
-- sandbox for now (Ray, 2026-09-23), can show real ratings instead of the
-- fabricated 8.0 it used to default to.
--
-- Source: POST /api/b2b/v3/hotel/reviews/dump/ against api-sandbox
-- (key 973) -> a gzip file (feed_v3_en.json.gz, last_update 2024-08-30).
-- Checked 2026-09-28: ONE JSON object {slug: entry | null}, not JSON lines;
-- each entry carries hid, an overall `rating` (0-10), `detailed_ratings`
-- and `reviews`. 738 hotels, 36 with ratings, 11 with review text, 26
-- reviews in total. /api/content/v1/hotel_reviews_by_ids/ returns review
-- text only (no overall/detailed rating), hence storing the dump.
--
-- Deliberately separate from 20260921000000_hotel_ratings_schema.sql (the
-- production hotel_ratings table in balkanea_hotels_poc_v2): different
-- project, tiny size (no partitioning), keyed by hid (every sandbox entry
-- has one, so no slug-ambiguity handling needed).
--
-- Loaded by scripts/import_sandbox_hotel_ratings.js (re-runnable upsert).
-- Additive only -- no existing table is touched.

create table if not exists sandbox.hotel_ratings (
  hid                bigint primary key,
  slug               text not null,
  -- Overall guest score 0-10 (RateHawk's own aggregate), null if none.
  rating             numeric(3,1),
  -- {cleanness, location, price, services, room, meal, wifi, hygiene},
  -- each 0-10 or null. JSONB, same reasoning as the production table.
  detailed_ratings   jsonb,
  -- Review objects as delivered: id, review_plus, review_minus, created,
  -- author, adults, children, room_name, nights, images, detailed,
  -- traveller_type, trip_type, rating. Per-review `detailed` values can be
  -- the string "unspecified", not only numbers.
  reviews            jsonb not null default '[]'::jsonb,
  review_count       integer not null default 0,
  source_last_update timestamptz,
  imported_at        timestamptz not null default now()
);
