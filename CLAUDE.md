@AGENTS.md

# Balkanea Mobile App

## What this is
AI-first outbound hotel booking app for Balkan locals travelling internationally. Expo SDK 56 + Expo Router. Runs on iOS, Android, and web (localhost:8081 = `npx expo start --web`).

## Stack
- Expo SDK 56 + Expo Router (file-based, `app/` directory)
- React Native 0.85 + react-native-web for web target
- Claude haiku-4-5 — Nea text travel advisor
- Retell AI — Nea voice travel advisor
- RateHawk — hotel search (simulated until sandbox creds activate; backend at balkanea-lead-webhook)
- Salesforce CRM — lead/booking sync via balkanea-lead-webhook backend
- AsyncStorage — booking persistence (local, pre-Supabase)
- expo-linear-gradient, expo-blur, @expo/vector-icons — premium UI

## Design System
- Premium design system in `constants/theme.ts`: Colors, Typography, Shadows, Gradients, Spacing, Radius
- All components use theme tokens — no hardcoded colors/fonts
- LinearGradient used for buttons, card overlays, headers, avatars
- Ionicons for tab bar and UI icons

## Retell voice agents (Balkanea workspace)
- **API key:** stored in Vercel env / set locally as `EXPO_PUBLIC_RETELL_API_KEY` in .env
- **English (Nea EN):** agent_88718b83329c3417f0b1dce5b5 | LLM: llm_430bff8cc2cd3159ff96c0ec8fd3 — isolated conversational persona, only tool is `end_call`. Safe to edit for mobile-only changes.
- **Macedonian (Nea MK):** agent_4eff660016ae3f4aaa688f1742 | LLM: llm_365990f1ab000ebb38fdc34b7100 — **CAUTION (found 2026-07-05): this LLM's `general_prompt` is actually the live balkanea-lead-webhook website chatbot** (tools call `balkanea-lead-webhook.vercel.app/api/search-hotels` and `/api/create-lead` directly, prompt is English-language lead-capture flow, not a Macedonian voice persona). Do not edit its prompt for mobile-app-only changes without confirming with Ray first — it likely affects balkanea.com's live chat widget too. The mobile app may need its own dedicated MK voice LLM.
- Voice uses `retell-client-js-sdk` (built on browser-only `livekit-client`). On native, `lib/voice.ts` registers `@livekit/react-native` + `@livekit/react-native-webrtc` (not vanilla `react-native-webrtc`) and explicitly starts/stops an `AudioSession` around each call — required for the local mic track to actually publish on iOS (remote audio playback works without it, mic capture doesn't).
- `startVoiceCall(lang, handlers, tripContext?)` passes `tripContext` as a Retell `retell_llm_dynamic_variables.trip_context` value, interpolated into the EN prompt via `{{trip_context}}` — lets a voice call pick up where a text conversation left off instead of re-asking known details.

## Current state (June 2026)
- **Search tab:** Nea chat UI with hotel search. Natural language or voice — Nea finds hotels, shows results as cards, allows booking.
- **Explore tab:** 15 outbound destinations (Greece, Turkey, Italy, Croatia, Montenegro, Egypt, France, Spain, Czech Republic, North Macedonia). Category filtering, search, hero card + grid.
- **Dashboard tab:** Booking management — upcoming/past bookings, confirmation codes, cancellation.
- **Hotel Detail:** Full hotel info, room selection, book button.
- **Booking Flow:** Guest details form → simulated payment → booking confirmation → Salesforce sync.
- **Agent Escalation:** In Nea chat, escalation triggers agent contact options.
- **Voice:** VoiceButton + VoiceHUD, web-only (WebRTC). Native has graceful fallback.
- **Locale:** 11 countries, 9 currencies, scrollable selector modal.
- **Salesforce:** Leads + bookings sync to balkaneacrm-dev-ed via balkanea-lead-webhook backend.

## Key files
- `app/(tabs)/index.tsx` — search/chat screen (Nea text + voice + hotel results)
- `app/(tabs)/explore.tsx` — destination discovery (outbound-focused)
- `app/(tabs)/trips.tsx` — dashboard (bookings list)
- `app/(tabs)/_layout.tsx` — tab config
- `app/hotel-detail.tsx` — hotel detail with room selection
- `app/booking.tsx` — booking form + simulated payment
- `app/booking-confirmed.tsx` — booking confirmation screen
- `lib/claude.ts` — Claude API client + demo simulation (Nea advisor)
- `lib/voice.ts` — Retell web client wrapper (startVoiceCall / stopVoiceCall)
- `lib/hotels.ts` — RateHawk-shaped hotel search (simulated + backend API call)
- `lib/types.ts` — Hotel, Booking, Destination, ChatMessage, HotelSearchParams types
- `lib/destinations.ts` — 15 outbound destinations with categories, ratings, regionIds
- `lib/bookings-store.ts` — AsyncStorage-backed booking persistence
- `lib/salesforce.ts` — Salesforce CRM integration (leads, escalations, booking sync)
- `lib/locale.ts` — 11 countries, 9 currencies
- `lib/explore-intent.ts` — cross-tab intent passing
- `components/VoiceButton.tsx` — animated gradient mic button
- `components/VoiceHUD.tsx` — Iron Man-style call overlay
- `components/LocaleSelector.tsx` — country/currency picker
- `components/planner/ChatBubble.tsx` — gradient message bubble
- `components/planner/HotelCard.tsx` — hotel result card with image, rating, amenities, book CTA
- `components/explore/DestinationCard.tsx` — image card with gradient overlay
- `components/explore/SearchBar.tsx` — search input with clear
- `constants/theme.ts` — Colors, Typography, Shadows, Gradients, Spacing, Radius

## Backend (balkanea-lead-webhook)
- **URL:** https://balkanea-lead-webhook.vercel.app
- **POST /api/create-lead** — Salesforce lead creation
- **POST /api/search-hotels** — RateHawk hotel search (simulated until creds activate)
- **Salesforce org:** balkaneacrm-dev-ed.develop.my.salesforce.com

## Env vars (EXPO_PUBLIC_ prefix = available in client)
- `EXPO_PUBLIC_CLAUDE_API_KEY` — Claude API key (omit for demo mode)
- `EXPO_PUBLIC_RETELL_API_KEY` — Retell key (defaults to workspace key in lib/voice.ts)
- `EXPO_PUBLIC_RETELL_AGENT_EN` — English agent ID
- `EXPO_PUBLIC_RETELL_AGENT_MK` — Macedonian agent ID

## Hard rules
- Retell API key in client is acceptable for sandbox/demo only. Must move to backend proxy before App Store submission.
- Voice is web-only until tested on device with dev build. VoiceButton renders on all platforms; lib/voice.ts has graceful error handling for native.
- Never commit .env files.
- Use `StyleSheet.absoluteFill` not `StyleSheet.absoluteFillObject` (RN 0.85).

## Next up
- Supabase auth + real user accounts
- Real RateHawk hotel search once sandbox credentials activate
- Stripe payments (replacing simulated payment)
- Macedonian localization (full UI translation)
- Push notifications (Expo Notifications)
- App Store submission

## Design references
- New screens are specced in `design/Balkanea — Build Brief.md`, with a working visual/behavior reference in `design/Balkanea Prototype.dc.html` (open in a browser). Original SOW: `design/uploads/design-brief.md`.
- Design tokens are canonical in `constants/theme.ts` — never hardcode colors, spacing, radii, or type sizes.
- All copy via `useLang()` / `t.*` — no hardcoded strings. MK (Cyrillic, default) + EN both required.
- Prototype caveats for real RN: imagery = placeholder gradients (wire real photos), icons = inline SVG (use Ionicons), keyboard = simulated (use native `KeyboardAvoidingView`). Chat behavior: typing raises the keyboard, sending dismisses it to free reading space, tapping the input raises it again.
- Don't add screens/sections/content not in the brief — ask first.
