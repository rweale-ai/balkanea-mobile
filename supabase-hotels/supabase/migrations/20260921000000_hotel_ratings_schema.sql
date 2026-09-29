-- Hotel guest-review data (ratings + review text), partitioned by
-- country_code exactly like `hotels`/`rooms` -- see
-- 20260806171622_hotels_rooms_partitioned_schema.sql for why partitioning
-- matters here (partition-wise joins against `hotels` at RateHawk's full
-- ~3.5M-hotel scale).
--
-- Source: RateHawk B2B API v3 POST /api/b2b/v3/hotel/reviews/dump/
-- (docs.emergingtravel.com/docs/b2b-api/static-content/
-- retrieve-hotel-reviews-dump/, confirmed via direct doc fetch 2026-09-21).
-- Response gives a `url` (GZIP archive, presumed JSONL -- see
-- scripts/import_hotel_ratings.js for why) + `last_update`, same envelope
-- shape as the hotel-content dump. Each line's JSON is a single-key object
-- keyed by hotel SLUG (not hid): `{ "<slug>": { detailed_ratings: {...},
-- reviews: [...] } }`.
--
-- IMPORTANT -- this schema is docs-derived only, never checked against a
-- real downloaded file. The RateHawk relay (Chat/infra static-IP relay)
-- has been down since at least 2026-09-15 (still down 2026-09-21,
-- re-confirmed same day this migration was written), so there has been no
-- way to actually call this endpoint and see one real record. That's why
-- `detailed_ratings` and `reviews` below are JSONB rather than typed
-- columns -- same reasoning as `hotels.images`/`amenity_groups`/
-- `description_struct` already uses. Do NOT normalize these into typed
-- columns until someone has run the import once against a real file and
-- confirmed the shape matches the docs (RateHawk's own docs page for the
-- hotel-content dump undersold its own example as partial once before --
-- don't assume this one is complete either).
create table hotel_ratings (
  country_code text not null,
  hid bigint not null,
  -- Denormalized from hotels.slug at import time. The dump is keyed by
  -- slug, not hid -- and slug is NOT globally unique (confirmed 2026-09-21:
  -- 98 duplicate slugs across 3,489,439 live hotel rows). A duplicate slug
  -- whose matches all share the SAME hid (a stale row left behind by a
  -- region reassignment between hotel-content import runs) resolves to
  -- the most-recently-updated match; a duplicate matching genuinely
  -- DIFFERENT hids is skipped as a true collision, and unmatched slugs are
  -- skipped too -- both counted, never guessed at. See
  -- import_hotel_ratings.js.
  slug text not null,
  -- Hotel-level aggregate, per RateHawk's docs example:
  -- {cleanness, location, price, services, room, meal, wifi, hygiene},
  -- each a number 0-10 or null. JSONB, not typed columns -- see file
  -- header comment.
  detailed_ratings jsonb,
  -- Full review array. REPLACED WHOLESALE on every import run, never
  -- merged/appended -- RateHawk's own docs show no review-level id field,
  -- so there is no reliable key to upsert individual reviews against.
  -- Each element: {review_plus, review_minus, created, author, adults,
  -- children, room_name, nights, images, detailed, traveller_type,
  -- trip_type, rating}.
  reviews jsonb not null default '[]'::jsonb,
  -- Denormalized jsonb_array_length(reviews), set at import time so
  -- sorting/filtering by review count doesn't need to unpack the array.
  review_count integer not null default 0,
  source_language text not null default 'en',
  updated_at timestamptz not null default now(),
  primary key (country_code, hid)
) partition by list (country_code);

-- Create one hotel_ratings partition per EXISTING hotels partition,
-- mirroring its exact bound clause -- rather than hand-listing 249 country
-- codes again (error-prone, and hotels' own partition list was itself
-- built by an ad-hoc script, not a checked-in migration -- see
-- project_balkanea_hotels_poc_database memory). This guarantees the two
-- tables stay partition-aligned no matter how hotels' partitions actually
-- ended up, which is what makes the FK below and any future
-- partition-wise join against hotels legal/fast.
do $$
declare
  r record;
  new_partition text;
begin
  for r in
    select c.relname as child_name,
           pg_get_expr(c.relpartbound, c.oid) as bound_clause
    from pg_inherits i
    join pg_class c on c.oid = i.inhrelid
    join pg_class p on p.oid = i.inhparent
    where p.relname = 'hotels' and p.relnamespace = 'public'::regnamespace
  loop
    new_partition := 'hotel_ratings_' || substring(r.child_name from 8); -- strip leading 'hotels_'
    execute format('create table %I partition of hotel_ratings %s', new_partition, r.bound_clause);
  end loop;
end $$;

-- Plain ADD CONSTRAINT, not the NOT-VALID-then-VALIDATE two-step --
-- confirmed 2026-09-06 (see project_balkanea_hotels_poc_database memory)
-- that Postgres rejects NOT VALID foreign keys between two partitioned
-- tables. This validates inline.
alter table hotel_ratings
  add constraint fk_hotel_ratings_hotel
  foreign key (country_code, hid) references hotels(country_code, hid)
  on delete cascade;

-- No new index on hotels.slug -- idx_hotels_slug already exists in this
-- v2 project (confirmed live 2026-09-21), which is what import_hotel_ratings.js's
-- batched slug lookups use.

comment on table hotel_ratings is 'Partitioned by country_code, matching hotels/rooms. RateHawk guest-review aggregate + full review list, one row per hotel that has any reviews. Docs-derived schema, never verified against a real downloaded file (relay outage since 2026-09-15) -- see column comments and import_hotel_ratings.js before treating any field as certain.';
comment on column hotel_ratings.slug is 'Denormalized from hotels.slug at import time. Slug is NOT globally unique across the full hotel set -- rows only get written when a dump slug resolves to exactly one hotel.';
comment on column hotel_ratings.reviews is 'Full review array, replaced wholesale on every import run, never merged/appended -- RateHawk exposes no review-level id to upsert individual reviews against.';
