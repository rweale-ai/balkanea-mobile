-- Destination-autocomplete typeahead (Website's SearchBar) needs prefix
-- matching ("ath" -> "Athens") against the full 3.48M-hotel content DB,
-- not the old hardcoded 3-city list -- see project_balkanea_web_production_ratehawk
-- memory, 2026-09-07. The existing idx_hotels_region_name_lower
-- (20260821000000) only supports exact case-insensitive match
-- (lower(region_name) = lower($1)); confirmed via EXPLAIN that a prefix
-- query (lower(region_name) like lower($1) || '%') against it falls back
-- to a Parallel Seq Scan across every one of the 250 country partitions
-- (estimated cost ~710,000 vs a few thousand with the right index).
--
-- text_pattern_ops makes a btree index usable for LIKE 'prefix%' matching
-- regardless of the database's collation (the standard Postgres fix --
-- without it, a plain btree on a non-C-locale text column can't be used
-- for pattern matching at all, only equality). Separate index from
-- idx_hotels_region_name_lower rather than replacing it -- the two serve
-- different query shapes and Postgres can't use text_pattern_ops for a
-- plain equality lookup as efficiently as the existing plain index.
create index idx_hotels_region_name_lower_pattern
    on hotels (lower(region_name) text_pattern_ops);
