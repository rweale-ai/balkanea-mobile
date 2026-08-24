-- Real multi-room booking support: persist the per-room guest breakdown
-- (adults + children's ages per room) and per-room lead-guest names, so a
-- multi-room booking isn't reduced to just a room count with no way to
-- reconstruct who's in which room. Previously "rooms" existed as a bare
-- count with nothing behind it -- see project memory
-- balkanea-multiroom-booking-gap for the full gap this closes.
-- Run in Supabase SQL Editor after 005_payment_decline_reason.sql.

alter table public.bookings
  add column if not exists rooms_config jsonb,
  add column if not exists room_guest_names jsonb;
