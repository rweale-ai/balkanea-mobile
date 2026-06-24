import type { ChatMessage, PlannerResponse, HotelSearchParams } from './types'
import { searchHotelsSync } from './hotels'

const SYSTEM_PROMPT = `You are Bea, the AI travel advisor for Balkanea — a travel booking platform for Balkan locals travelling internationally. You speak fluent Macedonian and English. Your customers are primarily from North Macedonia.

Your job is to understand what the traveller wants and help them find the perfect hotel. You're like a knowledgeable friend who has been everywhere — you give personal recommendations, not a list of 10,000 results.

## Your strengths (why customers choose you over Booking.com)
- You narrow thousands of options to 3-5 curated picks
- You answer questions like "Is this area of Paris safe?" with confidence
- You help people who say "I have €1,000 and want to go to Italy — where?"
- You make customers feel comfortable when they're unsure about booking online

## Conversation approach
- Be warm, enthusiastic, and knowledgeable
- Ask one or two questions at a time, not a long list
- Keep responses concise — this is a mobile app
- Popular destinations from the Balkans: Greece (Santorini, Athens, Thessaloniki), Turkey (Istanbul, Antalya), Italy (Rome), Croatia (Dubrovnik, Split), Montenegro (Kotor, Budva), Egypt (Hurghada), France (Paris), Spain (Barcelona)

## You need to gather:
1. Where they want to go (or help them decide if unsure — suggest popular outbound destinations)
2. When / how long (dates or just duration)
3. How many people (2-4 travellers = 60-80% of bookings — families or couples)
4. Budget feel (budget / mid-range / luxury) — don't ask for exact numbers
5. Any preferences (beach, city, all-inclusive, near centre, etc.)

## When you have enough information, respond with ONLY valid JSON:
{
  "type": "hotels",
  "message": "Here are my top picks for you...",
  "search": {
    "destination": "santorini",
    "checkin": "YYYY-MM-DD",
    "checkout": "YYYY-MM-DD",
    "adults": 2,
    "children": 0,
    "rooms": 1,
    "maxPricePerNight": 150,
    "currency": "EUR"
  }
}

## If you're still gathering info, respond with ONLY valid JSON:
{ "type": "message", "content": "Your response here..." }

## If the customer asks to speak with a human or you can't help:
{ "type": "escalation", "content": "I'll connect you with a Balkanea agent who can help..." }

Always respond with valid JSON only. No markdown, no extra text.`

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-haiku-4-5-20251001'

export async function sendMessage(messages: ChatMessage[]): Promise<PlannerResponse> {
  const apiKey = process.env.EXPO_PUBLIC_CLAUDE_API_KEY
  if (!apiKey) return simulateResponse(messages)

  const formatted = messages.map(m => ({ role: m.role, content: m.content }))

  try {
    const res = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: formatted,
      }),
    })

    if (!res.ok) {
      console.error('Claude API error:', res.status)
      return { type: 'error', content: 'Sorry, I had trouble with that. Please try again.' }
    }

    const data = await res.json()
    const text = data.content?.[0]?.text ?? ''
    return parseResponse(text)
  } catch (e) {
    console.error('Claude fetch error:', e)
    return { type: 'error', content: 'Connection error. Please check your internet and try again.' }
  }
}

function parseResponse(text: string): PlannerResponse {
  try {
    const json = JSON.parse(text.trim())

    if (json.type === 'hotels' && json.search) {
      const searchParams: HotelSearchParams = {
        destination: json.search.destination,
        checkin: json.search.checkin,
        checkout: json.search.checkout,
        adults: json.search.adults ?? 2,
        children: json.search.children ?? 0,
        rooms: json.search.rooms ?? 1,
        maxPricePerNight: json.search.maxPricePerNight,
        currency: json.search.currency ?? 'EUR',
      }
      const hotels = searchHotelsSync(searchParams)
      return {
        type: 'hotels',
        content: json.message ?? "Here are my top picks for you!",
        hotels,
        searchParams,
      }
    }

    if (json.type === 'escalation') {
      return { type: 'escalation', content: json.content }
    }

    if (json.type === 'message') {
      return { type: 'message', content: json.content }
    }

    return { type: 'message', content: text }
  } catch {
    return { type: 'message', content: text }
  }
}

function simulateResponse(messages: ChatMessage[]): PlannerResponse {
  const count = messages.filter(m => m.role === 'user').length
  const lastMsg = messages[messages.length - 1]?.content?.toLowerCase() ?? ''

  if (lastMsg.includes('speak to') || lastMsg.includes('human') || lastMsg.includes('agent') || lastMsg.includes('help me')) {
    return { type: 'escalation', content: "Of course! I'll connect you with a Balkanea travel agent. During business hours they can take your call directly. Otherwise, I'll take your details and they'll call you back within a few hours." }
  }

  if (count === 1) {
    return { type: 'message', content: "I'd love to help you find the perfect getaway! Where are you thinking of going? Popular spots from Macedonia right now are Greece, Turkey, Italy, and Croatia — or I can help you decide if you're not sure yet." }
  }
  if (count === 2) {
    return { type: 'message', content: "Great choice! When are you thinking of going, and how many of you will be travelling? Most of our customers travel as couples or families of 3-4." }
  }
  if (count === 3) {
    return { type: 'message', content: "Perfect! And roughly what budget are you thinking per night? Budget (under €70), mid-range (€70–€150), or treat yourself (€150+)?" }
  }

  const searchParams: HotelSearchParams = {
    destination: 'santorini',
    checkin: '2026-08-10',
    checkout: '2026-08-15',
    adults: 2,
    children: 0,
    rooms: 1,
    maxPricePerNight: 200,
    currency: 'EUR',
  }

  const hotels = searchHotelsSync(searchParams)
  return {
    type: 'hotels',
    content: "Here are my top picks for Santorini! I've chosen hotels with great views and breakfast included, all within your budget. What do you think — shall I adjust anything?",
    hotels,
    searchParams,
  }
}
