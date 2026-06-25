# Balkanea Mobile App — Design Brief

**For:** Claude Design
**Product:** AI-first hotel booking app for Balkan locals travelling internationally
**Platform:** iOS, Android, Web (Expo React Native — single codebase)
**Languages:** Macedonian (Cyrillic, default) + English

---

## 1. Design System (Existing — Use As Canon)

All designs must use these tokens. No freehand colors, sizes, or radii.

> **Note:** The `.design-sync/foundations/colors.html` file is outdated (shows old green primary `#0B6E4F`). The source of truth is `constants/theme.ts` — the orange palette below.

### Colors

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#ED8323` | CTAs, active states, brand accents |
| `primaryDark` | `#E57757` | Gradient end, pressed states |
| `primaryMedium` | `#e87a2f` | Mid-gradient |
| `primaryLight` | `#FFF4E8` | Tinted backgrounds, badges |
| `accent` | `#00332A` | Deep teal — secondary emphasis |
| `accentDark` | `#001a15` | Dark teal variant |
| `accentLight` | `#E6F0EF` | Teal tinted surface |
| `background` | `#F8F9FA` | App background |
| `surface` | `#FFFFFF` | Cards, inputs, modals |
| `text` | `#1A1A2E` | Primary text |
| `textSecondary` | `#6B7280` | Labels, hints |
| `textLight` | `#9CA3AF` | Placeholders, disabled |
| `border` | `#E5E7EB` | Input borders, dividers |
| `borderLight` | `#F3F4F6` | Subtle dividers |
| `success` | `#10B981` | Confirmations, selected rooms |
| `error` | `#EF4444` | Errors, destructive actions |
| `star` | `#F59E0B` | Star ratings |

### Gradients

| Name | Values | Usage |
|------|--------|-------|
| `primaryFade` | `#ED8323` → `#E57757` | Primary buttons, CTAs |
| `accentFade` | `#00332A` → `#001a15` | Secondary emphasis |
| `heroOverlay` | `rgba(0,0,0,0.1)` → `rgba(0,0,0,0.65)` | Image overlays |
| `cardOverlay` | `transparent` → `rgba(0,0,0,0.6)` | Destination cards |
| `primaryLight` | `#FFF4E8` → `#FFF8F2` | Soft backgrounds |
| `warmGlow` | `rgba(237,131,35,0.0)` → `rgba(237,131,35,0.08)` | Subtle warmth |

### Typography

| Style | Size | Weight | Usage |
|-------|------|--------|-------|
| `hero` | 32px/38 | 800 | Hero numbers, large headings |
| `h1` | 24px/30 | 700 | Screen titles |
| `h2` | 20px/26 | 700 | Section headers |
| `h3` | 17px/22 | 600 | Card titles, subtitles |
| `body` | 15px/22 | 400 | Body text |
| `bodyMedium` | 15px/22 | 500 | Emphasized body |
| `button` | 15px/20 | 600 | Button labels |
| `caption` | 13px/18 | 400 | Small labels, hints |
| `overline` | 10px/14 | 700 | Uppercase category labels |
| `tabLabel` | 10px/14 | 600 | Tab bar labels |

### Spacing & Radius

- **Spacing:** 4 / 8 / 16 / 24 / 32 / 48 / 64
- **Radius:** sm=8, md=12, lg=20, xl=28, xxl=32, full=999

### Shadows

- `sm`: offset(0,1) opacity 0.08, blur 3
- `md`: offset(0,3) opacity 0.12, blur 8
- `lg`: offset(0,6) opacity 0.15, blur 16
- `glow`: orange shadow, opacity 0.3, blur 12

### Icons

Ionicons (from `@expo/vector-icons`). Outlined style for inactive, filled for active.

### Brand Assets

- Logo: `assets/balkanea-logo.png` (horizontal, 160x48 display)
- App icon: orange background (`#ED8323`), exists in iOS and Android adaptive formats

---

## 2. Existing Screens (Built — Reference, Do Not Redesign)

These screens are implemented and functional. Provided for context so new designs are visually consistent.

### 2.1 Language Selection (`app/language.tsx`)
- Full-screen centered layout, logo at top
- Two large buttons: Macedonian flag + "Македонски" / UK flag + "English"
- White card style with `Shadows.md`, `Radius.lg`
- Shown once on first launch, persisted

