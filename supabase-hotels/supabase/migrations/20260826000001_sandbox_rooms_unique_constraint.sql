-- Same natural-key constraint as 20260806172248_rooms_unique_constraint.sql,
-- mirrored onto sandbox.rooms so re-running import_sandbox_hotels.py upserts
-- instead of duplicating rows. Same known gap noted there applies here too:
-- a null room_group_id won't dedupe across re-imports (accepted, edge case).
alter table sandbox.rooms
  add constraint sandbox_rooms_natural_key unique (country_code, hotel_hid, room_group_id);
