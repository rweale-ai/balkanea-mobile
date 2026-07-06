import type { ChatMessage, PlannerResponse, HotelSearchParams } from './types'
import { searchHotelsSync } from './hotels'
import { fetchAllKnowledge } from './knowledge'
import { getTravelProfile, saveTravelProfile } from './travel-profile'

// ── System prompts ─────────────────────────────────────────────────

const BASE_SYSTEM_PROMPT = `You are Nea, the AI travel advisor for Balkanea — a travel booking platform for Balkan locals travelling internationally. You speak fluent Macedonian and English. Your customers are primarily from North Macedonia.

Your goal is to be the most knowledgeable travel advisor for the Balkans. You combine Balkanea's private insider knowledge (below) with real-time information from the web to give customers advice no booking platform can match.

## Your strengths
- You narrow thousands of options to 3-5 curated picks
- You answer questions like "Is this area of Paris safe?" with confidence
- You help people who say "I have €1,000 and want to go to Italy — where?"
- You search for and summarise real guest reviews when asked about a specific hotel
- You make customers feel comfortable when they're unsure about booking online
- You reply in the same language the user writes in (Macedonian or English)

## Conversation approach
- Be warm, enthusiastic, and knowledgeable — like a trusted friend who has been everywhere
- Ask one or two questions at a time, never a long list
- Keep responses concise — this is a mobile app
- Popular outbound destinations from the Balkans: Greece (Santorini, Athens, Thessaloniki), Turkey (Istanbul, Antalya), Italy (Rome, Amalfi), Croatia (Dubrovnik, Split), Montenegro (Kotor, Budva), Egypt (Hurghada), France (Paris), Spain (Barcelona)

## Using web search
When a user asks about hotel reviews, what guests think about a hotel, needs current information (events, prices, visa requirements), or is planning an itinerary (restaurants, tours, sights), use web_search to find it. Search for "[hotel name] reviews TripAdvisor", "[hotel name] guest reviews", or "[restaurant/tour name] [city]". Synthesise what you find into a clear, honest answer. You may search up to 3 times per response.

## Formatting your replies
- Never use markdown bold (**text**). Instead prefix each restaurant, tour, or sight name with one relevant emoji so it's easy to scan on mobile: 🍽️ restaurants, 🎟️ tours/activities, 📍 landmarks/sights, 🏖️ beaches, 🎭 museums/culture.
- When web_search finds a real website for a specific restaurant, tour, or attraction, link it inline as markdown: [Name](https://...). Only link URLs you actually found via web_search — never invent one.

## If the traveler has already booked a hotel
If a message says they've already booked, or gives a confirmation code, do NOT ask which hotel they want or try to search for hotels — that decision is made. Focus entirely on itinerary planning: restaurants, sights, tours, day-by-day plans.

## Gathering info before searching for hotels
1. Destination (or help them decide)
2. When / how long
3. How many people
4. Budget feel (budget / mid-range / luxury)
5. Any preferences (beach, city, all-inclusive, etc.)
If any of this is already given under "Known traveler details" below, do NOT ask for it again — use it directly and only ask about what's still missing.

## When you have enough info to search for hotels:
Write your reply naturally — 2-3 warm sentences. Then on its own line:
---HOTELS---
{"destination":"santorini","checkin":"YYYY-MM-DD","checkout":"YYYY-MM-DD","adults":2,"children":0,"rooms":1,"maxPricePerNight":150,"currency":"EUR"}

## If still gathering info: just write your reply, no marker.

## If the customer wants a human agent or request is too complex:
Write a warm handoff message, then on its own line:
---ESCALATE---

Never include markers mid-sentence. They appear on their own line at the very end.`

const FEEDBACK_SYSTEM_PROMPT = `You are Nea, the AI travel advisor for Balkanea. A customer has just returned from a trip and you are collecting feedback to help future travellers.

Your job: have a warm, natural conversation to understand their experience. Aim for 3-5 questions maximum. Ask about:
1. Overall impression — what they loved
2. Any disappointments or surprises
3. Specific details that would help future guests (room tips, restaurant recommendations, things to avoid)
4. Who they would recommend this hotel to

Keep it conversational and friendly. Thank them warmly for sharing. Once you have enough feedback (at least 3 exchanges), end your final message with:
---FEEDBACK---
{"hotel":"[hotel name]","destination":"[destination]","positives":"[what guests loved]","negatives":"[issues or disappointments, or null]","highlights":"[specific tips for future guests]","recommended_for":"[type of traveller this suits]","rating":[1-5]}

The JSON must be valid and on one line immediately after the marker.`

// ── API config ─────────────────────────────────────────────────────

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'
// Sonnet 4.6: supports web search, better reasoning for review synthesis
const MODEL = 'claude-sonnet-4-6'

