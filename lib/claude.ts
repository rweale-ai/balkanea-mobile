import type { ChatMessage, PlannerResponse, HotelSearchParams } from './types'
import { mapBackendHotels } from './hotels'
import { getTravelProfile, saveTravelProfile } from './travel-profile'
import { describeBookings } from './bookings-store'
import type { ItineraryItemDraft, ItineraryItemType } from './itinerary-store'
import { BACKEND_URL } from './backend-url'
import { ratehawkHeaders } from './ratehawk-env'
import { getCurrency } from './currency'

// Nea -- every call goes through the Chat backend (/api/nea-chat), which
// holds the Anthropic key and owns every prompt (Chat lib/nea.js,
// lib/nea-prompts.js). Until 2026-09-28 this file called api.anthropic.com
// directly with EXPO_PUBLIC_CLAUDE_API_KEY, which Expo bakes into the app
// bundle -- anyone could extract it. The app now sends only structured
// fields: kind, language, the (capped) conversation, and a few context
// values. No code path here talks to Claude directly.
//
// Hotel search is a real server-side tool now (it used to be a
// ---HOTELS--- marker parsed here): the backend runs it in-process with this
// request's X-Ratehawk-Env (sandbox for the app) and returns the raw results,
// shaped below by the same mapBackendHotels() as direct searches.

type Language = 'mk' | 'en'
type Kind = 'chat' | 'hotel' | 'topic' | 'feedback'

const NEA_URL = `${BACKEND_URL}/api/nea-chat`

// Backend caps: 40 messages, 8,000 chars each, 60,000 total. Keep the most
// recent turns that fit so long chats degrade gracefully instead of 400ing.
function toWireMessages(messages: ChatMessage[]): Array<{ role: 'user' | 'assistant'; content: string }> {
  const cleaned = messages
    .filter(m => m.content && m.content.trim().length > 0)
    .map(m => ({ role: m.role, content: m.content.trim().slice(0, 8000) }))
  const out: typeof cleaned = []
  let total = 0
  for (let i = cleaned.length - 1; i >= 0 && out.length < 40; i--) {
    total += cleaned[i].content.length
    if (total > 60000) break
    out.unshift(cleaned[i])
  }
  while (out.length && out[0].role !== 'user') out.shift()
  return out
}

function errorText(language: Language, kind: 'generic' | 'connection' | 'unavailable'): string {
  if (kind === 'connection') {
    return language === 'mk'
      ? 'Проблем со врската. Проверете го интернетот и обидете се повторно.'
      : 'Connection error. Please check your internet and try again.'
  }
  if (kind === 'unavailable') {
    return language === 'mk'
      ? 'Моментално не можам да ја проверам достапноста на хотелите. Обидете се повторно за една минута.'
      : "I couldn't reach live hotel availability right now. Please try again in a minute."
  }
  return language === 'mk'
    ? 'Се појави проблем. Обидете се повторно.'
    : 'Sorry, I had trouble with that. Please try again.'
}

// POSTs one turn and reads the SSE stream: { type:'text' } deltas, then
// { type:'final', response } or { type:'error', content }.
async function streamNea(
  kind: Kind,
  language: Language,
  messages: ChatMessage[],
  context: Record<string, unknown>,
  onToken: (token: string) => void,
): Promise<{ final: any | null; error: string | null }> {
  const wire = toWireMessages(messages)
  if (wire.length === 0) return { final: null, error: errorText(language, 'generic') }

  let res: Response
  try {
    res = await fetch(NEA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...ratehawkHeaders() },
      body: JSON.stringify({ kind, language, messages: wire, context }),
    })
  } catch {
    return { final: null, error: errorText(language, 'connection') }
  }
  if (!res.ok || !res.body) {
    const body = await res.text().catch(() => '')
    console.error(`[Nea] HTTP ${res.status}:`, body.slice(0, 300))
    let message = errorText(language, 'generic')
    try { if (res.status === 429) message = JSON.parse(body).error || message } catch { /* keep default */ }
    return { final: null, error: message }
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  let final: any = null
  let error: string | null = null
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let idx: number
      // SSE events end with a blank line; a network chunk can split one.
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const line = buffer.slice(0, idx).trim()
        buffer = buffer.slice(idx + 2)
        if (!line.startsWith('data: ')) continue
        let ev: any
        try { ev = JSON.parse(line.slice(6)) } catch { continue }
        if (ev.type === 'text') onToken(ev.text)
        else if (ev.type === 'final') final = ev.response
        else if (ev.type === 'error') error = ev.content
      }
    }
  } catch (e) {
    console.error('[Nea] stream error', e)
  }
  return { final, error: final ? null : (error ?? errorText(language, 'generic')) }
}

