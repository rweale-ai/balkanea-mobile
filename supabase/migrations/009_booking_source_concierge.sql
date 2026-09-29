-- Adds 'concierge' as a third value alongside 'web'/'mobile' (see
-- 008_booking_source.sql) so the ops portal can distinguish staff-placed
-- bookings from guest self-service, per Ray 2026-08-27.
--
-- Nothing writes 'concierge' yet -- there is no staff-booking-creation
-- flow in either the Chat backend or the admin portal today. This
-- migration only makes the value legal so the dashboard's channel badge
-- and any future concierge-booking endpoint don't need a follow-up
-- migration once that flow is built.

alter table public.bookings drop constraint bookings_source_check;

alter table public.bookings
  add constraint bookings_source_check check (source in ('web', 'mobile', 'concierge'));
