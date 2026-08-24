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
// Booking creation (confirmRealBooking) deliberately does NOT happen here on
// mount, unlike the cheap prebook hold — it's deferred to the moment the
// guest taps Pay in booking.tsx, and runs BEFORE the guest is charged, not
// after. See project memory / the plan this was built from for why: RateHawk
// sandbox `payment_type: "deposit"` draws from Balkanea's own balance, not
// the guest's card, so there's no reason to charge before RateHawk confirms
// — and lib/payment-gateway.ts has no refund/void method to undo a charge if
// RateHawk failed afterward.

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
function buildRoomGuests(leadGuestName: string, adultsCount: number) {
  const lead = splitName(leadGuestName)
  const guests = [lead]
  for (let i = 1; i < Math.max(1, adultsCount); i++) {
    guests.push({ first_name: `Guest ${i + 1}`, last_name: lead.last_name })
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

export async function confirmRealBooking(params: {
  bookHash: string
  leadGuestName: string
  adultsCount: number
  email: string
  phone: string
}): Promise<{ ok: true; orderId: string } | { ok: false }> {
  const partnerOrderId = `balkanea-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

  const bookRes = await fetch(`${BACKEND_URL}/api/ratehawk-book`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      book_hash: params.bookHash,
      partner_order_id: partnerOrderId,
      guests: buildRoomGuests(params.leadGuestName, params.adultsCount),
      email: params.email,
      phone: params.phone,
    }),
  })
  const bookData = await bookRes.json()
  if (!bookData.success) return { ok: false }

  const { ok } = await pollBookingStatus(partnerOrderId)
  if (!ok) return { ok: false }
  return { ok: true, orderId: bookData.order_id }
}
