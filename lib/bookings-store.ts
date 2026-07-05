import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Booking } from './types'
import { supabase } from './supabase'
import { scheduleBookingNotifications, cancelBookingNotifications } from './notifications'

const STORAGE_KEY = 'balkanea_bookings'

let cache: Booking[] = []
const listeners: Array<(bookings: Booking[]) => void> = []

function notify() {
  const snapshot = [...cache]
  listeners.forEach(l => l(snapshot))
}

// ── Local persistence (guests) ──────────────────────────────────────

async function loadLocal(): Promise<Booking[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

async function persistLocal(bookings: Booking[]) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(bookings))
  } catch (e) {
    console.warn('bookings-store: persist failed', e)
  }
}

// ── Supabase row mapping ────────────────────────────────────────────

function rowToBooking(row: Record<string, any>): Booking {
  return {
    id: row.id,
    hotel: row.hotel_data,
    room: row.room_data,
    checkin: row.checkin,
    checkout: row.checkout,
    guests: { adults: row.adults, children: row.children },
    rooms: row.rooms,
    total_price: row.total_price,
    currency: row.currency,
    status: row.status as Booking['status'],
    booked_at: row.created_at,
    confirmation_code: row.confirmation_code,
    guest_name: row.guest_name,
    guest_email: row.guest_email,
    guest_phone: row.guest_phone ?? '',
  }
}

function bookingToInsert(b: Booking & { confirmation_code: string; status: Booking['status'] }, userId: string) {
  return {
    user_id: userId,
    hotel_id: b.hotel.hotel_id,
    hotel_name: b.hotel.name,
    hotel_stars: b.hotel.stars,
    hotel_image: b.hotel.images?.[0] ?? '',
    hotel_address: b.hotel.address,
    hotel_data: b.hotel,
    room_name: b.room.name,
    room_beds: b.room.beds,
    room_meal_plan: b.room.meal_plan,
    room_data: b.room,
    checkin: b.checkin,
    checkout: b.checkout,
    adults: b.guests.adults,
    children: b.guests.children,
    rooms: b.rooms,
    total_price: b.total_price,
    currency: b.currency,
    status: b.status,
    confirmation_code: b.confirmation_code,
    guest_name: b.guest_name,
    guest_email: b.guest_email,
    guest_phone: b.guest_phone,
    salesforce_synced: false,
  }
}

// ── Supabase helpers ────────────────────────────────────────────────

async function loadFromSupabase(): Promise<Booking[]> {
  const { data, error } = await supabase
    .from('bookings')
    .select('*')
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return data.map(rowToBooking)
}

async function insertToSupabase(b: Booking, userId: string): Promise<Booking | null> {
  const { data, error } = await supabase
    .from('bookings')
    .insert(bookingToInsert(b, userId))
    .select()
    .single()
  if (error || !data) {
    console.warn('bookings-store: insert failed', error?.message)
    return null
  }
  return rowToBooking(data)
}

// ── Initialization ──────────────────────────────────────────────────

async function init() {
  const { data: { session } } = await supabase.auth.getSession()
  cache = session ? await loadFromSupabase() : await loadLocal()
  notify()
}

init()

// On sign-in: migrate local bookings, reload from Supabase.
// On sign-out: clear to local (empty until guest creates new ones).
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session) {
    const local = await loadLocal()
    if (local.length > 0) {
      for (const b of local) {
        await insertToSupabase(b, session.user.id)
      }
      await persistLocal([])
    }
    cache = await loadFromSupabase()
    notify()
  } else if (event === 'SIGNED_OUT') {
    cache = []
    notify()
  }
})

// ── Helpers ─────────────────────────────────────────────────────────

function generateConfirmationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'BK-'
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return code
}

function today(): string {
  return new Date().toISOString().split('T')[0]
}

// Guards against bookings whose checkin never got a real date (e.g. Nea's
// search tool call omitted it) — an empty/invalid string would otherwise
// sort as "before" every real date and silently land in Past. Exported so
// every screen that buckets bookings by date (trips.tsx, booking-detail.tsx)
// uses the same rule instead of re-deriving it (and drifting out of sync).
export function isValidDate(d: string): boolean {
  return !!d && !isNaN(new Date(d).getTime())
}

// ── Public API ──────────────────────────────────────────────────────

export async function addBooking(
  booking: Omit<Booking, 'id' | 'booked_at' | 'confirmation_code' | 'status'>,
): Promise<Booking> {
  const confirmation_code = generateConfirmationCode()
  const status: Booking['status'] = 'confirmed'
  const { data: { session } } = await supabase.auth.getSession()

  if (session) {
    const draft: Booking = {
      ...booking,
      id: '',
      booked_at: new Date().toISOString(),
      confirmation_code,
      status,
    }
    const saved = await insertToSupabase(draft, session.user.id)
    if (saved) {
      cache.unshift(saved)
      notify()
      scheduleBookingNotifications(saved)
      return saved
    }
  }

  // Guest or Supabase write failed — local fallback
  const newBooking: Booking = {
    ...booking,
    id: Date.now().toString(),
    booked_at: new Date().toISOString(),
    confirmation_code,
    status,
  }
  cache.unshift(newBooking)
  notify()
  await persistLocal(cache)
  scheduleBookingNotifications(newBooking)
  return newBooking
}

export function cancelBooking(id: string): void {
  const booking = cache.find(b => b.id === id)
  if (!booking) return

  booking.status = 'cancelled'
  notify()
  cancelBookingNotifications(id)

  supabase.auth.getSession().then(({ data: { session } }) => {
    if (session) {
      supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id).then()
    } else {
      persistLocal(cache)
    }
  })
}

export function getBookings(): Booking[] {
  return [...cache]
}

export function getBooking(id: string): Booking | undefined {
  return cache.find(b => b.id === id)
}

export function getUpcomingBookings(): Booking[] {
  const t = today()
  return cache.filter(b => b.status === 'confirmed' && (!isValidDate(b.checkin) || b.checkin >= t))
}

export function getPastBookings(): Booking[] {
  const t = today()
  return cache.filter(b => (isValidDate(b.checkin) && b.checkin < t) || b.status === 'cancelled')
}

export function subscribeToBookings(listener: (bookings: Booking[]) => void): () => void {
  listeners.push(listener)
  return () => {
    const idx = listeners.indexOf(listener)
    if (idx !== -1) listeners.splice(idx, 1)
  }
}