### 2.2 Auth Screen (`app/auth.tsx`)
- Logo + tagline at top
- Language toggle (flag + code) in top-right corner
- White card with sign-in/sign-up form
- Social login row: Google ("G" icon) + Apple (Ionicons logo-apple)
- "or" divider
- Method toggle: Email vs Phone (pill buttons, active = primaryLight bg + primary border)
- **Email mode:** Full name (signup only), email, password with show/hide toggle
- **Phone mode:** Phone number input → sends OTP → 6-digit OTP verification
- Primary gradient button for submit
- Toggle between "Sign In" and "Create Account"
- "Continue without account" skip link at bottom (guest mode)
- All text uses `useLang()` / `t.auth.*` for MK/EN

### 2.3 Search Tab (`app/(tabs)/index.tsx`)
- Chat interface with Bea (AI travel advisor)
- Gradient message bubbles (user = orange, assistant = gray)
- Typing indicator (animated dots)
- Hotel results as horizontal scroll carousel with cards
- Text input bar at bottom with send button
- Voice button (VoiceButton component — animated gradient mic)
- Voice HUD overlay (VoiceHUD — "Iron Man" style call UI)
- Locale selector (country/currency picker modal)

### 2.4 Explore Tab (`app/(tabs)/explore.tsx`)
- Header: "Explore" title + subtitle
- Search bar
- Horizontal scroll category chips (beach, mountain, culture, etc.)
- Featured hero destination card with gradient overlay
- Grid of destination cards (2-column)

### 2.5 Dashboard Tab (`app/(tabs)/trips.tsx`)
- Upcoming / past bookings sections
- Empty state: compass icon + "Chat with Bea" CTA
- Booking cards with hotel image, name, dates, status

### 2.6 Hotel Detail (`app/hotel-detail.tsx`)
- Hero image (280px) with gradient overlay, back + share buttons
- Hotel name, star rating dots, guest rating badge
- Address, distance to center
- Date/night chips
- Horizontal amenity chips with icons
- Cancellation policy banner
- Room type selection cards (selectable with green checkmark)
- Fixed bottom bar: "Book for €XXX" gradient button

### 2.7 Booking Form (`app/booking.tsx`)
- Header with back button
- Booking summary card (hotel, room, dates, nights, total)
- Guest details form: full name, email, phone
- **Payment section: currently a STUB** — hardcoded `**** **** **** 0000` with "simulated payment" notice
- Fixed bottom: "Confirm Booking" gradient button

### 2.8 Booking Confirmed (`app/booking-confirmed.tsx`)
- Centered success layout
- Large green checkmark icon
- "Booking Confirmed!" heading
- Confirmation code badge (primaryLight bg, primary border, hero-size code)
- Summary card (hotel, dates, nights, total)
- Two CTAs: "View Dashboard" (gradient) + "Book Another" (outlined)

### 2.9 Tab Bar
- 3 tabs: Search (search icon), Explore (compass icon), Dashboard (briefcase icon)
- Active: filled icon + orange dot below + primary tint
- Inactive: outlined icon + textLight tint
- Glass-like white background with `Shadows.sm`

---

## 3. Screens That Need Design

These screens are referenced in code or required by the SOW but do not exist yet.

### 3.1 Stripe Payment Screen

**Context:** The current `booking.tsx` has a fake payment stub. This needs to become a real Stripe-integrated payment experience.

**Requirements:**
- Replace the simulated card section in the booking flow
- Use Stripe Payment Sheet (native modal) or inline Stripe Elements
- Support credit/debit cards (MVP); EUR and MKD currencies
- Must be PCI-compliant — card numbers never touch our servers

**States to design:**

| State | What happens |
|-------|-------------|
| **Default** | Card input ready, "Pay €XXX" button disabled until card valid |
| **Card entering** | Stripe Elements inline — card number, expiry, CVC fields. Show card brand icon (Visa/Mastercard) on detection |
| **Processing** | Button shows spinner + "Processing payment..." — inputs disabled |
| **Success** | Transitions to booking-confirmed screen (already built) |
| **Declined** | Inline error banner: "Payment declined. Please try another card." — inputs re-enabled |
| **Network error** | Error banner: "Connection lost. Please try again." — retry button |
| **3D Secure** | Stripe handles this via modal — no custom design needed, but note the flow interruption |

**Design notes:**
- Keep the existing booking summary card at top (hotel, room, dates, total)
- Keep the existing guest details form above payment
- Payment section replaces the current stub in the same scroll flow
- "Pay €XXX" button replaces "Confirm Booking" in the fixed bottom bar
- Show accepted card brands (Visa, Mastercard, Maestro) as small icons
- Add a lock icon + "Secured by Stripe" text near the payment section
- Macedonian text: "Плати €XXX" for the button, all error messages in MK/EN

