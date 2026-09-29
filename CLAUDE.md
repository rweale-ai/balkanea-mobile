@AGENTS.md

# Balkanea Mobile App

## What this is
AI-first outbound hotel booking app for Balkan locals travelling internationally. Expo SDK 56 + Expo Router. Runs on iOS, Android, and web (localhost:8081 = `npx expo start --web`).

## Stack
- Expo SDK 56 + Expo Router (file-based, `app/` directory)
- React Native 0.85 + react-native-web for web target
- Claude haiku-4-5 — Nea text travel advisor
- RateHawk — hotel search (simulated until sandbox creds activate; backend at balkanea-lead-webhook)
- Salesforce CRM — lead/booking sync via balkanea-lead-webhook backend
- AsyncStorage — booking persistence (local, pre-Supabase)
- expo-linear-gradient, expo-blur, @expo/vector-icons — premium UI

## Design System
- Premium design system in `constants/theme.ts`: Colors, Typography, Shadows, Gradients, Spacing, Radius
- All components use theme tokens — no hardcoded colors/fonts
- LinearGradient used for buttons, card overlays, headers, avatars
- Ionicons for tab bar and UI icons

## Current state (June 2026)
- **Search tab:** Nea chat UI with hotel search. Natural language — Nea finds hotels, shows results as cards, allows booking.
- **Explore tab:** 15 outbound destinations (Greece, Turkey, Italy, Croatia, Montenegro, Egypt, France, Spain, Czech Republic, North Macedonia). Category filtering, search, hero card + grid.
- **Dashboard tab:** Booking management — upcoming/past bookings, confirmation codes, cancellation.
- **Hotel Detail:** Full hotel info, room selection, book button.
- **Booking Flow:** Guest details form → simulated payment → booking confirmation → Salesforce sync.
- **Agent Escalation:** In Nea chat, escalation triggers agent contact options.
- **Locale:** 11 countries, 9 currencies, scrollable selector modal.
- **Salesforce:** Leads + bookings sync to balkaneacrm-dev-ed via balkanea-lead-webhook backend.

## Key files
- `app/(tabs)/index.tsx` — search/chat screen (Nea text + hotel results)
- `app/(tabs)/explore.tsx` — destination discovery (outbound-focused)
- `app/(tabs)/trips.tsx` — dashboard (bookings list)
- `app/(tabs)/_layout.tsx` — tab config
- `app/hotel-detail.tsx` — hotel detail with room selection
- `app/booking.tsx` — booking form + simulated payment
- `app/booking-confirmed.tsx` — booking confirmation screen
- `lib/claude.ts` — Claude API client + demo simulation (Nea advisor)
- `lib/hotels.ts` — RateHawk-shaped hotel search (simulated + backend API call)
- `lib/types.ts` — Hotel, Booking, Destination, ChatMessage, HotelSearchParams types
- `lib/destinations.ts` — 15 outbound destinations with categories, ratings, regionIds
- `lib/bookings-store.ts` — AsyncStorage-backed booking persistence
- `lib/salesforce.ts` — Salesforce CRM integration (leads, escalations, booking sync)
- `lib/locale.ts` — 11 countries, 9 currencies
- `lib/explore-intent.ts` — cross-tab intent passing
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

## Bookings table now shared with balkanea-web (2026-08-27)
`supabase/migrations/008_booking_source.sql` adds a `source` column
(`'web' | 'mobile'`, default `'mobile'`) to `bookings` so the ops portal
(Chat repo `admin-bookings.js`/`admin-payments.html`) can tell channels
apart — balkanea-web now writes its own bookings into this same table via
Chat's new `api/create-booking.js` (service-role key, not this app's
anon-key/RLS path). **This app's code is untouched** — every row it writes
still gets `source: 'mobile'` from the column default, no release needed.
The migration also drops `user_id`'s NOT NULL (web guests aren't Supabase
Auth users); existing RLS policies (`auth.uid() = user_id`) are unaffected
since they simply never match a null `user_id`. Migration not yet run
against `cwohhfrupyeznbexjyaq` as of 2026-08-27 — until it is, the portal
shows every row (including new mobile ones) as "pre-migration" rather than
a real channel.

## Env vars (EXPO_PUBLIC_ prefix = available in client)
- `EXPO_PUBLIC_CLAUDE_API_KEY` — Claude API key (omit for demo mode)

## Hard rules
- Never commit .env files.
- Use `StyleSheet.absoluteFill` not `StyleSheet.absoluteFillObject` (RN 0.85).

## Team & collaboration
This repo, its Vercel/Supabase/AWS infra, and its GitHub org are moving to
Balkanea-owned accounts (2026-08-27) so Ray and Hristijan collaborate as
peers under Balkanea's own ownership, not as guests in MARRA's accounts —
see the migration runbook, `Balkanea-Infra-Ownership-Migration.md`.
- Each developer runs Claude Code under their own account — never a shared
  login. This repo's CLAUDE.md/AGENTS.md is the shared source of truth both
  should be working from.
