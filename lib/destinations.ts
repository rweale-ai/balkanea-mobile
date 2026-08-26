import type { Destination, DestinationCategory } from './types'

export type { DestinationCategory }
export type { Destination }

export const CATEGORIES: { id: DestinationCategory | 'all'; label: string; icon: string }[] = [
  { id: 'all',       label: 'All',       icon: '✦' },
  { id: 'beach',     label: 'Beach',     icon: '🏖' },
  { id: 'mountain',  label: 'Mountain',  icon: '⛰' },
  { id: 'culture',   label: 'Culture',   icon: '🏛' },
  { id: 'adventure', label: 'Adventure', icon: '🧗' },
  { id: 'nightlife', label: 'Nightlife', icon: '🌙' },
  { id: 'nature',    label: 'Nature',    icon: '🌿' },
  { id: 'history',   label: 'History',   icon: '📜' },
  { id: 'food',      label: 'Food & Wine', icon: '🍷' },
]

// Scoped to just the three regions RateHawk's real sandbox dump has rate
// data for (Chat/lib/hotel-db.js's searchSandboxHotelContent / sandbox.hotels
// -- Los Angeles, Paris, Dubai, verified 2026-08-25) -- was the full 15-city
// Balkan-outbound list until 2026-08-26. Every card here now supports the
// app's full real flow (search → real live RateHawk price on open), not
// simulated pricing over real content. Other destinations (Santorini,
// Athens, Ohrid, etc.) are still searchable through Nea chat -- this list
// only controls what Explore browses, not what the backend can resolve
// (Chat/lib/destinations.js is unchanged apart from adding Dubai).
export const DESTINATIONS: Record<string, Destination> = {
  'los angeles': {
    id: 'los angeles',
    name: 'Los Angeles',
    country: 'United States',
    // crop=focalpoint only takes effect when BOTH w and h are given (it
    // crops server-side to that target ratio, biased toward fp-y) -- w
    // alone just resizes the full portrait source, and the card's own
    // object-fit:cover then re-crops centered on the container, missing
    // the sign entirely (verified 2026-08-26: this exact bug on the first
    // attempt). h=500 forces a real server-side crop centered on the sign,
    // so any further client-side center-crop still keeps it in frame.
    imageUrl: 'https://images.unsplash.com/photo-1609924211018-5526c55bad5b?auto=format&fit=crop&crop=focalpoint&fp-x=0.5&fp-y=0.55&w=1200&h=500&q=80', // Hollywood Sign
    tagline: 'Hollywood, beaches & sunshine',
    categories: ['beach', 'culture', 'nightlife'],
    rating: 4.6,
    reviewCount: 1800,
    highlights: ['Hollywood Sign', 'Santa Monica Pier', 'Rodeo Drive', 'Griffith Observatory'],
    bestTimeToVisit: 'March – November',
    regionId: 2011,
  },
  paris: {
    id: 'paris',
    name: 'Paris',
    country: 'France',
    imageUrl: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80',
    tagline: 'The City of Light',
    categories: ['culture', 'food', 'history'],
    rating: 4.8,
    reviewCount: 8900,
    highlights: ['Eiffel Tower', 'Louvre Museum', 'Montmartre', 'Seine River cruise'],
    bestTimeToVisit: 'April – October',
    regionId: 6057653,
  },
  dubai: {
    id: 'dubai',
    name: 'Dubai',
    country: 'United Arab Emirates',
    imageUrl: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80', // Burj Khalifa
    tagline: 'Where desert meets skyline',
    categories: ['adventure', 'culture', 'nightlife'],
    rating: 4.7,
    reviewCount: 2600,
    highlights: ['Burj Khalifa', 'Dubai Mall', 'Desert safari', 'Palm Jumeirah'],
    bestTimeToVisit: 'November – March',
    regionId: 2012,
  },
}

export function findDestination(text: string): Destination | null {
  const lower = text.toLowerCase()
  for (const dest of Object.values(DESTINATIONS)) {
    if (lower.includes(dest.name.toLowerCase()) || lower.includes(dest.country.toLowerCase())) {
      return dest
    }
  }
  return null
}

export function filterDestinations(
  category: DestinationCategory | 'all',
  searchQuery: string,
): Destination[] {
  const query = searchQuery.toLowerCase().trim()
  return Object.values(DESTINATIONS).filter(d => {
    if (category !== 'all' && !d.categories.includes(category)) return false
    if (query) {
      return d.name.toLowerCase().includes(query)
        || d.country.toLowerCase().includes(query)
        || d.tagline.toLowerCase().includes(query)
    }
    return true
  })
}

export function getDestinationByRegionId(regionId: number): Destination | null {
  return Object.values(DESTINATIONS).find(d => d.regionId === regionId) ?? null
}
