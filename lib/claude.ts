// Claude API client — routes through Supabase Edge Function in production.
// For local dev: calls Claude directly using EXPO_PUBLIC_CLAUDE_API_KEY.
// TODO: replace direct call with Supabase Edge Function URL before App Store submission.

import type { ChatMessage, PlannerResponse, TripPlan } from './types'
import { searchHotels } from './hotels'

const SYSTEM_PROMPT = `You are Bea, an expert Balkans travel planner for Balkanea — the leading travel platform for the Balkans region. You know every destination deeply: Ohrid, Dubrovnik, Kotor, Budva, Sarajevo, Mostar, Belgrade, Tirana, Sofia, Bled, Ljubljana, and many more.

Your job is to have a natural conversation to understand the traveller's dream trip, then build a detailed personalised itinerary.

## Conversation approach
- Be warm, enthusiastic, and knowledgeable — like a well-travelled local friend
- Ask one or two questions at a time, not a long list
- Keep responses concise — this is a mobile app
- Once you have enough information (destination, dates/duration, group size, budget tier), generate the trip plan

## You need to gather:
1. Where they want to go (or help them decide if unsure)
2. When / how long (dates or just duration)
3. Who is travelling (solo, couple, family, friends — how many)
4. Budget feel (budget / mid-range / luxury) — don't ask for exact numbers
5. Vibe / interests (beach, history, food, adventure, romance, nature)

## When you have enough information, respond with ONLY valid JSON in this exact format:
{
  "type": "plan",
  "message": "Here's your personalised Balkans trip...",
  "plan": {
    "title": "...",
    "summary": "...",
    "destination": "...",
    "duration": 5,
    "estimatedBudget": { "perPersonPerNight": 100, "currency": "EUR", "tier": "mid" },
    "days": [
      {
        "day": 1,
        "title": "...",
        "description": "...",
        "activities": [
          { "name": "...", "description": "...", "duration": "2 hours", "type": "sightseeing" }
        ],
        "meals": ["Breakfast at ...", "Lunch at ..."]
      }
    ],
    "hotelSearch": {
      "destination": "...",
      "checkin": "YYYY-MM-DD",
      "checkout": "YYYY-MM-DD",
      "guests": 2,
      "maxPricePerNight": 150,
      "currency": "EUR",
      "vibe": "romantic"
    },
    "tips": ["...", "..."]
  }
}

## If you're still gathering info, respond with ONLY valid JSON:
{ "type": "message", "content": "Your follow-up question here..." }

Always respond with valid JSON only. No markdown, no extra text.`

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-haiku-4-5-20251001'

export async function sendMessage(
  messages: ChatMessage[],
): Promise<PlannerResponse> {
  const apiKey = process.env.EXPO_PUBLIC_CLAUDE_API_KEY

  if (!apiKey) {
    // Demo mode — simulate a helpful response when no API key is set
    return simulateResponse(messages)
  }

  const formatted = messages.map(m => ({
    role: m.role,
    content: m.content,
  }))

  try {
    const res = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type':         'application/json',
        'x-api-key':            apiKey,
        'anthropic-version':    '2023-06-01',
      },
      body: JSON.stringify({
        model:      MODEL,
        max_tokens: 2048,
        system:     SYSTEM_PROMPT,
        messages:   formatted,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('Claude API error:', res.status, err)
      return { type: 'error', content: 'Sorry, I had trouble planning your trip. Please try again.' }
    }

    const data = await res.json()
    const text = data.content?.[0]?.text ?? ''

    return parseClaudeResponse(text)
  } catch (e) {
    console.error('Claude fetch error:', e)
    return { type: 'error', content: 'Connection error. Please check your internet and try again.' }
  }
}

function parseClaudeResponse(text: string): PlannerResponse {
  try {
    const json = JSON.parse(text.trim())

    if (json.type === 'plan' && json.plan) {
      const plan = json.plan as TripPlan
      const hotels = searchHotels(plan.hotelSearch)
      return {
        type:    'plan',
        content: json.message ?? "Here's your personalised trip!",
        plan,
        hotels,
      }
    }

    if (json.type === 'message') {
      return { type: 'message', content: json.content }
    }

    return { type: 'message', content: text }
  } catch {
    return { type: 'message', content: text }
  }
}

// ── Demo mode (no API key) ────────────────────────────────────────────────────

