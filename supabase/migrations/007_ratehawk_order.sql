-- Real RateHawk order id, set only for bookings made through the real
-- prebook/booking-finish flow (room.book_hash was present) -- lets support
-- match an app booking back to the actual RateHawk order. Absent for every
-- simulated/DB-content booking, which never creates a real order.
-- Run in Supabase SQL Editor after 006_multiroom_booking.sql.

alter table public.bookings
  add column if not exists ratehawk_order_id text;
