-- Adds a `source` column to hotels and rooms, so a future non-RateHawk
-- provider doesn't require a schema rewrite. RateHawk is the only source
-- today; every existing row backfills to 'ratehawk' via the column default.
-- Requested directly by Ray (10 Aug 2026 call with Hristijan) as a
-- future-proofing requirement, not a currently-active multi-provider need.
--
-- Deliberately NOT touching primary keys/unique constraints yet — hotels'
-- (country_code, hid) and rooms' (country_code, hotel_hid, room_group_id)
-- assume RateHawk's own ID space. If/when a second provider is actually
-- integrated, those IDs could collide across sources, and the composite
-- keys would need source added too. Hristijan flagged this as its own
-- architecture discussion (8/10 call) — not resolved here, not blocking
-- today's single-source reality.

alter table hotels add column source text not null default 'ratehawk';
alter table rooms add column source text not null default 'ratehawk';

comment on column hotels.source is 'Data provider for this row, e.g. ''ratehawk''. Added for future multi-provider support; not yet incorporated into primary/unique keys.';
comment on column rooms.source is 'Data provider for this row, e.g. ''ratehawk''. Added for future multi-provider support; not yet incorporated into primary/unique keys.';
