import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = 'balkanea_itineraries'

export interface Itinerary {
  content: string
  updatedAt: string
}

let cache: Record<string, Itinerary> = {}

async function load() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (raw) cache = JSON.parse(raw)
  } catch {
    // ignore — start empty
  }
}
load()

function persist() {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache)).catch(() => {})
}

export function getItinerary(bookingId: string): Itinerary | undefined {
  return cache[bookingId]
}

export function saveItinerary(bookingId: string, content: string): void {
  cache[bookingId] = { content, updatedAt: new Date().toISOString() }
  persist()
}
