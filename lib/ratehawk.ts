// Simulated RateHawk API stub — real integration requires the sandbox
// credentials Christian is confirming access for (see project memory:
// balkanea-mobile booking flow, call with Jasmina 2026-06-30).
//
// Per that call, RateHawk's only role in the payment flow is holding the
// room and then being told the room is definitively booked — it never
// processes payment itself. That happens through the Macedonian bank in
// lib/bank-payment.ts. Two calls only:
//   1. lockRoom    — hold the room for a short window before the guest pays
//   2. reconfirmBooking — tell RateHawk the hold converted to a real booking
//      once the bank confirms the charge succeeded

export interface RoomLock {
  lockId: string
  expiresAt: number
}

const LOCK_DURATION_MS = 60_000

export async function lockRoom(hotelId: string, roomId: string): Promise<RoomLock> {
  await new Promise<void>(r => setTimeout(r, 700))
  return {
    lockId: 'lock_demo_' + Math.random().toString(36).slice(2, 10),
    expiresAt: Date.now() + LOCK_DURATION_MS,
  }
}

export async function reconfirmBooking(lockId: string): Promise<{ success: true }> {
  await new Promise<void>(r => setTimeout(r, 900))
  return { success: true }
}

// ─── Real RateHawk booking (only for rooms with a real book_hash — see
// RoomType.book_hash in lib/types.ts). Kept alongside the stubs above rather
// than replacing them: every DB-content/simulated hotel keeps using
// lockRoom/reconfirmBooking exactly as before, untouched.
//
// Split into two steps (createRealBookingForm, finishRealBooking) rather
// than one combined call, per RateHawk's own Best Practices for API guide
// (docs.emergingtravel.com/docs/best-practices-for-apiv3/, confirmed
// 2026-08-24): charge the guest through our own gateway FIRST, and only
// confirm/commit the order with RateHawk after that payment succeeds.
// createRealBookingForm opens the order envelope (no charge, no commitment
// with the hotel) as soon as the guest reaches the payment step in
// booking.tsx; finishRealBooking is called only once the gateway reports the
// charge captured. The form step's 60-minute lifetime and the prebook hash's
// 24h lifetime both comfortably outlast a card-entry/3DS/gateway round trip.

const BACKEND_URL = 'https://balkanea-lead-webhook.vercel.app'

export async function realLockRoom(bookHash: string): Promise<RoomLock> {
  const res = await fetch(`${BACKEND_URL}/api/ratehawk-prebook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ book_hash: bookHash }),
  })
  const data = await res.json()
  if (!data.success) throw new Error(data.error || 'This room is no longer available')
  return {
    lockId: data.book_hash,
    expiresAt: Date.now() + LOCK_DURATION_MS,
  }
}

function splitName(fullName: string): { first_name: string; last_name: string } {
  const [first, ...rest] = fullName.trim().split(/\s+/)
  return { first_name: first || 'Guest', last_name: rest.join(' ') || 'Guest' }
}

// RateHawk validates the booking's guest count against the adult count used
// at hotelpage/search time (incorrect_guests_number) -- the app only
// collects one lead-guest name per room today (same gap the simulated flow
// has always had), so co-travelers beyond the lead guest are filled in as
// placeholders sharing the lead guest's last name. Real per-adult name
// collection is a separate, larger UI change, not part of wiring real
// RateHawk booking in.
//
// RateHawk's name validator rejects any digit ("Guest 2" -> invalid_params:
// "digits and non-word symbols are prohibited") -- confirmed 2026-08-24
// against the real booking/finish endpoint, which fails EVERY multi-adult
// room. Ordinal words only, never a numeral.
const CO_TRAVELER_ORDINALS = ['Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh', 'Eighth']
function buildRoomGuests(leadGuestName: string, adultsCount: number) {
  const lead = splitName(leadGuestName)
  const guests = [lead]
  for (let i = 1; i < Math.max(1, adultsCount); i++) {
    const ordinal = CO_TRAVELER_ORDINALS[i - 1] ?? 'Additional'
    guests.push({ first_name: `${ordinal} Guest`, last_name: lead.last_name })
  }
  return guests
}

async function pollBookingStatus(partnerOrderId: string): Promise<{ ok: boolean }> {
  for (let attempt = 0; attempt < 30; attempt++) {
    const res = await fetch(`${BACKEND_URL}/api/ratehawk-book-status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ partner_order_id: partnerOrderId }),
    })
    const data = await res.json()
    if (data.success && data.is_final) return { ok: data.status === 'ok' }
    await new Promise<void>(r => setTimeout(r, 5000))
  }
  return { ok: false }
}

export interface RealBookingPaymentType {
  type: string
  amount: string
  currency_code: string
}

export interface RealBookingForm {
  orderId: string
  partnerOrderId: string
  paymentType: RealBookingPaymentType
}

// Opens the RateHawk order envelope only -- does NOT charge or commit
// anything with the hotel. Per RateHawk's own Best Practices for API guide,
// the guest is charged through our own gateway between this call and
// finishRealBooking below, never before it and never skipped. Call this as
// soon as the guest reaches the payment step (room already prebooked/held),
// then only call finishRealBooking once payment has actually succeeded.
export async function createRealBookingForm(bookHash: string): Promise<
  { ok: true } & RealBookingForm | { ok: false }
> {
  const partnerOrderId = `balkanea-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const res = await fetch(`${BACKEND_URL}/api/ratehawk-book`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ step: 'form', book_hash: bookHash, partner_order_id: partnerOrderId }),
  })
  const data = await res.json()
  if (!data.success) return { ok: false }
  return { ok: true, orderId: data.order_id, partnerOrderId, paymentType: data.payment_type }
}

// Commits the order opened by createRealBookingForm. Only call this after
// the guest's payment has been confirmed captured.
export async function finishRealBooking(params: {
  partnerOrderId: string
  paymentType: RealBookingPaymentType
  leadGuestName: string
  adultsCount: number
  email: string
  phone: string
}): Promise<{ ok: boolean }> {
  const res = await fetch(`${BACKEND_URL}/api/ratehawk-book`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      step: 'finish',
      partner_order_id: params.partnerOrderId,
      guests: buildRoomGuests(params.leadGuestName, params.adultsCount),
      email: params.email,
      phone: params.phone,
      payment_type: params.paymentType,
    }),
  })
  const data = await res.json()
  if (!data.success) return { ok: false }

  return pollBookingStatus(params.partnerOrderId)
}
