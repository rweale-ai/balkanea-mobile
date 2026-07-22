import AsyncStorage from '@react-native-async-storage/async-storage'

const STORAGE_KEY = 'balkanea_itineraries_v2'

export type ItineraryItemType = 'restaurant' | 'tour' | 'sight' | 'note'

export interface ItineraryItem {
  id: string
  type: ItineraryItemType
  title: string
  description?: string
  // ISO yyyy-mm-dd — undefined means not yet scheduled to a specific day
  date?: string
}

export type ItineraryItemDraft = Omit<ItineraryItem, 'id'>

export interface Itinerary {
  items: ItineraryItem[]
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

export function addItineraryItems(bookingId: string, items: ItineraryItemDraft[]): void {
  if (items.length === 0) return
  const existing = cache[bookingId]?.items ?? []
  const withIds: ItineraryItem[] = items.map((item, i) => ({
    ...item,
    id: `${Date.now()}-${i}`,
  }))
  cache[bookingId] = { items: [...existing, ...withIds], updatedAt: new Date().toISOString() }
  persist()
}

export function removeItineraryItem(bookingId: string, itemId: string): void {
  const existing = cache[bookingId]
  if (!existing) return
  cache[bookingId] = {
    items: existing.items.filter(i => i.id !== itemId),
    updatedAt: new Date().toISOString(),
  }
  persist()
}