function simulateResponse(messages: ChatMessage[]): PlannerResponse {
  const count = messages.filter(m => m.role === 'user').length

  if (count === 1) {
    return { type: 'message', content: "I'd love to help plan your Balkans adventure! How long are you thinking of travelling, and is this just you or are you bringing anyone along?" }
  }
  if (count === 2) {
    return { type: 'message', content: "Perfect! And what's your travel vibe — more romantic and relaxing, or adventure and sightseeing? Any must-sees like lakes, old towns, or beaches?" }
  }
  if (count === 3) {
    return { type: 'message', content: "Love it. One last thing — roughly what budget are you thinking per night for accommodation? Budget (under €70), mid-range (€70–€150), or splash out (€150+)?" }
  }

  // Generate a demo plan
  const plan: TripPlan = {
    title: '5-Day Ohrid & Lake Escape',
    summary: 'A romantic getaway to Lake Ohrid — one of Europe\'s oldest and deepest lakes, with UNESCO-listed old town, crystal water, and stunning sunsets.',
    destination: 'Ohrid',
    duration: 5,
    estimatedBudget: { perPersonPerNight: 85, currency: 'EUR', tier: 'mid' },
    days: [
      { day: 1, title: 'Arrival & Old Town', description: 'Settle in and explore the winding streets of Ohrid Old Town.', activities: [{ name: 'Church of St. John at Kaneo', description: 'Iconic clifftop church with lake views — best at sunset.', duration: '1 hour', type: 'sightseeing' }, { name: 'Old Town walk', description: 'Cobbled streets, local shops, and Plaošnik Basilica.', duration: '2 hours', type: 'culture' }], meals: ['Breakfast at hotel', 'Dinner at Restaurant Letna Bavča Kaneo'] },
      { day: 2, title: 'Lake Day', description: 'Spend the day on and around the lake.', activities: [{ name: 'Boat trip to Sveti Naum', description: 'Scenic 1-hour boat ride to a beautiful monastery at the lake\'s south end.', duration: '4 hours', type: 'adventure' }, { name: 'Swimming at Lagadin beach', description: 'Crystal clear lake water.', duration: '2 hours', type: 'relaxation' }], meals: ['Breakfast at hotel', 'Lunch at Sveti Naum', 'Dinner in town'] },
      { day: 3, title: 'Culture & History', description: 'Dive into Ohrid\'s rich cultural heritage.', activities: [{ name: 'Ohrid Fortress', description: 'Ancient fortress with panoramic lake and mountain views.', duration: '1.5 hours', type: 'sightseeing' }, { name: 'National Museum', description: 'Ohrid\'s history from antiquity to the present.', duration: '1 hour', type: 'culture' }], meals: ['Breakfast at hotel', 'Café lunch in Old Town', 'Dinner at local taverna'] },
      { day: 4, title: 'Day Trip to Bitola', description: 'Explore Macedonia\'s second city and the ancient Heraclea Lyncestis ruins.', activities: [{ name: 'Heraclea Lyncestis', description: 'Remarkably preserved Roman ruins — mosaics still intact.', duration: '2 hours', type: 'culture' }, { name: 'Shirok Sokak', description: 'Bitola\'s elegant pedestrian boulevard with Ottoman and Austro-Hungarian architecture.', duration: '1.5 hours', type: 'sightseeing' }], meals: ['Early breakfast', 'Lunch in Bitola', 'Dinner back in Ohrid'] },
      { day: 5, title: 'Final Morning & Departure', description: 'A relaxed final morning before heading home.', activities: [{ name: 'Sunrise at the lake', description: 'The light on Lake Ohrid in the morning is unforgettable.', duration: '1 hour', type: 'relaxation' }, { name: 'Local market', description: 'Pick up Ohrid pearls and local honey.', duration: '1 hour', type: 'culture' }], meals: ['Hotel breakfast', 'Light lunch before departure'] },
    ],
    hotelSearch: { destination: 'ohrid', checkin: '2026-08-10', checkout: '2026-08-15', guests: 2, maxPricePerNight: 120, currency: 'EUR', vibe: 'romantic' },
    tips: ['Book the Sveti Naum boat trip in advance in summer — it fills up fast.', 'Ohrid gets busy in July and August — consider arriving Sunday evening for quieter Old Town access.', 'The local specialty is Ohrid trout (pastrmka) — try it at a lakeside restaurant.'],
  }

  const hotels = searchHotels(plan.hotelSearch)
  return { type: 'plan', content: "Here's your personalised 5-day Ohrid escape! I've also found some great hotels that match your vibe. What do you think — shall we adjust anything?", plan, hotels }
}