function toPlannerResponse(final: any, language: Language): PlannerResponse {
  if (final.type === 'hotels') {
    const searchParams = final.searchParams as HotelSearchParams
    // results null = the search itself failed (e.g. a RateHawk sandbox
    // outage) -- say so; never substitute fabricated hotels.
    if (final.results === null || final.unavailable) {
      return { type: 'message', content: final.content || errorText(language, 'unavailable') }
    }
    saveTravelProfile(searchParams)
    return {
      type: 'hotels',
      content: final.content,
      hotels: mapBackendHotels(final.results, final.simulated, searchParams),
      searchParams,
    }
  }
  if (final.type === 'feedback') return { type: 'feedback', content: final.content, feedbackData: final.feedbackData }
  if (final.type === 'escalation') return { type: 'escalation', content: final.content }
  if (final.type === 'error') return { type: 'error', content: final.content }
  return { type: 'message', content: final.content ?? '' }
}

// ── Main Nea planner ───────────────────────────────────────────────

export async function sendMessage(
  messages: ChatMessage[],
  onToken: (token: string) => void,
  language: Language = 'en',
): Promise<PlannerResponse> {
  const { final, error } = await streamNea('chat', language, messages, {
    currency: getCurrency(),
    profile: getTravelProfile(),
    bookings: describeBookings(),
  }, onToken)
  if (!final) return { type: 'error', content: error ?? errorText(language, 'generic') }
  return toPlannerResponse(final, language)
}

// ── "Ask Nea about this hotel" sheet ───────────────────────────────
// The backend grounds answers in RateHawk's own guest reviews for this
// hotel when it has them, labelled separately from web results.

export interface HotelSheetContext {
  hotelId: string
  hotelName: string
  hotelAddress: string
  // Short plain-English trip summary (e.g. "a couple, visiting in May").
  tripSummary?: string
}

export async function sendHotelMessage(
  messages: ChatMessage[],
  onToken: (token: string) => void,
  language: Language,
  hotel: HotelSheetContext,
): Promise<PlannerResponse> {
  const { final, error } = await streamNea('hotel', language, messages, {
    hotelId: hotel.hotelId,
    hotelName: hotel.hotelName,
    hotelAddress: hotel.hotelAddress,
    tripSummary: hotel.tripSummary,
  }, onToken)
  if (!final) return { type: 'error', content: error ?? errorText(language, 'generic') }
  return toPlannerResponse(final, language)
}

// ── Post-trip feedback ─────────────────────────────────────────────

export async function sendFeedbackMessage(
  messages: ChatMessage[],
  onToken: (token: string) => void,
  language: Language = 'en',
): Promise<PlannerResponse> {
  const { final, error } = await streamNea('feedback', language, messages, {}, onToken)
  if (!final) return { type: 'error', content: error ?? errorText(language, 'generic') }
  return toPlannerResponse(final, language)
}

// ── Topic-scoped conversation (restaurants / tours) ──────────────────
//
// Restaurants/tours get their own scoped conversation rather than the main
// planner thread.

export type ItineraryTopic = 'restaurants' | 'tours'

export interface TopicContext {
  hotelName: string
  city: string
  checkin: string
  checkout: string
}

export async function sendTopicMessage(
  messages: ChatMessage[],
  onToken: (token: string) => void,
  topic: ItineraryTopic,
  context: TopicContext,
  language: Language = 'en',
): Promise<PlannerResponse> {
  const { final, error } = await streamNea('topic', language, messages, { topic, ...context }, onToken)
  if (!final) return { type: 'error', content: error ?? errorText(language, 'generic') }
  return toPlannerResponse(final, language)
}

// ── Structured itinerary extraction ───────────────────────────────────
//
// Used by the main planner's "Ask Nea to plan your trip" flow and by the
// topic sheets' "Add to trip" action. Returns dated line items, validated
// here again whatever the backend sends.

const VALID_ITEM_TYPES: ItineraryItemType[] = ['restaurant', 'tour', 'sight', 'note']

export async function extractItineraryItems(
  messages: ChatMessage[],
  language: Language = 'en',
): Promise<ItineraryItemDraft[]> {
  const wire = toWireMessages(messages)
  if (wire.length === 0) return []
  try {
    const res = await fetch(NEA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...ratehawkHeaders() },
      body: JSON.stringify({ kind: 'extract', language, messages: wire }),
    })
    if (!res.ok) return []
    const data = await res.json()
    const raw = Array.isArray(data.items) ? data.items : []
    return raw
      .map((r: Record<string, unknown>): ItineraryItemDraft | null => {
        const title = String(r?.title ?? '').trim().slice(0, 120)
        if (!title) return null
        const type = VALID_ITEM_TYPES.includes(r?.type as ItineraryItemType) ? (r.type as ItineraryItemType) : 'note'
        const date = typeof r?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.date) ? r.date : undefined
        const description = r?.description ? String(r.description).trim().slice(0, 400) : undefined
        return { type, title, description, date }
      })
      .filter((i: ItineraryItemDraft | null): i is ItineraryItemDraft => i !== null)
  } catch {
    return []
  }
}
