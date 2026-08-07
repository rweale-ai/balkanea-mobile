-- Hotel content database schema — hotels + rooms, partitioned by country_code.
--
-- WHY partitioned: reviewed with Hristijan (Balkanea) on the hotel-DB proposal doc.
-- His concern: a flat table works fine for mobile's own scoped ~2GB/10-country
-- import, but won't scale if this becomes the single source shared with the
-- website too, at RateHawk's full ~4M hotels / tens of millions of rooms —
-- room lookups for a given hotel would be scanning across the whole table.
-- Partitioning by country_code means a query scoped to one country only scans
-- that partition, not the entire dataset, regardless of how much data other
-- countries eventually hold. This was explicitly designed in from the start
-- per Ray's direction (2026-08-06), not deferred.
--
-- Country-code partition list below covers mobile's current 10 destination
-- countries. A `default` partition catches anything else so importing
-- additional countries later never requires a schema rewrite — but for real
-- query performance, any country that becomes actively searched should get
-- its own explicit partition added (see note below), not be left in the
-- default catch-all long-term.
--
-- Kind filtering (Hotel vs Apartment vs Guesthouse etc.) is intentionally NOT
-- applied here — Ray's direction (2026-08-06): import all property kinds now,
-- filter at query/display time once the business decides what to show.

create table hotels (
  hid bigint not null,
  country_code text not null,
  slug text not null,
  name text not null,
  kind text not null,
  star_rating smallint,
  address text,
  region_id bigint,
  region_name text,
  region_type text,
  latitude double precision,
  longitude double precision,
  phone text,
  email text,
  postal_code text,
  check_in_time time,
  check_out_time time,
  images jsonb,
  amenity_groups jsonb,
  description_struct jsonb,
  is_deleted boolean not null default false,
  source_language text not null default 'en',
  updated_at timestamptz not null default now(),
  primary key (country_code, hid)
) partition by list (country_code);

create table rooms (
  id bigserial not null,
  hotel_hid bigint not null,
  country_code text not null,
  room_group_id integer,
  name text,
  room_amenities jsonb,
  rg_ext jsonb,
  name_struct jsonb,
  images jsonb,
  updated_at timestamptz not null default now(),
  primary key (country_code, id)
) partition by list (country_code);

-- One partition pair per destination country. Adding a country later:
--   create table hotels_xx partition of hotels for values in ('XX');
--   create table rooms_xx partition of rooms for values in ('XX');
-- (run as its own migration, not by editing this file after the fact)

create table hotels_hr partition of hotels for values in ('HR');
create table hotels_cz partition of hotels for values in ('CZ');
create table hotels_eg partition of hotels for values in ('EG');
create table hotels_fr partition of hotels for values in ('FR');
create table hotels_gr partition of hotels for values in ('GR');
create table hotels_it partition of hotels for values in ('IT');
create table hotels_me partition of hotels for values in ('ME');
create table hotels_mk partition of hotels for values in ('MK');
create table hotels_es partition of hotels for values in ('ES');
create table hotels_tr partition of hotels for values in ('TR');
create table hotels_other partition of hotels default;

create table rooms_hr partition of rooms for values in ('HR');
create table rooms_cz partition of rooms for values in ('CZ');
create table rooms_eg partition of rooms for values in ('EG');
create table rooms_fr partition of rooms for values in ('FR');
create table rooms_gr partition of rooms for values in ('GR');
create table rooms_it partition of rooms for values in ('IT');
create table rooms_me partition of rooms for values in ('ME');
create table rooms_mk partition of rooms for values in ('MK');
create table rooms_es partition of rooms for values in ('ES');
create table rooms_tr partition of rooms for values in ('TR');
create table rooms_other partition of rooms default;

-- Composite FK requires country_code on both sides — this is what keeps a
-- hotel's rooms in the same partition as the hotel itself (partition-wise
-- joins), which is the whole point of partitioning the two tables the same way.
alter table rooms
  add constraint fk_rooms_hotel
  foreign key (country_code, hotel_hid) references hotels(country_code, hid)
  on delete cascade;

-- region_id and kind indexes are created on the parent table, which
-- Postgres automatically propagates to every partition.
create index idx_hotels_region on hotels(region_id);
create index idx_hotels_kind on hotels(kind);
create index idx_rooms_hotel on rooms(hotel_hid);

comment on table hotels is 'Partitioned by country_code. Static/enrichment content from RateHawk''s hotel dump — see docs/hotel-db-proposal for source and import process.';
comment on table rooms is 'Partitioned by country_code, matching hotels, for partition-wise joins. One row per room type (RateHawk room_group) per hotel.';
