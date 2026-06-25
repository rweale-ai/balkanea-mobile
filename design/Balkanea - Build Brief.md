# Balkanea — MVP Build Brief

> Companion to the interactive prototype **`Balkanea Prototype.dc.html`**. Open it to see every screen, state, animation and the bilingual toggle live. This doc is the written spec to hand to Claude Code alongside the original `design-brief.md`.

Balkanea is an **AI-first hotel booking app** for Balkan locals travelling internationally, launching in **North Macedonia**. The differentiator vs. Booking.com is that the entire experience is **conversation-led**: the home screen is a chat with **Bea**, the AI travel advisor, and structured UI (hotel cards, maps, booking) is rendered *inline inside the conversation*. Traditional Explore/Dashboard tabs exist as a familiar fallback.

Platform target: **Expo React Native** (iOS, Android, Web — single codebase). Portrait only. Default language **Macedonian (Cyrillic)**, with **English** toggle.

---

## 1. Design tokens (canonical — from `constants/theme.ts`)

Use these exactly. The prototype is built entirely from them.

**Colors**
- `primary #ED8323` · `primaryDark #E57757` · `primaryMedium #e87a2f` · `primaryLight #FFF4E8`
- `accent #00332A` (deep teal — Balkanea brand mark on light) · `accentDark #001a15` · `accentLight #E6F0EF`
- `background #F8F9FA` · `surface #FFFFFF`
- `text #1A1A2E` · `textSecondary #6B7280` · `textLight #9CA3AF`
- `border #E5E7EB` · `borderLight #F3F4F6`
- `success #10B981` · `error #EF4444` · `star #F59E0B`

**Primary gradient** (all CTAs / active states): `linear-gradient(135deg, #ED8323 → #E57757)`.

**Type scale:** hero 32/800 · h1 24/700 · h2 20/700 · h3 17/600 · body 15/400 · button 15/600 · caption 13/400 · overline 10/700. System font stack (supports Cyrillic).

**Radius:** sm 8 · md 12 · lg 20 · xl 28 · full 999. **Spacing:** 4/8/16/24/32/48/64.

**Shadows:** sm `0 1 3 / .08`, md `0 3 8 / .12`, lg `0 6 16 / .15`, glow orange `.3 / 12`.

Icons: Ionicons (outline inactive / filled active). The prototype uses inline SVG equivalents — swap for Ionicons in code.

---

## 2. The AI chat core (Bea) — the heart of the app

This is the screen to get right. Model the UX on the Claude app.

**Empty state:** Balkanea mark, "Where to next?" (`Каде следно?`), one-line subtitle, and 3 tappable suggestion prompts. A persistent composer pinned to the bottom with placeholder "Message Bea…", three affordance icons (explore / trips / voice) and a gradient send button. AI disclaimer line under the composer.

