export type MessageRole = 'user' | 'assistant'

export type ChatBlock =
  | { type: 'text'; content: string }
  | { type: 'hotel-list'; hotels: Hotel[]; searchParams?: HotelSearchParams; totalCount?: number }
  | { type: 'escalation' }

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  // Block-based rendering: populated on assistant messages after streaming completes
  blocks?: ChatBlock[]
  // True while the response is streaming token-by-token
  streaming?: boolean
  hotels?: Hotel[]
  timestamp: Date
}

export interface HotelSearchParams {
  destination: string
  regionId?: number
  checkin: string
  checkout: string
  adults: number
  children: number
  rooms: number
  maxPricePerNight?: number
  minStars?: number
  currency: string
}

export interface Hotel {
  hotel_id: string
  name: string
  stars: number
  guest_rating: number
  address: string
  distance_to_center: number
  price_per_night: number
  total_price: number
  currency: string
  amenities: string[]
  images: string[]
  room_types: RoomType[]
  cancellation_policy: string
  meal_plan: string
  latitude: number
  longitude: number
}

export interface RoomType {
  room_id: string
  name: string
  max_guests: number
  price_per_night: number
  total_price: number
  meal_plan: string
  cancellation: string
  beds: string
}

export interface Booking {
  id: string
  hotel: Hotel
  room: RoomType
  checkin: string
  checkout: string
  guests: { adults: number; children: number }
  rooms: number
  total_price: number
  currency: string
  status: 'locked' | 'confirmed' | 'cancelled' | 'pending'
  booked_at: string
  confirmation_code: string
  guest_name: string
  guest_email: string
  guest_phone: string
}

export interface Destination {
  id: string
  name: string
  country: string
  imageUrl: string
  tagline: string
  categories: DestinationCategory[]
  rating: number
  reviewCount: number
  highlights: string[]
  bestTimeToVisit: string
  regionId: number
}

export type DestinationCategory =
  | 'beach'
  | 'mountain'
  | 'culture'
  | 'adventure'
  | 'nightlife'
  | 'nature'
  | 'history'
  | 'food'

export interface EscalationRequest {
  reason: string
  customerName: string
  customerPhone: string
  conversationSummary: string
  preferredCallback?: string
}

export type PlannerResponse =
  | { type: 'message'; content: string }
  | { type: 'hotels'; content: string; hotels: Hotel[]; searchParams: HotelSearchParams }
  | { type: 'escalation'; content: string }
  | { type: 'feedback'; content: string; feedbackData: Record<string, unknown> }
  | { type: 'error'; content: string }
