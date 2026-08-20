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
    payment_reference: row.payment_reference ?? undefined,
    payment_state: row.payment_state ?? undefined,
    gateway_transaction_id: row.gateway_transaction_id ?? undefined,
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
    payment_reference: b.payment_reference ?? null,
    payment_state: b.payment_state ?? null,
    gateway_transaction_id: b.gateway_transaction_id ?? null,
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
  const insertRow = bookingToInsert(b, userId)
  let { data, error } = await supabase.from('bookings').insert(insertRow).select().single()

  // payment_reference/payment_state/gateway_transaction_id require migration
  // 004_payment_tracking.sql. Until that's run in Supabase, PostgREST rejects
  // the insert with an unknown-column error (42703) — retry without those
  // fields rather than losing the whole booking over pending payment-tracking
  // columns the guest's booking doesn't strictly need.
  if (error?.code === '42703') {
    const { payment_reference, payment_state, gateway_transaction_id, ...fallbackRow } = insertRow
    console.warn('bookings-store: payment tracking columns missing (run migration 004), inserting without them')
    ;({ data, error } = await supabase.from('bookings').insert(fallbackRow).select().single())
  }

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
  status: Booking['status'] = 'confirmed',
): Promise<Booking> {
  const confirmation_code = generateConfirmationCode()
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

// A booking row has to exist (status 'pending', payment_reference set)
// before a payment link is created, so api/payment-notify.js has something
// to find and update — see docs/bankart-payment-config.md in the Chat repo.
export async function createPendingBooking(
  booking: Omit<Booking, 'id' | 'booked_at' | 'confirmation_code' | 'status'>,
): Promise<Booking> {
  return addBooking(booking, 'pending')
}

// Applied after the WebView closes, from lib/payment-status.ts's poll of
// this same row (which payment-notify.js updates server-side) — never from
// the WebView bridge callback itself, that's UX-only per the plugin doc.
export async function updateBookingStatus(
  id: string,
  patch: Partial<Pick<Booking, 'status' | 'payment_state' | 'gateway_transaction_id' | 'payment_reference'>>,
): Promise<void> {
  const booking = cache.find(b => b.id === id)
  if (booking) {
    Object.assign(booking, patch)
    notify()
  }

  const { data: { session } } = await supabase.auth.getSession()
  if (session) {
    const { error } = await supabase.from('bookings').update(patch).eq('id', id)
    if (error) console.warn('bookings-store: updateBookingStatus failed', error.message)
  } else {
    await persistLocal(cache)
  }
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

// Plain-English summary of confirmed bookings for handing off context to
// Nea (chat system prompt + Retell voice dynamic variable) — without this,
// Nea only ever sees search-profile dates, not what's actually booked.
export function describeBookings(): string {
  const confirmed = cache.filter(b => b.status === 'confirmed')
  if (confirmed.length === 0) return ''
  return confirmed
    .map(b => `${b.hotel.name} in ${b.hotel.address} (confirmation ${b.confirmation_code}), ${b.checkin} to ${b.checkout}, status: confirmed and paid`)
    .join('; ')
}

export function subscribeToBookings(listener: (bookings: Booking[]) => void): () => void {
  listeners.push(listener)
  return () => {
    const idx = listeners.indexOf(listener)
    if (idx !== -1) listeners.splice(idx, 1)
  }
}
