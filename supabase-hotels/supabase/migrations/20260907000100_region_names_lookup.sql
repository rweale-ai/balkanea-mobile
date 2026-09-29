-- Dedicated, small lookup table for destination-autocomplete typeahead
-- (Website's SearchBar) -- 2026-09-07, see project_balkanea_web_production_ratehawk
-- memory. Querying the full `hotels` table (3.48M rows, 250 partitions)
-- directly for a prefix match on every keystroke doesn't scale even with
-- the right index (idx_hotels_region_name_lower_pattern): a short/common
-- prefix ("par") still has to scan and DISTINCT-dedupe potentially
-- thousands of matching rows across many partitions -- measured 500ms-4.7s
-- depending on prefix breadth, and a single-character prefix (a realistic
-- thing to hit while someone is typing) timed out entirely at 8s.
--
-- There are only 81,575 distinct region_name values in the whole 3.48M-hotel
-- database (measured directly, 2026-09-07) -- genuinely small. A flat,
-- unpartitioned lookup table sized for that is fast regardless of prefix
-- breadth, and lets results be ranked by hotel_count (a simple, real
-- popularity proxy) instead of alphabetically, so "Athens" outranks
-- "Athabasca" for a guest typing "ath".
--
-- Deliberately NOT a materialized view refreshed automatically -- this
-- content only changes on a full-dump reload or the daily incremental job,
-- neither of which currently triggers a refresh. Rebuild manually
-- (`REFRESH TABLE` equivalent below is just a full re-populate) after any
-- full-dump reload; the daily incremental changes such a small fraction of
-- hotels that region-name drift from it is not worth refreshing for yet.

create table if not exists region_names (
  region_name text not null,
  country_code text not null,
  hotel_count integer not null,
  primary key (region_name, country_code)
);

create index if not exists idx_region_names_lower_pattern
    on region_names (lower(region_name) text_pattern_ops);

truncate region_names;

insert into region_names (region_name, country_code, hotel_count)
select region_name, country_code, count(*)
from hotels
where region_name is not null and region_name <> '' and is_deleted = false
group by region_name, country_code;
