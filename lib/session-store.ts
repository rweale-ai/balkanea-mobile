import type { Hotel, HotelSearchParams } from './types'

interface ViewedEntry {
  hotel: Hotel
  params: HotelSearchParams
}

let viewed: ViewedEntry[] = []

export function trackViewedHotel(hotel: Hotel, params: HotelSearchParams): void {
  const idx = viewed.findIndex(v => v.hotel.hotel_id === hotel.hotel_id)
  if (idx === -1) viewed.push({ hotel, params })
  else viewed[idx] = { hotel, params }
}

export function getViewedHotels(): ViewedEntry[] {
  return [...viewed]
}

export function clearSessionHotels(): void {
  viewed = []
}
