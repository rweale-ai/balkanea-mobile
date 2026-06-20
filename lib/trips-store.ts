// In-memory trip store. Trips persist for the session but are cleared on reload.
// Replace with AsyncStorage / Supabase for durable persistence before shipping.

import type { TripPlan } from './types'

export interface SavedTrip {
  id: string
  plan: TripPlan
  savedAt: Date
}

const trips: SavedTrip[] = []
const listeners: Array<(trips: SavedTrip[]) => void> = []

function notify() {
  const snapshot = [...trips]
  listeners.forEach(l => l(snapshot))
}

export function saveTrip(plan: TripPlan): void {
  trips.unshift({ id: Date.now().toString(), plan, savedAt: new Date() })
  notify()
}

export function deleteTrip(id: string): void {
  const idx = trips.findIndex(t => t.id === id)
  if (idx !== -1) { trips.splice(idx, 1); notify() }
}

export function getTrips(): SavedTrip[] {
  return [...trips]
}

export function subscribeToTrips(listener: (trips: SavedTrip[]) => void): () => void {
  listeners.push(listener)
  return () => {
    const idx = listeners.indexOf(listener)
    if (idx !== -1) listeners.splice(idx, 1)
  }
}
