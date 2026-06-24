@AGENTS.md

# Balkanea Mobile App

## What this is
AI-first outbound hotel booking app for Balkan locals travelling internationally. Expo SDK 56 + Expo Router. Runs on iOS, Android, and web (localhost:8081 = `npx expo start --web`).

## Stack
- Expo SDK 56 + Expo Router (file-based, `app/` directory)
- React Native 0.85 + react-native-web for web target
- Claude haiku-4-5 — Bea text travel advisor
- Retell AI — Bea voice travel advisor
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
- **English (Bea EN):** agent_88718b83329c3417f0b1dce5b5 | LLM: llm_430bff8cc2cd3159ff96c0ec8fd3
- **Macedonian (Bea MK):** agent_4eff660016ae3f4aaa688f1742 | LLM: llm_365990f1ab000ebb38fdc34b7100
- Voice works on web (WebRTC). Native has polyfill + graceful error handling.

## Current state (June 2026)
- **Search tab:** Bea chat UI with hotel search. Natural language or voice — Bea finds hotels, shows results as cards, allows booking.
- **Explore tab:** 15 outbound destinations (Greece, Turkey, Italy, Croatia, Montenegro, Egypt, France, Spain, Czech Republic, North Macedonia). Category filtering, search, hero card + grid.
- **Dashboard tab:** Booking management — upcoming/past bookings, confirmation codes, cancellation.
- **Hotel Detail:** Full hotel info, room selection, book button.
- **Booking Flow:** Guest details form → simulated payment → booking confirmation → Salesforce sync.
- **Agent Escalation:** In Bea chat, escalation triggers agent contact options.
- **Voice:** VoiceButton + VoiceHUD, web-only (WebRTC). Native has graceful fallback.
- **Locale:** 11 countries, 9 currencies, scrollable selector modal.
- **Salesforce:** Leads + bookings sync to balkaneacrm-dev-ed via balkanea-lead-webhook backend.

## Key files
- `app/(tabs)/index.tsx` — search/chat screen (Bea text + voice + hotel results)
- `app/(tabs)/explore.tsx` — destination discovery (outbound-focused)
- `app/(tabs)/trips.tsx` — dashboard (bookings list)
- `app/(tabs)/_layout.tsx` — tab config
- `app/hotel-detail.tsx` — hotel detail with room selection
- `app/booking.tsx` — booking form + simulated payment
- `app/booking-confirmed.tsx` — booking confirmation screen
- `lib/claude.ts` — Claude API client + demo simulation (Bea advisor)
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