### 3.2 Booking Detail Screen

**Context:** `trips.tsx` navigates to `/booking-detail?id=...` but no `booking-detail.tsx` exists.

**Requirements:**
- Full detail view of a single booking (tapping a booking from the Dashboard)
- Accessible from the Dashboard tab

**Content:**

| Section | Content |
|---------|---------|
| **Header** | Back button + "Booking Details" title |
| **Hotel info** | Hotel image (hero or thumbnail), name, star rating, address |
| **Confirmation badge** | Confirmation code in a prominent badge (reuse the primaryLight badge style from booking-confirmed) |
| **Stay details** | Check-in date, check-out date, number of nights, room type, meal plan |
| **Guest info** | Guest name, email, phone |
| **Price breakdown** | Price per night, number of nights, total paid, currency |
| **Cancellation policy** | Policy text + status indicator (green if free cancellation still available) |
| **Actions** | "Cancel Booking" destructive button (for confirmed bookings); "Contact Balkanea" button |

**States:**

| State | Visual |
|-------|--------|
| **Confirmed** | Green status badge, cancel button visible |
| **Cancelled** | Red/gray status badge, "Cancelled" watermark, no cancel button |
| **Past** | Neutral status, no action buttons |

### 3.3 Profile / Account Settings Screen

**Context:** SOW requires profile management (name, language, currency, notification preferences). No screen exists.

**Requirements:**
- Accessible from Dashboard tab (add a settings/profile icon to the Dashboard header)
- User can view and edit their profile

**Content:**

| Section | Fields |
|---------|--------|
| **Avatar / Name** | User initial avatar (colored circle), full name, email below |
| **Personal info** | Full name (editable), email (read-only), phone (editable) |
| **Preferences** | Language toggle (MK/EN with flags), preferred currency (dropdown: MKD, EUR, USD, GBP) |
| **Notifications** | Toggle switches: booking confirmations, check-in reminders, promotional offers |
| **Account** | "Sign Out" button (outlined, secondary), "Delete Account" (text link, destructive) |
| **App info** | App version, "Help & Support" link, "Terms & Conditions" link, "Privacy Policy" link |

**Design notes:**
- Group sections in white cards with subtle headers
- Use the same input styling as auth.tsx (inputWrap, inputIcon pattern)
- Language toggle should match the auth.tsx langToggle style (flag + code in a pill)
- "Save" button only appears when changes are detected

### 3.4 Payment History Screen

**Context:** SOW section 3.1.6 requires payment history. Not built.

**Requirements:**
- Accessible from Profile/Settings or Dashboard
- List of all payment transactions

**Content per transaction:**

| Field | Example |
|-------|---------|
| Hotel name | "Grand Hotel Santorini" |
| Date | "15 Jun 2026" |
| Amount | "€450.00" |
| Status | Paid / Refunded / Pending |
| Confirmation code | "BLK-A7X9" |

**States:**

| State | Visual |
|-------|--------|
| **Empty** | "No payments yet" + compass icon (match Dashboard empty state style) |
| **Populated** | Chronological list, grouped by month |
| **Refunded** | Strikethrough amount + green "Refunded" badge |

### 3.5 Hotel Search Results with Filters

**Context:** SOW 3.1.2 requires filterable/sortable results. Currently results only appear as a chat carousel. Need a dedicated results view.

**Requirements:**
- Triggered when Bea returns hotel results, or from a structured search
- Full-screen list of hotel result cards (vertical scroll, not carousel)
- Filter bar + sort control at top

**Filters (slide-up sheet or inline chips):**

| Filter | Control |
|--------|---------|
| Price range | Dual-handle slider (min–max per night) |
| Star rating | Tappable star pills (3★, 4★, 5★) |
| Guest rating | Minimum rating slider (7.0+, 8.0+, 9.0+) |
| Amenities | Multi-select chips (WiFi, Pool, Spa, Beach, Parking, Restaurant) |
| Meal plan | Single-select chips (Any, Breakfast, Half board, All-inclusive) |
| Distance | Slider (km from center) |

**Sort options (dropdown or segmented control):**
- Recommended (default)
- Price: Low to High
- Price: High to Low
- Guest Rating
- Distance

**States:**

| State | Visual |
|-------|--------|
| **Loading** | Skeleton cards (3-4 shimmer placeholders) |
| **Results** | Vertical list of hotel cards + result count ("12 hotels found") |
| **No results** | Empty illustration + "No hotels match your filters" + "Clear filters" button |
| **Error** | Error banner + retry button |

