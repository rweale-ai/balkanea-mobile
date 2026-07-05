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
