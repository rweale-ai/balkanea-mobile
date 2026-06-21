import AsyncStorage from '@react-native-async-storage/async-storage'
import type { TripPlan } from './types'

const STORAGE_KEY = 'balkanea_saved_trips'

export interface SavedTrip {
  id: string
  plan: TripPlan
  savedAt: Date
}

interface StoredTrip {
  id: string
  plan: TripPlan
  savedAt: string
}

let cache: SavedTrip[] = []
const listeners: Array<(trips: SavedTrip[]) => void> = []

function notify() {
  const snapshot = [...cache]
  listeners.forEach(l => l(snapshot))
}

;(async () => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (raw) {
      const stored: StoredTrip[] = JSON.parse(raw)
      cache = stored.map(t => ({ ...t, savedAt: new Date(t.savedAt) }))
    }
  } catch (e) {
    console.warn('Failed to load trips from storage:', e)
  }
  notify()
})()

async function persist() {
  try {
    const stored: StoredTrip[] = cache.map(t => ({
      ...t,
      savedAt: t.savedAt.toISOString(),
    }))
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stored))
  } catch (e) {
    console.warn('Failed to persist trips:', e)
  }
}

export function saveTrip(plan: TripPlan): void {
  cache.unshift({ id: Date.now().toString(), plan, savedAt: new Date() })
  notify()
  persist()
}

export function deleteTrip(id: string): void {
  const idx = cache.findIndex(t => t.id === id)
  if (idx !== -1) {
    cache.splice(idx, 1)
    notify()
    persist()
  }
}

export function getTrips(): SavedTrip[] {
  return [...cache]
}

export function getTrip(id: string): SavedTrip | undefined {
  return cache.find(t => t.id === id)
}

export function subscribeToTrips(listener: (trips: SavedTrip[]) => void): () => void {
  listeners.push(listener)
  return () => {
    const idx = listeners.indexOf(listener)
    if (idx !== -1) listeners.splice(idx, 1)
  }
}
