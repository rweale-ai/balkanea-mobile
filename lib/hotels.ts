// Simulated RateHawk hotel data — same shape as the real API response.
// Swap to real RateHawk calls by replacing searchHotels() once sandbox access arrives.
// Destination keys match balkanea-lead-webhook/lib/ratehawk.js for consistency.

import type { Hotel, HotelSearchIntent } from './types'

const MOCK_HOTELS: Record<string, Hotel[]> = {
  ohrid: [
    { hotel_id: 'oh-001', name: 'Hotel Tino Ohrid', stars: 4, address: 'Kej Makedonija 1, Ohrid', price_per_night: 95, total_price: 0, currency: 'EUR', amenities: ['Pool', 'Lake view', 'Free WiFi', 'Breakfast included'], booking_url: 'https://balkanea.com/hotel/tino-ohrid', image_url: undefined },
    { hotel_id: 'oh-002', name: 'Villa Lucija', stars: 3, address: 'Kaneo 12, Ohrid', price_per_night: 62, total_price: 0, currency: 'EUR', amenities: ['Free WiFi', 'City centre', 'Air conditioning'], booking_url: 'https://balkanea.com/hotel/villa-lucija', image_url: undefined },
    { hotel_id: 'oh-003', name: 'Sunrise Beach Hotel', stars: 3, address: 'Lakatnik bb, Ohrid', price_per_night: 74, total_price: 0, currency: 'EUR', amenities: ['Beach access', 'Free WiFi', 'Parking'], booking_url: 'https://balkanea.com/hotel/sunrise-beach', image_url: undefined },
  ],
  dubrovnik: [
    { hotel_id: 'db-001', name: 'Hotel Excelsior Dubrovnik', stars: 5, address: 'Frana Supila 12, Dubrovnik', price_per_night: 320, total_price: 0, currency: 'EUR', amenities: ['Sea view', 'Pool', 'Spa', 'Free WiFi'], booking_url: 'https://balkanea.com/hotel/excelsior-dubrovnik', image_url: undefined },
    { hotel_id: 'db-002', name: 'Villa Orsula', stars: 4, address: 'Frana Supila 14, Dubrovnik', price_per_night: 185, total_price: 0, currency: 'EUR', amenities: ['Sea view', 'Free WiFi', 'Breakfast included'], booking_url: 'https://balkanea.com/hotel/villa-orsula', image_url: undefined },
    { hotel_id: 'db-003', name: 'Hotel Stari Grad', stars: 3, address: 'Od Sigurate 4, Dubrovnik', price_per_night: 128, total_price: 0, currency: 'EUR', amenities: ['Old Town', 'Free WiFi', 'Air conditioning'], booking_url: 'https://balkanea.com/hotel/stari-grad', image_url: undefined },
  ],
  kotor: [
    { hotel_id: 'kt-001', name: 'Palazzo Drusko', stars: 4, address: 'Stari Grad, Kotor', price_per_night: 145, total_price: 0, currency: 'EUR', amenities: ['Old Town', 'Bay view', 'Free WiFi', 'Breakfast included'], booking_url: 'https://balkanea.com/hotel/palazzo-drusko', image_url: undefined },
    { hotel_id: 'kt-002', name: 'Hotel Vardar', stars: 3, address: 'Stari Grad 476, Kotor', price_per_night: 88, total_price: 0, currency: 'EUR', amenities: ['Old Town', 'Free WiFi', 'Air conditioning'], booking_url: 'https://balkanea.com/hotel/vardar-kotor', image_url: undefined },
    { hotel_id: 'kt-003', name: 'Hotel Monte Cristo', stars: 4, address: 'Dobrota, Kotor', price_per_night: 112, total_price: 0, currency: 'EUR', amenities: ['Bay view', 'Pool', 'Free WiFi', 'Parking'], booking_url: 'https://balkanea.com/hotel/monte-cristo', image_url: undefined },
  ],
  budva: [
    { hotel_id: 'bd-001', name: 'Avala Resort', stars: 5, address: 'Mediteranska 2, Budva', price_per_night: 195, total_price: 0, currency: 'EUR', amenities: ['Pool', 'Spa', 'Beach access', 'Sea view'], booking_url: 'https://balkanea.com/hotel/avala-resort', image_url: undefined },
    { hotel_id: 'bd-002', name: 'Hotel Budva', stars: 4, address: 'Mediteranska 4, Budva', price_per_night: 118, total_price: 0, currency: 'EUR', amenities: ['Beach access', 'Pool', 'Free WiFi', 'Sea view'], booking_url: 'https://balkanea.com/hotel/hotel-budva', image_url: undefined },
  ],
  sarajevo: [
    { hotel_id: 'sj-001', name: 'Hotel Europe Sarajevo', stars: 5, address: 'Vladislava Skarica 5, Sarajevo', price_per_night: 145, total_price: 0, currency: 'EUR', amenities: ['City centre', 'Spa', 'Free WiFi', 'Breakfast included'], booking_url: 'https://balkanea.com/hotel/europe-sarajevo', image_url: undefined },
    { hotel_id: 'sj-002', name: 'Hotel Michele', stars: 4, address: 'Ivana Cankar 6, Sarajevo', price_per_night: 98, total_price: 0, currency: 'EUR', amenities: ['City centre', 'Free WiFi', 'Air conditioning'], booking_url: 'https://balkanea.com/hotel/michele-sarajevo', image_url: undefined },
  ],
  belgrade: [
    { hotel_id: 'bg-001', name: 'Metropol Palace', stars: 5, address: 'Bulevar Kralja Aleksandra 69, Belgrade', price_per_night: 178, total_price: 0, currency: 'EUR', amenities: ['City centre', 'Pool', 'Spa', 'Free WiFi'], booking_url: 'https://balkanea.com/hotel/metropol-palace', image_url: undefined },
    { hotel_id: 'bg-002', name: 'Hotel Moskva', stars: 4, address: 'Balkanska 1, Belgrade', price_per_night: 115, total_price: 0, currency: 'EUR', amenities: ['City centre', 'Free WiFi', 'Breakfast included'], booking_url: 'https://balkanea.com/hotel/hotel-moskva', image_url: undefined },
  ],
  default: [
    { hotel_id: 'df-001', name: 'Grand Balkan Hotel', stars: 4, address: 'City Centre', price_per_night: 110, total_price: 0, currency: 'EUR', amenities: ['Free WiFi', 'Breakfast included', 'Air conditioning'], booking_url: 'https://balkanea.com', image_url: undefined },
    { hotel_id: 'df-002', name: 'Boutique Hotel Adriatic', stars: 3, address: 'Old Town', price_per_night: 75, total_price: 0, currency: 'EUR', amenities: ['Free WiFi', 'City centre', 'Parking'], booking_url: 'https://balkanea.com', image_url: undefined },
  ],
}

function normaliseDest(dest: string): string {
  const d = dest.toLowerCase().trim()
  for (const key of Object.keys(MOCK_HOTELS)) {
    if (d.includes(key) || key.includes(d)) return key
  }
  return 'default'
}

function nightsBetween(checkin: string, checkout: string): number {
  return Math.round((new Date(checkout).getTime() - new Date(checkin).getTime()) / 86400000)
}

export function findHotelByMention(text: string): Hotel | null {
  const lower = text.toLowerCase()
  for (const hotels of Object.values(MOCK_HOTELS)) {
    for (const h of hotels) {
      if (lower.includes(h.name.toLowerCase())) return h
    }
  }
  return null
}

export function searchHotels(intent: HotelSearchIntent): Hotel[] {
  const key   = normaliseDest(intent.destination)
  const pool  = MOCK_HOTELS[key] ?? MOCK_HOTELS.default
  const nights = nightsBetween(intent.checkin, intent.checkout)

  return pool
    .filter(h => !intent.maxPricePerNight || h.price_per_night <= intent.maxPricePerNight)
    .map(h => ({
      ...h,
      total_price: h.price_per_night * nights,
      currency: intent.currency ?? 'EUR',
    }))
    .slice(0, 3)
}