---

## 4. Localization & Cyrillic Considerations

**Macedonian uses Cyrillic script.** This is critical for layout:

- Text in Macedonian is typically **15-20% longer** than English. Buttons, labels, and headers must accommodate expansion without overflow or truncation.
- Example: "Sign In" → "Најави се" (9 chars vs 7, but wider glyphs). "Create Account" → "Креирај сметка" (14 chars vs 14).
- **Test all designs in both scripts.** A button that fits "Pay" may clip "Плати".
- System font (`-apple-system` / `Segoe UI`) supports Cyrillic — no custom font needed.
- The app already uses `useLang()` with `t.*` translation keys throughout. All new screens must follow this pattern — no hardcoded English strings.
- Language toggle (flag + "MK"/"EN" pill) appears on the auth screen and should be accessible from profile settings.

### Key Macedonian UI Labels

| English | Macedonian | Context |
|---------|-----------|---------|
| Sign In | Најави се | Auth button |
| Create Account | Креирај сметка | Auth button |
| Search | Пребарај | Tab/button |
| Explore | Истражи | Tab label |
| Dashboard | Табла | Tab label |
| Book Now | Резервирај | CTA |
| Pay | Плати | Payment button |
| Cancel Booking | Откажи резервација | Destructive action |
| Booking Confirmed | Резервацијата е потврдена | Success heading |
| Your Trips | Твои патувања | Dashboard header |

---

## 5. Cross-Platform Notes

Designs must work across all three platforms:

| Platform | Consideration |
|----------|---------------|
| **iOS** | Safe area insets (notch, home indicator), `KeyboardAvoidingView` with `behavior="padding"`, native-feel inputs |
| **Android** | Status bar overlap (needs `paddingTop`), material-style ripple acceptable but not required, back gesture |
| **Web** | Fixed 390px viewport for mobile web, hover states on buttons, no native gestures |

- All screens use `SafeAreaView` for top/bottom safe areas
- Fixed bottom bars (book button, confirm button, tab bar) must account for home indicator on iOS
- The app is portrait-only

---

## 6. User Flows to Design

### 6.1 First Launch → Booking (Happy Path)

```
Language Selection → Auth (Sign Up / Email) → Search Tab
  → Chat with Bea → Hotel results carousel → Hotel Detail
  → Select room → Booking form + Stripe payment → Payment processing
  → Booking Confirmed → Dashboard (booking visible)
```

### 6.2 Returning User

```
App open → Auth (Sign In) → Search Tab (or last tab)
  → Dashboard → Booking Detail → Cancel booking flow
```

### 6.3 Guest → Conversion

```
Language → Auth → "Continue without account" → Search Tab (limited)
  → Attempts to book → Prompt to create account → Auth (Sign Up) → Resume booking
```

### 6.4 Agent Escalation

```
Chat with Bea → Complex query or user requests human
  → Escalation prompt: "Call Balkanea" / "Request callback"
  → Contact options (phone, callback form)
  → Confirmation: "An agent will call you within 2 hours"
```

---

## 7. Component Reference

Existing components in `.design-sync/` — open these HTML files for visual reference:

| File | Shows |
|------|-------|
| `foundations/colors.html` | Color palette (⚠️ outdated — use theme.ts values above) |
| `foundations/typography.html` | Type scale specimens |
| `components/chat-bubbles.html` | User/assistant message bubbles |
| `components/hotel-card.html` | Hotel result card (carousel variant) |
| `components/destination-cards.html` | Explore grid/hero cards |
| `components/voice-button.html` | Animated mic button |
| `components/locale-selector.html` | Country/currency picker modal |
| `components/tab-bar.html` | Bottom tab navigation |
| `components/trip-card.html` | Dashboard booking card |
| `screens/splash-screen.html` | Splash/loading screen |

---

## 8. Summary of Design Deliverables

| # | Screen | Priority | Notes |
|---|--------|----------|-------|
| 1 | **Stripe Payment** (within booking flow) | High | Replaces stub; all states (input, processing, success, declined, error) |
| 2 | **Booking Detail** | High | Missing screen that trips.tsx already navigates to |
| 3 | **Profile / Account Settings** | Medium | SOW requirement, not started |
| 4 | **Payment History** | Medium | SOW requirement, not started |
| 5 | **Hotel Results + Filters** | Medium | Full results list with filter sheet and sort |

All designs should be delivered as HTML files in the `.design-sync/` format (`<!-- @dsCard group="Screens" -->`, 390x844 viewport) for consistency with the existing design system artifacts.
