import type { Hotel, HotelSearchParams, RoomType } from './types'

const BACKEND_URL = 'https://balkanea-lead-webhook.vercel.app'

const ROOM_TEMPLATES: RoomType[] = [
  { room_id: 'std', name: 'Standard Double Room', max_guests: 2, price_per_night: 0, total_price: 0, meal_plan: 'Room only', cancellation: 'Free cancellation until 48h before check-in', beds: '1 double bed' },
  { room_id: 'sup', name: 'Superior Room', max_guests: 3, price_per_night: 0, total_price: 0, meal_plan: 'Breakfast included', cancellation: 'Free cancellation until 72h before check-in', beds: '1 king bed' },
  { room_id: 'dlx', name: 'Deluxe Suite', max_guests: 4, price_per_night: 0, total_price: 0, meal_plan: 'Half board', cancellation: 'Non-refundable', beds: '1 king bed + sofa bed' },
]

const AMENITY_POOLS = [
  ['Free WiFi', 'Pool', 'Spa', 'Restaurant', 'Fitness centre', 'Room service'],
  ['Free WiFi', 'Beach access', 'Pool', 'Air conditioning', 'Parking', 'Bar'],
  ['Free WiFi', 'City centre', 'Breakfast included', 'Air conditioning', 'Concierge'],
  ['Free WiFi', 'Sea view', 'Pool', 'Spa', 'All-inclusive available', 'Kids club'],
  ['Free WiFi', 'Mountain view', 'Restaurant', 'Parking', 'Terrace', 'Garden'],
]

const HOTEL_NAMES_BY_TIER: Record<string, string[]> = {
  luxury: ['Grand Palace Hotel', 'The Royal Residence', 'Bellevue Luxury Suites', 'Imperial Hotel & Spa', 'Crystal Bay Resort'],
  mid: ['Hotel Panorama', 'City Centre Inn', 'Sunset Beach Hotel', 'Mediterranean Hotel', 'Park View Hotel'],
  budget: ['Hostel Central', 'Budget Stay Inn', 'Economy Rooms', 'Backpacker Lodge', 'Simple Suites'],
}

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

function nightsBetween(checkin: string, checkout: string): number {
  return Math.max(1, Math.round((new Date(checkout).getTime() - new Date(checkin).getTime()) / 86400000))
}

function generateHotels(params: HotelSearchParams): Hotel[] {
  const seed = params.destination.length * 1000 + (params.regionId ?? 0)
  const rand = seededRandom(seed)
  const nights = nightsBetween(params.checkin, params.checkout)
  const hotels: Hotel[] = []

  const tiers = ['luxury', 'luxury', 'mid', 'mid', 'mid', 'mid', 'budget', 'budget'] as const
  const count = 8

  for (let i = 0; i < count; i++) {
    const tier = tiers[i]
    const basePrice = tier === 'luxury' ? 150 + Math.floor(rand() * 200)
      : tier === 'mid' ? 60 + Math.floor(rand() * 90)
      : 25 + Math.floor(rand() * 35)

    const stars = tier === 'luxury' ? 5 : tier === 'mid' ? (3 + Math.floor(rand() * 2)) : (2 + Math.floor(rand() * 2))
    const guestRating = tier === 'luxury' ? 8.5 + rand() * 1.5
      : tier === 'mid' ? 7.0 + rand() * 2
      : 6.0 + rand() * 2

    const namePool = HOTEL_NAMES_BY_TIER[tier]
    const name = namePool[i % namePool.length]
    const amenities = AMENITY_POOLS[i % AMENITY_POOLS.length]
    const distance = tier === 'budget' ? 1.5 + rand() * 3 : 0.2 + rand() * 2

    const rooms: RoomType[] = ROOM_TEMPLATES.map((rt, ri) => ({
      ...rt,
      room_id: `${params.destination.slice(0, 3)}-${i}-${rt.room_id}`,
      price_per_night: basePrice + ri * Math.floor(basePrice * 0.3),
      total_price: (basePrice + ri * Math.floor(basePrice * 0.3)) * nights,
    }))

    hotels.push({
      hotel_id: `rh-${params.destination.slice(0, 3)}-${i.toString().padStart(3, '0')}`,
      name: `${name} ${params.destination}`,
      stars,
      guest_rating: Math.round(guestRating * 10) / 10,
      address: `${Math.floor(rand() * 200) + 1} ${params.destination} Avenue`,
      distance_to_center: Math.round(distance * 10) / 10,
      price_per_night: basePrice,
      total_price: basePrice * nights,
      currency: params.currency || 'EUR',
      amenities,
      images: [
        `https://picsum.photos/seed/${params.destination}-${i}-1/800/600`,
        `https://picsum.photos/seed/${params.destination}-${i}-2/800/600`,
        `https://picsum.photos/seed/${params.destination}-${i}-3/800/600`,
      ],
      room_types: rooms,
      cancellation_policy: stars >= 4 ? 'Free cancellation until 48h before check-in' : 'Non-refundable',
      meal_plan: stars >= 4 ? 'Breakfast included' : 'Room only',
      latitude: 40 + rand() * 5,
      longitude: 20 + rand() * 10,
    })
  }

  return hotels
    .filter(h => !params.maxPricePerNight || h.price_per_night <= params.maxPricePerNight)
    .filter(h => !params.minStars || h.stars >= params.minStars)
    .sort((a, b) => a.price_per_night - b.price_per_night)
}

// This must only ever query RateHawk's B2C-approved hotel file — a separate,
// limited set Christian maintains for online booking — never the full B2B
// inventory Balkanea staff browse directly in RateHawk's own platform (see
// project memory: balkanea-mobile booking flow, call with Jasmina
// 2026-06-30). The simulated fallback below stands in for that B2C file
// until real sandbox/production RateHawk credentials are available.
export async function searchHotels(params: HotelSearchParams): Promise<Hotel[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/api/search-hotels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        destination: params.destination,
        checkin: params.checkin,
        checkout: params.checkout,
        guests: params.adults + params.children,
        max_price_per_night: params.maxPricePerNight,
      }),
    })

    if (res.ok) {
      const data = await res.json()
      if (data.success && data.results && data.results.length > 0) {
        return data.results.map((h: any) => ({
          ...h,
          guest_rating: h.guest_rating ?? 8.0,
          distance_to_center: h.distance_to_center ?? 1.0,
          images: h.images ?? [`https://picsum.photos/seed/${h.hotel_id}/800/600`],
          room_types: h.room_types ?? ROOM_TEMPLATES.map((rt, i) => ({
            ...rt,
            room_id: `${h.hotel_id}-${rt.room_id}`,
            price_per_night: h.price_per_night + i * 20,
            total_price: (h.price_per_night + i * 20) * nightsBetween(params.checkin, params.checkout),
          })),
          cancellation_policy: h.cancellation_policy ?? 'Contact hotel for cancellation policy',
          meal_plan: h.meal_plan ?? 'Room only',
          latitude: h.latitude ?? 0,
          longitude: h.longitude ?? 0,
        }))
      }
    }
  } catch (e) {
    console.log('Backend search unavailable, using simulated data')
  }

  return generateHotels(params)
}

export function searchHotelsSync(params: HotelSearchParams): Hotel[] {
  return generateHotels(params)
}
