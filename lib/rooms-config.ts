import type { RoomGuestConfig, RoomType } from './types'

// The one choke point deciding whether a roomsConfig (LLM-produced, or
// parsed back out of a route param) is trustworthy enough to multiply into
// a real Bankart charge. Anything that fails validation returns undefined,
// so the caller falls back to the flat rooms/adults/children fields rather
// than half-trusting a malformed config.
//
// Bounds match RateHawk's real B2B v3 rules (see
// docs.emergingtravel.com/docs/integration-requirements/, section 3.3-3.4,
// verified directly against their sandbox this session): up to 9 rooms per
// rate, up to 6 adults + 4 children per room, children are 0-17 inclusive.
export function validateRoomsConfig(raw: unknown): RoomGuestConfig[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > 9) return undefined

  const rooms: RoomGuestConfig[] = []
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') return undefined
    const adults = (entry as Record<string, unknown>).adults
    const childAgesRaw = (entry as Record<string, unknown>).childAges

    if (!Number.isInteger(adults) || (adults as number) < 1 || (adults as number) > 6) return undefined

    const childAges: number[] = []
    if (childAgesRaw !== undefined) {
      if (!Array.isArray(childAgesRaw) || childAgesRaw.length > 4) return undefined
      for (const age of childAgesRaw) {
        if (!Number.isInteger(age) || age < 0 || age > 17) return undefined
        childAges.push(age)
      }
    }

    rooms.push({ adults: adults as number, childAges })
  }

  return rooms
}

export function totalAdults(rooms: RoomGuestConfig[]): number {
  return rooms.reduce((sum, r) => sum + r.adults, 0)
}

export function totalChildren(rooms: RoomGuestConfig[]): number {
  return rooms.reduce((sum, r) => sum + r.childAges.length, 0)
}

// The one place the booking total is computed -- used by BOTH the room
// selection display and booking.tsx's charge amount, so what the guest sees
// is exactly what they pay.
//
// A live RateHawk rate requested for the real per-room composition already
// prices every room (room.priced_for_rooms === roomCount): use it as-is.
// Everything else (simulated/DB-content rooms, single-room live rates) is a
// per-room price, multiplied by the room count as before.
export function roomChargeTotal(room: Pick<RoomType, 'total_price' | 'priced_for_rooms'>, roomCount: number): number {
  if (room.priced_for_rooms && room.priced_for_rooms > 1) return room.total_price
  return room.total_price * roomCount
}

// Live rates need the real per-room composition (children with ages) or
// RateHawk prices and books the wrong thing -- true when this stay can't be
// priced live yet: more than one room, or any children, without a valid
// roomsConfig carrying ages.
export function needsRoomDetailsForLiveRates(roomsConfig: RoomGuestConfig[] | undefined, roomCount: number, children: number): boolean {
  return !roomsConfig && (roomCount > 1 || children > 0)
}
