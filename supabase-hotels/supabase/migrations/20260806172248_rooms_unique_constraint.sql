-- Natural key for upsert on refresh: (country_code, hotel_hid, room_group_id).
-- Without this, re-running the import (daily, per RateHawk's guidance relayed
-- by Hristijan) would insert duplicate room rows every time instead of
-- updating existing ones, since `id` is auto-generated per insert and carries
-- no meaning across re-imports.
--
-- Known gap: RateHawk's room_group_id can be null for some records. Postgres
-- treats multiple nulls as distinct under a unique constraint, so rooms with
-- a null room_group_id won't dedupe across re-imports. Accepted for now —
-- affects an edge case, not the common path.
alter table rooms
  add constraint rooms_natural_key unique (country_code, hotel_hid, room_group_id);