**Conversation behaviour:**
1. User message → right-aligned **orange gradient bubble** (`20px 20px 6px 20px`).
2. ~850ms **typing indicator** (3 bouncing dots next to Bea's avatar).
3. Bea reply **streams token-by-token** (the prototype reveals 2 chars / 16ms with a blinking caret). Keep streaming real in production (SSE / Anthropic streaming API).
4. When the text completes, **inline hotel cards** appear below the message — horizontal thumbnail + name + star rating + 2-line blurb + price/night. Tapping a card → Hotel Detail. A "See all 12 hotels →" pill opens the full **Results** screen.
5. A short **follow-up question** from Bea closes the turn ("Want me to filter by price, or check specific dates?").

**Inline card types to support** (MVP starts with hotel cards): hotel result card, and — per the SOW — eventually map snippets and a booking-summary card. Build the renderer so Bea's responses can contain typed "blocks" (text / hotel-list / booking-summary) that map to components.

**Agent escalation** (flow 6.4 in design-brief): when Bea can't resolve or the user asks for a human, surface "Call Balkanea" / "Request callback" inline, then a confirmation ("An agent will call you within 2 hours").

---

## 3. Screen inventory & states

Navigation: 3-tab bar — **Search (Bea chat)**, **Explore**, **Dashboard** — plus pushed screens (Hotel, Results, Booking, Confirmed, Booking Detail, Profile, Payments). Tab bar hides on pushed screens. Every screen has a back affordance and respects safe areas + fixed bottom bars above the home indicator.

### 3.1 Existing screens (redesigned in prototype, keep consistent)
- **Language** — first launch, MK/EN cards with selected check, persisted.
- **Auth** — logo + tagline, Google/Apple, email/phone toggle, gradient Sign In, "Continue without account" (guest mode). Language pill top-right.
- **Explore** — title, search bar, category chips, featured hero destination card (gradient overlay), 2-col destination grid. Tapping a destination → Results.
- **Dashboard** — "Your bookings". Empty state = compass + "Find a Hotel" CTA → chat. Populated = upcoming booking cards with status badge → Booking Detail. Avatar (top-right) → Profile.

### 3.2 Hotel Detail
Hero image (gradient overlay) + back/share. Sheet with city overline, name, guest-rating badge, distance, About, amenities chips, free-cancellation banner. **Room selection** (Standard / Deluxe / Junior Suite — radio cards, green check when selected; price updates). Fixed bottom "Book for €XXX" / "Резервирај за €XXX".

### 3.3 Results + Filters  *(missing screen #5)*
Header with back, result count ("12 hotels found"), **Filters** button. Sort chips: Recommended / Price ↑ / Price ↓ / Guest rating (active = dark pill). Vertical list of full-width hotel cards (image, rating badge, name, price/night, blurb, review count). **Filter sheet** (slide-up): price-range dual slider, star-rating pills, amenity multi-select chips, meal-plan single-select, distance. Live result count on Apply. **States:** loading (skeletons), results, no-results (clear-filters CTA), error.

### 3.4 Booking + Stripe Payment  *(missing screen #1 — highest priority)*
Single scroll: **summary card** (hotel, room, dates, nights, total) → **guest details** → **payment**. Payment = inline Stripe Elements: card number with **live brand detection** (Visa/Mastercard icon), expiry, CVC, "Secured by Stripe · PCI compliant", accepted-card icons. Fixed bottom **"Pay €XXX" / "Плати €XXX"**.
**States (all in prototype):**
- *Default* — pay enabled once card valid.
- *Processing* — button spinner + "Processing payment…", inputs disabled.
- *Success* → Booking Confirmed.
- *Declined* — red inline banner "Payment declined. Please try another card.", inputs re-enabled. (Prototype: test card `4000 0000 0000 0002` triggers decline; `4242…` succeeds.)
- *Network error* — banner + retry. *3D Secure* — handled by Stripe modal.
> Card data must go straight to Stripe — never to Balkanea servers. Support EUR + MKD.

### 3.5 Booking Confirmed
Animated green check (pulse ring), "Booking confirmed!", dashed **confirmation-code badge**, summary card, "View dashboard" + "Book another stay".

### 3.6 Booking Detail  *(missing screen #2)*
Hero + status badge. Confirmation-code badge, stay details, price breakdown, free-cancellation banner. **States:** Confirmed (cancel + contact buttons), Cancelled (muted banner, no actions), Past (neutral, no actions). Cancel flips status live in the prototype.

### 3.7 Profile / Settings  *(missing screen #3)*
Avatar + name/email. **Preferences:** language pill (MK/EN), currency (MKD/EUR/USD/GBP). **Notifications:** 3 toggle switches (booking confirmations, check-in reminders, promo). Link to **Payment history**. Help / Terms / Privacy rows. Sign out. App version.

### 3.8 Payment History  *(missing screen #4)*
Chronological transaction list (hotel, date, confirmation code, amount, status: Paid / Refunded / Pending). Refunded = strikethrough amount + green badge. Empty state matches Dashboard.

---

## 4. Localization (critical)

- All copy via `useLang()` / `t.*` keys — **no hardcoded strings**. The prototype carries a full EN + MK dictionary you can lift as a starting `translations` map.
- Macedonian Cyrillic runs **15–20% longer** — every button/label must flex without truncation. Test both scripts on every screen (the prototype toggle does this live via the flag pill in the chat header, auth, and profile).
- Key labels: Sign In `Најави се` · Pay `Плати` · Booking confirmed `Резервацијата е потврдена` · Cancel booking `Откажи резервација` · Search `Пребарај` · Explore `Истражи` · Dashboard `Табла`.
- Currency formatting: EUR `€145`, MKD `8,918 ден` (≈61.5 MKD/EUR — use a live rate in production).

---

## 5. Data model (as used by the prototype)

```
Hotel       { id, name, city, rating, reviews, eurPerNight, amenities[], blurb_en, blurb_mk, image }
Room        { name, eurPerNight, mealPlan }            // Standard / Deluxe / Junior Suite
Booking     { id, hotel, city, checkIn, checkOut, nights, room, mealPlan, total, code, status }
                                                        // status: confirmed | cancelled | past
Payment     { hotel, date, amount, currency, code, status }   // paid | refunded | pending
ChatMessage { role: user|bea, text, streaming, blocks[] }     // blocks: hotel-list | booking-summary | escalation
```

Macedonia hotel seed set in the prototype: Unique Resort & Spa + Hotel Tino & Spa (Ohrid), Hotel Panoramika + Skopje Marriott (Skopje), Hotel Boulevard + Villa Dihovo (Bitola).

---

## 6. Handoff notes

- **Imagery is placeholder.** The prototype uses tuned CSS gradients where hotel/destination photography goes. Wire real images (hotel feed / CDN) into the same card slots.
- Replace inline SVG icons with **Ionicons**; replace the gradient phone frame with real `SafeAreaView` + status bar.
- Keep the streaming chat real (don't fake it) — it's the product's signature.
- The prototype's `renderVals` shows the exact state each screen needs; mirror it as component props / Zustand/Context state.
- Build order suggested by priority: **Stripe Payment → Booking Detail → Results+Filters → Profile → Payment History**, with the Bea chat renderer underpinning everything.
