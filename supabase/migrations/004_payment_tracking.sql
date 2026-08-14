-- Track the gateway payment reference/state against each booking so the
-- backend (balkanea-lead-webhook) can look up "which gateway transaction
-- belongs to this booking" — needed by the admin payments dashboard and by
-- capture/void. Previously the payment reference (lib/payment-intent.ts,
-- derived from the RateHawk room lock) only ever existed on-device in
-- AsyncStorage and was never persisted anywhere the backend could see.
-- Run in Supabase SQL Editor after 003_bookings_jsonb.sql.

alter table public.bookings
  add column if not exists payment_reference text,
  add column if not exists payment_state text
    check (payment_state in ('preauth_pending', 'preauth_done', 'captured', 'voided', 'failed')),
  add column if not exists gateway_transaction_id text;

create index if not exists bookings_payment_reference_idx
  on public.bookings (payment_reference);