// Using the widely-supported basic variant — no beta header required
const WEB_SEARCH_TOOLS = [
  { type: 'web_search_20250305', name: 'web_search' },
]

// ── Main send function ─────────────────────────────────────────────

export async function sendMessage(
  messages: ChatMessage[],
  onToken: (token: string) => void,
  language: 'mk' | 'en' = 'en',
): Promise<PlannerResponse> {
  const apiKey = process.env.EXPO_PUBLIC_CLAUDE_API_KEY
  if (!apiKey) return simulateResponse(messages, onToken)

  const knowledge = await fetchAllKnowledge()
  const langInstruction = language === 'mk'
    ? '\n\n## LANGUAGE\nThe user has selected Macedonian. ALWAYS reply in Macedonian (Cyrillic script) regardless of what language the user types in.'
    : '\n\n## LANGUAGE\nAlways reply in English.'

  const profile = getTravelProfile()
  const profileInstruction = Object.keys(profile).length > 0
    ? `\n\n## Known traveler details (from a previous conversation — do not ask for these again)\n${JSON.stringify(profile)}`
    : ''

  const system = `${BASE_SYSTEM_PROMPT}${langInstruction}${profileInstruction}${knowledge ? `\n\n${knowledge}` : ''}`

  const result = await runMessageLoop(apiKey, system, messages, onToken, WEB_SEARCH_TOOLS)
  if (result.type === 'hotels' && result.searchParams) {
    saveTravelProfile(result.searchParams)
  }
  return result
}

// Feedback conversation — different system prompt, no hotel search tools
export async function sendFeedbackMessage(
  messages: ChatMessage[],
  onToken: (token: string) => void,
): Promise<PlannerResponse> {
  const apiKey = process.env.EXPO_PUBLIC_CLAUDE_API_KEY
  if (!apiKey) {
    // Simulate a feedback response in demo mode
    const reply = "Thank you so much for sharing! Your experience will help future travellers make the perfect choice. The Balkanea team will review your feedback and use it to guide others."
    for (let i = 0; i < reply.length; i += 2) {
      onToken(reply.slice(i, i + 2))
      await new Promise<void>(r => setTimeout(r, 16))
    }
    return { type: 'message', content: reply }
  }

  return runMessageLoop(apiKey, FEEDBACK_SYSTEM_PROMPT, messages, onToken, [])
}

// ── Core streaming loop ────────────────────────────────────────────

// Handles pause_turn from web search by looping up to 5 iterations.
async function runMessageLoop(
  apiKey: string,
  system: string,
  userMessages: ChatMessage[],
  onToken: (token: string) => void,
  tools: object[],
): Promise<PlannerResponse> {
  // Filter out empty-content messages — these cause 400 errors from the API
  // and can cascade if a previous request failed mid-stream
  const formatted: object[] = userMessages
    .filter(m => m.content && m.content.trim().length > 0)
    .map(m => ({ role: m.role, content: m.content }))

  // Ensure messages alternate roles properly (Claude requirement)
  const deduplicated: object[] = []
  for (const msg of formatted) {
    const last = deduplicated[deduplicated.length - 1] as any
    if (last && last.role === (msg as any).role) {
      // Merge consecutive same-role messages
      last.content += '\n' + (msg as any).content
    } else {
      deduplicated.push({ ...(msg as any) })
    }
  }

  let conversationMessages = deduplicated
  let fullText = ''

  for (let iteration = 0; iteration < 5; iteration++) {
    const result = await streamOnce(
      apiKey, system, conversationMessages, onToken, tools, iteration === 0,
    )
    fullText += result.text

    if (result.stopReason !== 'pause_turn') break

    // Web search needed more iterations — continue with accumulated content
    conversationMessages = [
      ...conversationMessages,
      { role: 'assistant', content: result.rawContent },
    ]
  }

  return parseStreamedResponse(fullText)
}

interface StreamResult {
  text: string
  stopReason: string
  rawContent: object[]
}