- Work in feature branches, PR into `main`, at least one other person
  reviews before merge — especially anything touching payment
  (`app/booking.tsx`, `lib/payment-intent.ts`, `lib/currency.ts`) or the
  real RateHawk booking flow (`lib/ratehawk.ts`). Solo direct-to-main
  pushes were fine single-developer; not once there are two.
- Real secrets (RateHawk keys, Bankart signing secret, Supabase service
  role key, Anthropic key, etc.) live in Vercel's own env var store —
  never in a shared plaintext file or chat message. Local `.env` is
  per-developer and gitignored.

## Open items

### Claude API key exposed client-side + Anthropic legal/licensing review (2026-08-24)
`lib/claude.ts` calls `api.anthropic.com` directly from the client using `EXPO_PUBLIC_CLAUDE_API_KEY` (`x-api-key` header, lines ~93/125/183/234/242/355). Because Expo inlines `EXPO_PUBLIC_*` vars into the built JS bundle, this key ships inside the app binary and is extractable by anyone who unpacks it — same category of issue as the Retell key noted above under "Voice (Retell AI)".

Two separate things to resolve before App Store submission:
1. **Technical fix:** proxy Nea's Claude calls through the Chat backend (balkanea-lead-webhook on Vercel), the same pattern already used for RateHawk (see `Chat/lib/ratehawk.js`). Add an endpoint (e.g. `api/nea-chat.js`) holding `ANTHROPIC_API_KEY` server-side (already present in Chat's Vercel env, unused). Must stream the response through rather than buffer-and-return, since Nea's typing effect depends on token streaming.
2. **Legal/licensing review (not yet done, needs Balkanea counsel or a careful read of Anthropic's current Commercial Terms of Service / Usage Policy):**
   - The exposed-key issue above may itself breach Anthropic's terms around keeping API credentials confidential / not allowing unauthorized third-party use, not just being a security bug.
   - Confirm Nea's actual behavior (any advice-adjacent responses) doesn't brush up against Usage Policy restrictions on advice-related use cases.
   - Confirm a Data Processing Addendum is in place with Anthropic if EU personal data flows through Claude calls (Balkanea serves Balkan travelers, many EU-adjacent).
   - Confirm the app's AI-disclosure UX (users told they're talking to an AI, not a human) meets applicable regulatory requirements (e.g. EU AI Act transparency rules) — separate from anything Anthropic-specific.
   - Branding is already correct (assistant is "Nea," not presented as "Claude").

## Next up
- Supabase auth + real user accounts
- Real RateHawk hotel search once sandbox credentials activate
- Real bank payment (replacing simulated payment) — see `components/PaymentWebView.tsx`
- Macedonian localization (full UI translation)
- Push notifications (Expo Notifications)
- App Store submission

## V2 candidates

### Voice (Retell AI) — removed from V1, 2026-07-27
Nea voice calls (EN + MK, in-app WebRTC with live transcript HUD) were built and working, then removed from the app entirely to ship a leaner V1. Full working implementation — `lib/voice.ts`, `components/VoiceButton.tsx`, `components/VoiceHUD.tsx`, the `@livekit/*` and `retell-client-js-sdk` dependencies, mic permissions in `app.json` — is preserved on the git branch **`v2-voice-enhancement`** (branched from main at the point of removal). To restore: `git checkout v2-voice-enhancement -- lib/voice.ts components/VoiceButton.tsx components/VoiceHUD.tsx` plus the removed dependency/permission entries (diff against `main` for the exact set), or review the branch directly.
- `setup-voice-agents.js` (Retell agent provisioning script) was left in place — still needed to reprovision agents if voice comes back.
- Retell agent IDs at time of removal — English (Nea EN): `agent_88718b83329c3417f0b1dce5b5`, LLM `llm_430bff8cc2cd3159ff96c0ec8fd3`, isolated persona safe to edit. Macedonian (Nea MK): `agent_4eff660016ae3f4aaa688f1742`, LLM `llm_365990f1ab000ebb38fdc34b7100` — **as of 2026-07-05 this LLM's prompt was actually the live balkanea-lead-webhook website chatbot**, shared with balkanea.com's chat widget; a real MK voice relaunch needs its own dedicated LLM, not a patch to the shared one.
- Retell API key was removed from `.env` on cleanup — retrieve from the Retell dashboard or Vercel env if reprovisioning.
- Known pre-removal issues to fix before relaunching: Retell key shipped in the client (needs a backend proxy before App Store submission, same requirement as the Claude key), and MK had no booking tool at all.

## Design references
- New screens are specced in `design/Balkanea — Build Brief.md`, with a working visual/behavior reference in `design/Balkanea Prototype.dc.html` (open in a browser). Original SOW: `design/uploads/design-brief.md`.
- Design tokens are canonical in `constants/theme.ts` — never hardcode colors, spacing, radii, or type sizes.
- All copy via `useLang()` / `t.*` — no hardcoded strings. MK (Cyrillic, default) + EN both required.
- Prototype caveats for real RN: imagery = placeholder gradients (wire real photos), icons = inline SVG (use Ionicons), keyboard = simulated (use native `KeyboardAvoidingView`). Chat behavior: typing raises the keyboard, sending dismisses it to free reading space, tapping the input raises it again.
- Don't add screens/sections/content not in the brief — ask first.
