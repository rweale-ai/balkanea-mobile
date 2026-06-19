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

## Retell voice agents (Balkanea workspace)
- **API key:** key_faf037ed18bb6b372ac05929eb52
- **English (Bea EN):** agent_88718b83329c3417f0b1dce5b5 | LLM: llm_430bff8cc2cd3159ff96c0ec8fd3
- **Macedonian (Bea MK):** agent_4eff660016ae3f4aaa688f1742 | LLM: llm_365990f1ab000ebb38fdc34b7100
- Voice is web-only for now (WebRTC via retell-client-js-sdk). Native needs react-native-webrtc.

## Current state (June 2026)
- Text planner: fully working. Bea chat UI, demo mode (no API key needed), trip plan cards + hotel cards.
- Voice: wired in — VoiceButton in planner header, calls English Bea agent. Web only.
- Tabs: Plan (working), Explore (stub), My Trips (stub)

## Key files
- `app/(tabs)/index.tsx` — planner screen (text + voice)
- `app/(tabs)/_layout.tsx` — tab config
- `lib/claude.ts` — Claude API client + demo simulation
- `lib/voice.ts` — Retell web client wrapper (startVoiceCall / stopVoiceCall)
- `lib/hotels.ts` — simulated hotel data (6 destinations)
- `lib/types.ts` — TripPlan, Hotel, ChatMessage types
- `components/VoiceButton.tsx` — animated mic button, web-only guard
- `components/planner/ChatBubble.tsx` — message bubble
- `components/planner/TripCard.tsx` — rendered trip plan card
- `components/planner/HotelCard.tsx` — hotel result card
- `constants/theme.ts` — Colors, Spacing, Radius, Fonts
- `setup-voice-agents.js` — one-time script to create Retell agents (already run)

## Env vars (EXPO_PUBLIC_ prefix = available in client)
- `EXPO_PUBLIC_CLAUDE_API_KEY` — Claude API key (omit for demo mode)
- `EXPO_PUBLIC_RETELL_API_KEY` — Retell key (defaults to workspace key in lib/voice.ts)
- `EXPO_PUBLIC_RETELL_AGENT_EN` — English agent ID
- `EXPO_PUBLIC_RETELL_AGENT_MK` — Macedonian agent ID

## Hard rules
- Retell API key in client is acceptable for sandbox/demo only. Must move to backend proxy before App Store submission.
- Voice is web-only until react-native-webrtc is added. VoiceButton has Platform.OS !== 'web' guard.
- Never commit .env files.

## Next up
- Explore tab — destination grid with filters
- My Trips tab — saved itineraries
- Language toggle (EN/MK) wired to voice agent swap
- react-native-webrtc for native voice support
- Real RateHawk hotel search once sandbox credentials activate
