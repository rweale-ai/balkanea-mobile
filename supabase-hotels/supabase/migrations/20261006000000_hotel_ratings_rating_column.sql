-- Adds the two hotel_ratings columns the real production reviews dump
-- needs, matching sandbox.hotel_ratings (20260928000000) so the app can
-- read both tables the same way.
--
-- Confirmed against the real production file (2026-10-06, key 11492 via
-- the VPN relay, feed_v3_en.json.gz, last_update 2026-10-05): each entry
-- carries a top-level overall `rating` (0-10) that RateHawk's docs schema
-- omits, plus a `hid` -- the importer now matches on hid, not slug.

alter table public.hotel_ratings
  add column if not exists rating numeric(3,1),
  add column if not exists source_last_update timestamptz;
