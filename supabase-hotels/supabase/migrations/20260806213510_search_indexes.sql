-- Indexes for Nea's hotel-list query pattern (region/country filter, sorted,
-- limited), benchmarked against the live data in the architecture review on
-- 2026-08-06. Without these, a country-partition scan requires a full
-- sequential scan + in-memory sort (measured: 1.47s cold cache on a ~29k-row
-- partition, which will only get worse as partitions grow toward their full
-- size). Created on the parent `hotels` table so Postgres propagates the
-- index to every existing and future country partition automatically.

-- Supports: order by star_rating desc nulls last, name limit N
create index if not exists idx_hotels_star_rating_name
    on hotels (star_rating desc nulls last, name);

-- Supports: amenity_groups @> '[{"amenities": ["..."]}]' containment queries
-- (JSONB shape confirmed live: array of {group_name, amenities[], non_free_amenities[]})
create index if not exists idx_hotels_amenity_groups_gin
    on hotels using gin (amenity_groups);
