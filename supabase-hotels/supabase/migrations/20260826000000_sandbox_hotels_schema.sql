-- Sandbox copy of the hotels/rooms schema, for testing the real
-- "search DB -> live RateHawk pricing" flow against data RateHawk's
-- sandbox can actually price. Separate Postgres schema in the SAME
-- Supabase project as production (Ray, 2026-08-26: option B -- no new
-- infra/cost), never queried by the production app path.
--
-- Source: RateHawk's real hotel/info/dump/ endpoint against sandbox
-- credentials (docs.emergingtravel.com/docs/b2b-api/static-content/
-- retrieve-hotel-dump/) -- confirmed live 2026-08-25/26: 742 hotels,
-- fixed synthetic test inventory, only three regions (FR/Paris 249,
-- AE/Dubai 247, US/Los Angeles 246). Not RateHawk's full global content --
-- this is what sandbox actually has rate data for, which is the entire
-- point (see project memory on the real-vs-sandbox content mismatch this
-- was built to close).
--
-- Structure mirrors the production hotels/rooms tables exactly
-- (20260806171622_hotels_rooms_partitioned_schema.sql) so query patterns
-- tested here transfer directly -- partitioned by country_code, just
-- scoped to the three countries sandbox actually has (FR/AE/US) instead
-- of the 10 production target countries. Initial load only -- no delta/
-- incremental sync built yet, per Ray's explicit scope 2026-08-26.

create schema if not exists sandbox;

create table sandbox.hotels (
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

create table sandbox.rooms (
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

create table sandbox.hotels_fr partition of sandbox.hotels for values in ('FR');
create table sandbox.hotels_ae partition of sandbox.hotels for values in ('AE');
create table sandbox.hotels_us partition of sandbox.hotels for values in ('US');
create table sandbox.hotels_other partition of sandbox.hotels default;

create table sandbox.rooms_fr partition of sandbox.rooms for values in ('FR');
create table sandbox.rooms_ae partition of sandbox.rooms for values in ('AE');
create table sandbox.rooms_us partition of sandbox.rooms for values in ('US');
create table sandbox.rooms_other partition of sandbox.rooms default;

alter table sandbox.rooms
  add constraint fk_sandbox_rooms_hotel
  foreign key (country_code, hotel_hid) references sandbox.hotels(country_code, hid)
  on delete cascade;

create index idx_sandbox_hotels_region on sandbox.hotels(region_id);
create index idx_sandbox_hotels_kind on sandbox.hotels(kind);
create index idx_sandbox_rooms_hotel on sandbox.rooms(hotel_hid);

comment on schema sandbox is 'Real RateHawk sandbox hotel content (hotel/info/dump/, sandbox credentials) -- 742 hotels sandbox actually has rate data for, used to test the search-DB-then-live-price flow end to end. Never queried by the production app.';
comment on table sandbox.hotels is 'Mirrors public.hotels'' structure, partitioned by country_code -- but scoped to the 3 countries RateHawk sandbox test inventory actually covers (FR, AE, US), not the 10 production target countries.';
comment on table sandbox.rooms is 'Mirrors public.rooms'' structure, matching sandbox.hotels'' partitioning for partition-wise joins.';
