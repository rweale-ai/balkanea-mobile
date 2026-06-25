import type { ChatMessage, PlannerResponse, HotelSearchParams } from './types'
import { searchHotelsSync } from './hotels'

// Nea responds conversationally (streamable prose), then optionally ends with
// a delimiter + one-line JSON to trigger hotel search or agent escalation.
// This separates the readable text (streamed token-by-token) from the structured
// action (parsed after the stream closes).
const SYSTEM_PROMPT = `You are Nea, the AI travel advisor for Balkanea — a travel booking platform for Balkan locals travelling internationally. You speak fluent Macedonian and English. Your customers are primarily from North Macedonia.

Your job is to understand what the traveller wants and help them find the perfect hotel. You're like a knowledgeable friend who has been everywhere — you give personal recommendations, not a list of 10,000 results.

## Your strengths (why customers choose you over Booking.com)
- You narrow thousands of options to 3-5 curated picks
- You answer questions like "Is this area of Paris safe?" with confidence
- You help people who say "I have €1,000 and want to go to Italy — where?"
- You make customers feel comfortable when they're unsure about booking online

## Conversation approach
- Be warm, enthusiastic, and knowledgeable — talk like a knowledgeable friend, not a form
- Ask one or two questions at a time, not a long list
- Keep responses concise — this is a mobile app
- Popular destinations from the Balkans: Greece (Santorini, Athens, Thessaloniki), Turkey (Istanbul, Antalya), Italy (Rome, Amalfi), Croatia (Dubrovnik, Split), Montenegro (Kotor, Budva), Egypt (Hurghada), France (Paris), Spain (Barcelona)
- Always reply in the same language the user wrote in (Macedonian or English)

## You need to gather before searching:
1. Where they want to go (or help them decide — suggest popular destinations)
2. When / how long (dates, or just duration like "a week in August")
3. How many people (2-4 travellers = most bookings — families or couples)
4. Budget feel (budget / mid-range / luxury) — don't ask for exact numbers
5. Any preferences (beach, city, all-inclusive, near centre, etc.)

## When you have enough information to search for hotels:
Write your reply naturally — 2-3 warm sentences introducing the results. Then on a new line write exactly the marker and JSON:
---HOTELS---
{"destination":"santorini","checkin":"YYYY-MM-DD","checkout":"YYYY-MM-DD","adults":2,"children":0,"rooms":1,"maxPricePerNight":150,"currency":"EUR"}

Use today's year for dates. If the user only gave a month, pick reasonable dates within that month.

## If still gathering info:
Just write your reply. No marker, no JSON.

## If the customer wants a human agent or the request is too complex:
Write a warm handoff message, then on a new line:
---ESCALATE---

Never include the markers mid-sentence. They must appear on their own line at the very end.`

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-haiku-4-5-20251001'

// onToken is called for each text token as it streams — update UI in real time.
// Returns the final parsed PlannerResponse after the stream closes.
export async function sendMessage(
  messages: ChatMessage[],
  onToken: (token: string) => void,
): Promise<PlannerResponse> {
  const apiKey = process.env.EXPO_PUBLIC_CLAUDE_API_KEY
  if (!apiKey) return simulateResponse(messages, onToken)

  const formatted = messages.map(m => ({ role: m.role, content: m.content }))

  let res: Response
  try {
    res = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        stream: true,
        system: SYSTEM_PROMPT,
        messages: formatted,
      }),
    })
  } catch {
    return { type: 'error', content: 'Connection error. Please check your internet and try again.' }
  }

  if (!res.ok || !res.body) {
    console.error('Claude API error:', res.status)
    return { type: 'error', content: 'Sorry, I had trouble with that. Please try again.' }
  }

  // Read SSE stream, call onToken for each text delta
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let fullText = ''

  try {
    outer: while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const chunk = decoder.decode(value, { stream: true })
      for (const line of chunk.split('\n')) {
        if (!line.startsWith('data: ')) continue
        const payload = line.slice(6).trim()
        if (payload === '[DONE]') break outer
        try {
          const event = JSON.parse(payload)
          if (
            event.type === 'content_block_delta' &&
            event.delta?.type === 'text_delta'
          ) {
            const token: string = event.delta.text
            fullText += token
            onToken(token)
          }
        } catch { /* skip malformed SSE lines */ }
      }
    }
  } finally {
    reader.releaseLock()
  }

  return parseStreamedResponse(fullText)
}

