-- Adds a channel column so the ops portal (Chat/admin-payments.html,
-- Chat/api/admin-bookings.js) can distinguish mobile-app bookings from the
-- balkanea-web (Next.js) bookings now written via Chat/api/create-booking.js.
--
-- Defaults to 'mobile' so every existing row (all of which came from the
-- app, before this column existed) backfills correctly with no data fix-up.
--
-- user_id's NOT NULL is dropped because web guests aren't Supabase Auth
-- users (the website uses NextAuth) — their bookings are written
-- server-side via the service-role key in Chat/api/create-booking.js and
-- have no auth.users row to reference. Existing RLS policies
-- (auth.uid() = user_id) are unaffected: they simply never match a null
-- user_id, which is correct — web bookings are read back through Chat's
-- service-role-backed /api/my-bookings, not client-side Supabase RLS.

alter table public.bookings
  add column source text not null default 'mobile' check (source in ('web', 'mobile'));

alter table public.bookings
  alter column user_id drop not null;
