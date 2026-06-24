import AsyncStorage from '@react-native-async-storage/async-storage'
import type { Booking } from './types'

const STORAGE_KEY = 'balkanea_bookings'

let cache: Booking[] = []
const listeners: Array<(bookings: Booking[]) => void> = []

function notify() {
  const snapshot = [...cache]
  listeners.forEach(l => l(snapshot))
}

;(async () => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (raw) cache = JSON.parse(raw)
  } catch (e) {
    console.warn('Failed to load bookings:', e)
  }
  notify()
})()

async function persist() {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache))
  } catch (e) {
    console.warn('Failed to persist bookings:', e)
  }
}

function generateConfirmationCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'BK-'
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export function addBooking(booking: Omit<Booking, 'id' | 'booked_at' | 'confirmation_code' | 'status'>): Booking {
  const newBooking: Booking = {
    ...booking,
    id: Date.now().toString(),
    booked_at: new Date().toISOString(),
    confirmation_code: generateConfirmationCode(),
    status: 'confirmed',
  }
  cache.unshift(newBooking)
  notify()
  persist()
  return newBooking
}

export function cancelBooking(id: string): void {
  const booking = cache.find(b => b.id === id)
  if (booking) {
    booking.status = 'cancelled'
    notify()
    persist()
  }
}

export function getBookings(): Booking[] {
  return [...cache]
}

export function getBooking(id: string): Booking | undefined {
  return cache.find(b => b.id === id)
}

export function getUpcomingBookings(): Booking[] {
  const today = new Date().toISOString().split('T')[0]
  return cache.filter(b => b.status === 'confirmed' && b.checkin >= today)
}

export function getPastBookings(): Booking[] {
  const today = new Date().toISOString().split('T')[0]
  return cache.filter(b => b.checkin < today || b.status === 'cancelled')
}

export function subscribeToBookings(listener: (bookings: Booking[]) => void): () => void {
  listeners.push(listener)
  return () => {
    const idx = listeners.indexOf(listener)
    if (idx !== -1) listeners.splice(idx, 1)
  }
}
