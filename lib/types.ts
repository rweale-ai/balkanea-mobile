// ── Core trip planning types ──────────────────────────────────────────────────
// Claude returns a TripPlan when it has enough information.
// Until then it returns a Message asking follow-up questions.

export type MessageRole = 'user' | 'assistant'

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  tripPlan?: TripPlan      // present when assistant returns a complete plan
  timestamp: Date
}

// ── Trip plan (structured AI output) ─────────────────────────────────────────

export interface TripPlan {
  title: string            // e.g. "5-Day Romantic Balkans Escape"
  summary: string          // 1-2 sentence overview
  destination: string      // primary destination name
  duration: number         // total days
  estimatedBudget: {
    perPersonPerNight: number
    currency: string
    tier: 'budget' | 'mid' | 'luxury'
  }
  days: DayPlan[]
  hotelSearch: HotelSearchIntent
  tips: string[]           // 2-3 practical travel tips
}

export interface DayPlan {
  day: number
  title: string            // e.g. "Arrival & Old Town"
  description: string
  activities: Activity[]
  meals: string[]          // brief suggestions
}

export interface Activity {
  name: string
  description: string
  duration?: string        // e.g. "2 hours"
  type: 'sightseeing' | 'food' | 'adventure' | 'relaxation' | 'culture' | 'transport'
}

// ── Hotel search intent (drives simulated / real RateHawk call) ──────────────

export interface HotelSearchIntent {
  destination: string
  checkin: string          // ISO YYYY-MM-DD
  checkout: string         // ISO YYYY-MM-DD
  guests: number
  maxPricePerNight?: number
  currency: string
  vibe?: 'romantic' | 'family' | 'adventure' | 'luxury' | 'budget'
}

// ── Hotel result (simulated RateHawk shape — matches real API) ───────────────

export interface Hotel {
  hotel_id: string
  name: string
  stars: number
  address: string
  price_per_night: number
  total_price: number
  currency: string
  amenities: string[]
  booking_url: string
  image_url?: string
}

// ── AI response from Supabase Edge Function ───────────────────────────────────

export type PlannerResponse =
  | { type: 'message'; content: string }
  | { type: 'plan'; content: string; plan: TripPlan; hotels: Hotel[] }
  | { type: 'error'; content: string }
