@AGENTS.md

# Balkanea Mobile App

## What this is
AI-first Balkans travel app. Expo SDK 56 + Expo Router. Runs on iOS, Android, and web (localhost:8081 = `npx expo start --web`).

## Stack
- Expo SDK 56 + Expo Router (file-based, `app/` directory)
- React Native 0.85 + react-native-web for web target
- Claude haiku-4-5 — text trip planner (Bea)
- Retell AI — voice trip planner (also Bea, same persona)
- RateHawk — hotel search (simulated; real creds pending)
- AsyncStorage — trip persistence
- expo-linear-gradient, expo-blur, @expo/vector-icons — premium UI

## Design System
- Premium design system in `constants/theme.ts`: Colors, Typography, Shadows, Gradients, Spacing, Radius
- All components use theme tokens — no hardcoded colors/fonts
- LinearGradient used for buttons, card overlays, headers, avatars
- Ionicons for tab bar and UI icons (replaced emoji icons)

## Retell voice agents (Balkanea workspace)
- **API key:** stored in Vercel env / set locally as `EXPO_PUBLIC_RETELL_API_KEY` in .env
- **English (Bea EN):** agent_88718b83329c3417f0b1dce5b5 | LLM: llm_430bff8cc2cd3159ff96c0ec8fd3
- **Macedonian (Bea MK):** agent_4eff660016ae3f4aaa688f1742 | LLM: llm_365990f1ab000ebb38fdc34b7100
- Voice works on web (WebRTC). Native has polyfill + graceful error handling.

## Current state (June 2026)
- **Plan tab:** Fully working. Bea chat UI with gradient bubbles, typing indicator, demo mode, trip/hotel cards with premium design.
- **Explore tab:** Full destination grid with 15 destinations, category filtering (beach/mountain/culture/etc.), search bar, hero card + 2-column grid with image overlays. Press → navigates to Plan tab with intent.
- **My Trips tab:** Persistent trip storage (AsyncStorage). Image cards with destination photos, delete, day preview chips. Tap → trip detail screen.
- **Trip Detail:** Full-screen hero image, timeline UI with collapsible day cards, activity icons, tips section, share functionality.
- **Voice:** VoiceButton + VoiceHUD, web-only (WebRTC). Native has graceful fallback.
- **Locale:** 11 countries, 9 currencies, scrollable selector modal.
- **Tabs:** Ionicons with active dot indicator.

## Key files
- `app/(tabs)/index.tsx` — planner screen (text + voice)
- `app/(tabs)/explore.tsx` — destination discovery
- `app/(tabs)/trips.tsx` — saved trips list
- `app/(tabs)/_layout.tsx` — tab config
- `app/trip-detail.tsx` — trip detail with timeline
- `lib/claude.ts` — Claude API client + demo simulation
- `lib/voice.ts` — Retell web client wrapper (startVoiceCall / stopVoiceCall)
- `lib/hotels.ts` — simulated hotel data (6 destinations)
- `lib/types.ts` — TripPlan, Hotel, ChatMessage types
- `lib/destinations.ts` — 15 destinations with categories, ratings, highlights
- `lib/trips-store.ts` — AsyncStorage-backed trip persistence
- `lib/locale.ts` — 11 countries, 9 currencies
- `lib/explore-intent.ts` — cross-tab intent passing
- `components/VoiceButton.tsx` — animated gradient mic button
- `components/VoiceHUD.tsx` — Iron Man-style call overlay
- `components/LocaleSelector.tsx` — country/currency picker
- `components/planner/ChatBubble.tsx` — gradient message bubble
- `components/planner/TripCard.tsx` — expandable trip plan card
- `components/planner/HotelCard.tsx` — hotel result card
- `components/explore/DestinationCard.tsx` — image card with gradient overlay
- `components/explore/SearchBar.tsx` — search input with clear
- `constants/theme.ts` — Colors, Typography, Shadows, Gradients, Spacing, Radius

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
- Language toggle (EN/MK) wired to voice agent swap in Explore/Trips tabs
- react-native-webrtc device testing for native voice
- Real RateHawk hotel search once sandbox credentials activate
- Supabase auth + saved trips sync
- Stripe payments
