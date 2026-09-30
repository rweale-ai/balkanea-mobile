-- Adds hotels.metapolicy_struct -- per Hristijan's request (Slack, 2026-09-29):
-- a "Conditions of accommodation" panel (check-in/check-out policy, meal
-- inclusion, children/extra-bed/cot policy, etc.) that he could see on
-- RateHawk's hotel content but couldn't find in our hotels data.
--
-- Confirmed via RateHawk docs (docs.emergingtravel.com, fetched
-- 2026-09-29): `metapolicy_struct` is a field already present on the SAME
-- hotel-content dump record `amenity_groups`/`serp_filters` come from
-- (hotel/info/dump/ + hotel/info/incremental_dump/) -- like serp_filters,
-- this is NOT a new endpoint and does NOT need a relay allowlist change.
--
-- Sub-object keys per docs (docs.emergingtravel.com/docs/how-tos/
-- process-fields/metapolicy-struct/): check_in_check_out, meal,
-- children_meal, extra_bed, children, cot, deposit, internet, parking,
-- pets, shuttle, visa, no_show, add_fee -- each with its own fields
-- (type/inclusion/price/currency and similar, varying per category).
-- Exact per-hotel shape not yet verified against a real record (RateHawk
-- relay/VPN outage ongoing as of 2026-09-25, unresolved as of this
-- migration) -- JSONB, not typed columns, same reasoning as
-- amenity_groups/serp_filters: don't normalize until a real run confirms
-- the shape.
alter table hotels add column metapolicy_struct jsonb;

comment on column hotels.metapolicy_struct is 'RateHawk accommodation-conditions policy data for this hotel (check-in/check-out, meal inclusion, children/extra-bed/cot, deposit, parking, etc.) -- same dump record amenity_groups/serp_filters come from. Docs-derived, not yet verified against a real dump record. See docs.emergingtravel.com/docs/how-tos/process-fields/metapolicy-struct/ for sub-object field names.';