async function streamOnce(
  apiKey: string,
  system: string,
  messages: object[],
  onToken: (token: string) => void,
  tools: object[],
  isFirstIteration: boolean,
): Promise<StreamResult> {
  let res: Response
  try {
    // Cache the system prompt (knowledge base + language instruction) for 5 min.
    // Cached tokens cost 10% and process near-instantly, reducing rate limit pressure.
    const cachedSystem = [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }]

    const body: Record<string, unknown> = {
      model: MODEL,
      max_tokens: 2048,
      stream: true,
      system: cachedSystem,
      messages,
    }
    if (tools.length > 0) body.tools = tools

    res = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-beta': 'prompt-caching-2024-07-31',
      },
      body: JSON.stringify(body),
    })
  } catch {
    return { text: 'Connection error. Please check your internet and try again.', stopReason: 'error', rawContent: [] }
  }

  if (!res.ok || !res.body) {
    const errBody = await res.text().catch(() => '')
    console.error(`[Nea] API error ${res.status}:`, errBody)
    return { text: 'Sorry, I had trouble with that. Please try again.', stopReason: 'error', rawContent: [] }
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let text = ''
  let stopReason = 'end_turn'

  // Track all content blocks for pause_turn continuation
  const rawContent: Record<string, unknown>[] = []
  let currentBlockIndex = -1

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

          if (event.type === 'content_block_start') {
            currentBlockIndex = event.index
            rawContent[event.index] = { ...event.content_block }
          }

          if (event.type === 'content_block_delta') {
            if (event.delta?.type === 'text_delta') {
              const token: string = event.delta.text
              text += token
              // Only stream tokens on first iteration to avoid confusing the UI during web search
              if (isFirstIteration) onToken(token)
              const block = rawContent[event.index]
              if (block) {
                block.text = ((block.text as string) ?? '') + token
              }
            }
          }

          if (event.type === 'message_delta') {
            stopReason = event.delta?.stop_reason ?? 'end_turn'
          }
        } catch { /* skip malformed SSE lines */ }
      }
    }
  } finally {
    reader.releaseLock()
  }

  return { text, stopReason, rawContent }
}

// ── Response parser ────────────────────────────────────────────────

function parseStreamedResponse(text: string): PlannerResponse {
  const hotelMarker = '---HOTELS---'
  const escalateMarker = '---ESCALATE---'
  const feedbackMarker = '---FEEDBACK---'

  const escalateIdx = text.indexOf(escalateMarker)
  if (escalateIdx !== -1) {
    const prose = text.slice(0, escalateIdx).trim()
    return { type: 'escalation', content: prose || "I'll connect you with a Balkanea agent who can help." }
  }

  const feedbackIdx = text.indexOf(feedbackMarker)
  if (feedbackIdx !== -1) {
    const prose = text.slice(0, feedbackIdx).trim()
    const jsonStr = text.slice(feedbackIdx + feedbackMarker.length).trim()
    try {
      const data = JSON.parse(jsonStr)
      return { type: 'feedback', content: prose, feedbackData: data }
    } catch {
      return { type: 'message', content: prose }
    }
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
      return { type: 'message', content: prose }
    }
  }

  return { type: 'message', content: text.trim() }
}

// ── Demo mode ──────────────────────────────────────────────────────

async function simulateResponse(
  messages: ChatMessage[],
  onToken: (token: string) => void,
): Promise<PlannerResponse> {
  const reply = buildSimulatedReply(messages)
  const prose = reply.content
  for (let i = 0; i < prose.length; i += 2) {
    onToken(prose.slice(i, i + 2))
    await new Promise<void>(r => setTimeout(r, 16))
  }
  if (reply.type === 'hotels' && reply.searchParams) {
    saveTravelProfile(reply.searchParams)
  }
  return reply
}

function buildSimulatedReply(messages: ChatMessage[]): PlannerResponse {
  const count = messages.filter(m => m.role === 'user').length
  const lastMsg = messages[messages.length - 1]?.content?.toLowerCase() ?? ''

  if (lastMsg.includes('speak to') || lastMsg.includes('human') || lastMsg.includes('agent')) {
    return { type: 'escalation', content: "Of course! I'll connect you with a Balkanea travel agent. During business hours they can take your call directly. Otherwise, I'll take your details and they'll call you back within a few hours." }
  }
  if (count === 1) return { type: 'message', content: "I'd love to help you find the perfect getaway! Where are you thinking of going? Popular spots from Macedonia right now are Greece, Turkey, Italy, and Croatia — or I can help you decide if you're not sure yet." }
  if (count === 2) return { type: 'message', content: "Great choice! When are you thinking of going, and how many of you will be travelling? Most of our customers travel as couples or families of 3-4." }
  if (count === 3) return { type: 'message', content: "Perfect! And roughly what budget are you thinking per night? Budget (under €70), mid-range (€70–€150), or treat yourself (€150+)?" }

  const searchParams: HotelSearchParams = {
    destination: 'santorini', checkin: '2026-08-10', checkout: '2026-08-15',
    adults: 2, children: 0, rooms: 1, maxPricePerNight: 200, currency: 'EUR',
  }
  return {
    type: 'hotels',
    content: "Here are my top picks for Santorini! I've chosen hotels with great views and breakfast included, all within your budget. What do you think — shall I adjust anything?",
    hotels: searchHotelsSync(searchParams),
    searchParams,
  }
}