// Parses the completed stream text, splitting on ---HOTELS--- or ---ESCALATE---
function parseStreamedResponse(text: string): PlannerResponse {
  const hotelMarker = '---HOTELS---'
  const escalateMarker = '---ESCALATE---'

  const escalateIdx = text.indexOf(escalateMarker)
  if (escalateIdx !== -1) {
    const prose = text.slice(0, escalateIdx).trim()
    return { type: 'escalation', content: prose || "I'll connect you with a Balkanea agent who can help." }
  }

  const hotelIdx = text.indexOf(hotelMarker)
  if (hotelIdx !== -1) {
    const prose = text.slice(0, hotelIdx).trim()
    const jsonStr = text.slice(hotelIdx + hotelMarker.length).trim()
    try {
      const raw = JSON.parse(jsonStr)
      const searchParams: HotelSearchParams = {
        destination: raw.destination ?? '',
        checkin: raw.checkin ?? '',
        checkout: raw.checkout ?? '',
        adults: raw.adults ?? 2,
        children: raw.children ?? 0,
        rooms: raw.rooms ?? 1,
        maxPricePerNight: raw.maxPricePerNight,
        currency: raw.currency ?? 'EUR',
      }
      const hotels = searchHotelsSync(searchParams)
      return { type: 'hotels', content: prose, hotels, searchParams }
    } catch {
      // JSON parse failed — treat as a plain message
      return { type: 'message', content: prose }
    }
  }

  return { type: 'message', content: text.trim() }
}

// Demo mode: drip simulated reply tokens to match real streaming behaviour.
// Called when no API key is configured.
async function simulateResponse(
  messages: ChatMessage[],
  onToken: (token: string) => void,
): Promise<PlannerResponse> {
  const reply = buildSimulatedReply(messages)
  // Stream the prose portion token-by-token (2 chars / 16ms ≈ prototype speed)
  const prose = reply.content
  for (let i = 0; i < prose.length; i += 2) {
    onToken(prose.slice(i, i + 2))
    await new Promise<void>(r => setTimeout(r, 16))
  }
  return reply
}

function buildSimulatedReply(messages: ChatMessage[]): PlannerResponse {
  const count = messages.filter(m => m.role === 'user').length
  const lastMsg = messages[messages.length - 1]?.content?.toLowerCase() ?? ''

  if (
    lastMsg.includes('speak to') || lastMsg.includes('human') ||
    lastMsg.includes('agent') || lastMsg.includes('help me')
  ) {
    return {
      type: 'escalation',
      content: "Of course! I'll connect you with a Balkanea travel agent. During business hours they can take your call directly. Otherwise, I'll take your details and they'll call you back within a few hours.",
    }
  }

  if (count === 1) {
    return {
      type: 'message',
      content: "I'd love to help you find the perfect getaway! Where are you thinking of going? Popular spots from Macedonia right now are Greece, Turkey, Italy, and Croatia — or I can help you decide if you're not sure yet.",
    }
  }
  if (count === 2) {
    return {
      type: 'message',
      content: "Great choice! When are you thinking of going, and how many of you will be travelling? Most of our customers travel as couples or families of 3-4.",
    }
  }
  if (count === 3) {
    return {
      type: 'message',
      content: "Perfect! And roughly what budget are you thinking per night? Budget (under €70), mid-range (€70–€150), or treat yourself (€150+)?",
    }
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
