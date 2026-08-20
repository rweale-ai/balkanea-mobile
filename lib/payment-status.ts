// Polls our own Supabase `bookings` row for a terminal `payment_state`.
// This is the reliable channel for learning a payment's outcome — the
// WebView bridge callback (components/PaymentWebView.tsx) is same-device
// UX feedback only, per the "Balkanea Payment Bridge" plugin doc §5-6. The
// row itself is only ever updated server-side by api/payment-notify.js
// (Chat repo), never by the app — this just watches it change.

import { supabase } from './supabase'
import { getBooking } from './bookings-store'
import type { Booking } from './types'

const POLL_MS = 3000
const MAX_TRIES = 200 // ~10 min ceiling, matches the old bridge doc's own recommendation

export interface PollHandle {
  stop: () => void
}

async function fetchPaymentState(bookingId: string): Promise<Booking['payment_state'] | null> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    // Guest / local-only booking — nothing server-side can update this row,
    // so there's no point polling. Caller should treat this as terminal.
    return getBooking(bookingId)?.payment_state ?? null
  }

  const { data, error } = await supabase
    .from('bookings')
    .select('payment_state')
    .eq('id', bookingId)
    .single()

  if (error || !data) return null
  return data.payment_state
}

// Polls until payment_state is 'captured' or 'failed'. onUpdate fires on
// every tick (including non-terminal ones). Returns a handle so the caller
// can cancel early (e.g. guest closes the WebView manually).
export function pollBookingPaymentState(
  bookingId: string,
  onUpdate: (state: Booking['payment_state']) => void,
  onError: (message: string) => void,
): PollHandle {
  let cancelled = false
  let tries = 0

  const tick = async () => {
    if (cancelled) return
    tries += 1

    try {
      const state = await fetchPaymentState(bookingId)
      if (cancelled) return

      if (!state) {
        onError('Could not check payment status')
        return
      }

      onUpdate(state)
      if (state === 'captured' || state === 'failed') return

      if (tries >= MAX_TRIES) {
        onError('Timed out waiting for payment confirmation')
        return
      }

      setTimeout(tick, POLL_MS)
    } catch (e: any) {
      if (cancelled) return
      onError(e?.message || 'Network error while checking payment status')
    }
  }

  tick()

  return { stop: () => { cancelled = true } }
}
