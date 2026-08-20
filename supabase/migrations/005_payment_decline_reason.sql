-- Stores the real decline reason from the Notify callback (Bankart's
-- error_code + message, e.g. {"error_code": 1000, "message": "The request
-- failed. Please try again."}) so support can look up why a specific
-- payment failed. Internal/ops visibility only — the guest-facing app
-- deliberately keeps the decline message generic (not distinguishing wrong
-- CVV vs insufficient funds vs card blocked, etc.) since exposing granular
-- decline reasons gives a card-testing attacker a feedback signal to
-- iterate against. Run in Supabase SQL Editor after 004_payment_tracking.sql.

alter table public.bookings
  add column if not exists payment_error_code integer,
  add column if not exists payment_error_message text;
