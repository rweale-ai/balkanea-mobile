import AsyncStorage from '@react-native-async-storage/async-storage'
import type { HotelSearchParams } from './types'

const STORAGE_KEY = 'balkanea_travel_profile'

// What Nea has already learned about the traveler, so she doesn't ask
// again in a later conversation (main chat, hotel review sheet, voice).
export type TravelProfile = Partial<HotelSearchParams>

let cache: TravelProfile = {}

async function load() {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (raw) cache = JSON.parse(raw)
  } catch {
    // ignore — start with an empty profile
  }
}
load()

function persist() {
  AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache)).catch(() => {})
}

export function getTravelProfile(): TravelProfile {
  return { ...cache }
}

export function saveTravelProfile(update: TravelProfile): void {
  cache = { ...cache, ...update }
  persist()
}

export function clearTravelProfile(): void {
  cache = {}
  persist()
}

// Plain-English summary for handing off context to Retell voice calls via
// a dynamic variable — the LLM reads prose, not a raw params object.
export function describeTravelProfile(): string {
  const p = getTravelProfile()
  const parts: string[] = []
  if (p.destination) parts.push(`destination: ${p.destination}`)
  if (p.checkin && p.checkout) parts.push(`dates: ${p.checkin} to ${p.checkout}`)
  if (p.adults) parts.push(`${p.adults} adult${p.adults === 1 ? '' : 's'}`)
  if (p.children) parts.push(`${p.children} child${p.children === 1 ? '' : 'ren'}`)
  if (p.maxPricePerNight) parts.push(`budget up to ${p.maxPricePerNight}/night`)
  return parts.length > 0 ? parts.join(', ') : 'Nothing yet'
}
