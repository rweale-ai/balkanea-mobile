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

// Per-room guest breakdown for multi-room bookings, matching RateHawk's real
// search model (one guests[] entry per room). When present on
// HotelSearchParams/Booking, this is the source of truth and adults/
// children/rooms are derived summary fields -- see lib/rooms-config.ts for
// the validation this must pass before it's trusted anywhere near a charge.
export interface RoomGuestConfig {
  adults: number
  childAges: number[]
}

export interface HotelSearchParams {
  destination: string
  regionId?: number
  checkin: string
  checkout: string
  adults: number
  children: number
  rooms: number
  // Per-room breakdown, when known -- see RoomGuestConfig above. Optional:
  // absent means "single room" behavior, unchanged from before this field
  // existed.
  roomsConfig?: RoomGuestConfig[]
  maxPricePerNight?: number
  // Star rating filter -- minStars existed on this type before 2026-08-27
  // but was only ever consumed by generateHotels() (the fully-simulated
  // fallback); never sent to the real backend, never taught to Nea's
  // tool-call schema in lib/claude.ts, so it had zero effect on any real
  // search (sandbox Paris/LA/Dubai, or the content-DB path). Both wired
  // through end-to-end now -- see lib/hotels.ts and Chat lib/hotel-db.js.
  minStars?: number
  maxStars?: number
  currency: string
  // Free-text preferences the traveler mentioned (e.g. "pool, sea view,
  // quiet") -- not used for search filtering, just carried forward so
  // later features (review summaries, itinerary suggestions) can weigh
  // their answers against what the traveler actually asked for.
  amenityPreferences?: string
  // Set when the traveler is asking for a SPECIFIC hotel by name (e.g.
  // "book it again" against a past booking, or naming a hotel outright) --
  // NOT a general preference. searchHotels uses this to reorder/filter
  // results so the requested hotel is what actually gets shown as "Nea's
  // top pick" (index 0), rather than whatever the destination search
  // happened to sort first. See lib/claude.ts's system prompt for when the
  // model is instructed to set this.
  hotelName?: string
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
  // True only for hotels sourced from live RateHawk search (currently just
  // Los Angeles) -- room_types is empty until fetchRealRoomTypes (lib/hotels.ts)
  // is called for this specific hotel; see room-selection.tsx.
  hasLiveRates?: boolean
}

// RateHawk's real cancellation_penalties shape (rate.payment_options.
// payment_types[0].cancellation_penalties, verified live 2026-08-27 against
// sandbox -- their docs site 403s automated fetches, this is not from the
// public docs). A graduated schedule, not a single free/non-refundable
// flag: a rate can have a free window, then one or more partial-penalty
// tiers, then a full-penalty tier from some later date. Non-refundable =
// free_cancellation_before: null + a single unconditional policy. See
// lib/cancellation.ts for how this gets turned into "can I cancel free
// right now."
export interface CancellationPolicy {
  policies: Array<{
    start_at: string | null
    end_at: string | null
    amount_charge: string
    amount_show: string
  }>
  free_cancellation_before: string | null
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
  // Present only for rooms sourced from live RateHawk search (currently just
  // Los Angeles) -- its presence is what tells booking.tsx and lib/ratehawk.ts
  // to run the real prebook/booking flow instead of the simulated stub. Absent
  // for every DB-content/simulated hotel, which keeps their behavior untouched.
  book_hash?: string
  // Present only alongside book_hash (real rates carry the real schedule;
  // simulated rooms have no real RateHawk terms to show). Persisted onto the
  // Booking at booking time -- see lib/bookings-store.ts -- so the real
  // terms locked in at booking are still known after the room/hotel search
  // result that produced them is gone.
  cancellation_policy?: CancellationPolicy
}

export interface Booking {
  id: string
  hotel: Hotel
  room: RoomType
  checkin: string
  checkout: string
  guests: { adults: number; children: number }
  rooms: number
  // Per-room breakdown + per-room lead-guest names, when known. Optional --
  // absent for every booking made before multi-room support existed, and
  // for any single-room booking today (guest_name below still covers that
  // case). roomGuestNames[0] always mirrors guest_name when present.
  roomsConfig?: RoomGuestConfig[]
  roomGuestNames?: string[]
  total_price: number
  currency: string
  status: 'locked' | 'confirmed' | 'cancelled' | 'pending'
  booked_at: string
  confirmation_code: string
  guest_name: string
  guest_email: string
  guest_phone: string
  // Gateway payment tracking (see lib/payment-intent.ts) — optional because
  // rows created before migration 004_payment_tracking.sql won't have them.
  payment_reference?: string
  payment_state?: 'preauth_pending' | 'preauth_done' | 'captured' | 'voided' | 'failed'
  gateway_transaction_id?: string
  // Real RateHawk order id, set only when this booking went through the real
  // prebook/booking-finish flow (room.book_hash was present). Optional because
  // rows created before migration 007_ratehawk_order.sql won't have it, and
  // simulated/DB-content bookings never set it at all.
  ratehawk_order_id?: string
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
