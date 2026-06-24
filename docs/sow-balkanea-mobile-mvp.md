# Statement of Work
# Balkanea Mobile App — MVP v1

**Client:** Balkanea (Luke Sharkovski, CEO)
**Provider:** MARRA Global (Ray Weale)
**Date:** June 23, 2026
**Version:** 1.0 — Draft for Review
**SOW Approver:** Luke Sharkovski

---

## 1. Executive Summary

MARRA Global will design, build, and deploy the Balkanea mobile application — an AI-first hotel booking platform for Balkan locals traveling internationally. The app combines Booking.com-class global hotel inventory (via RateHawk) with the personal advisory experience of a local travel agency, delivered through Bea, an AI travel assistant fluent in Macedonian.

The MVP delivers a complete booking journey: search hotels by destination, dates, and natural language; get curated recommendations from Bea; book and pay in-app with instant confirmation; and escalate to a human Balkanea agent when needed. All customer interactions flow into Salesforce CRM, enabling Balkanea's team of 3 to serve 100+ customers per day — 10x a traditional agency.

**Platform:** iOS, Android, and Web (Expo cross-platform)
**Launch market:** North Macedonia (Macedonian-first, English secondary)
**Architecture:** Designed for the full 5-10 year vision; built for MVP with RateHawk as the single provider

---

## 2. Background & Strategic Context

### The Opportunity

There are 700+ traditional travel agencies in North Macedonia alone. They operate manually — one agent handling ~10 customer inquiries per day via phone and WhatsApp. As travel booking shifts online, these agencies cannot compete with platforms that combine global inventory, AI-powered advisory, and instant booking.

Balkanea is positioned to capture this market shift. The current Balkanea team of 3 already produces 100 offers per day through process efficiency and technology. The mobile app scales this further by putting Bea — the AI advisor — in every customer's pocket.

**Market context:** Currently, platforms like Booking.com hold monopolistic positions — smaller providers like RateHawk can only sell approximately 10% of rooms online. However, regulatory changes are expected within the next 2 years (driven by ongoing lawsuits and legislative efforts) that will open significantly more inventory to smaller platforms like Balkanea. This is a tailwind for the multi-provider roadmap in v2.

**Competitive landscape:** Balkanea is confirmed (by industry providers at the Berlin travel fair) as the only online travel platform operating in Southeast Europe. Two Serbian competitors are reportedly launching, but neither is live yet. Traditional agencies in Macedonia (700+, key players: Fibula (Turkish-owned), Disco Travel and Jungle Travel (both Serbian)) operate entirely offline — customers walk in, sit with an agent, and choose from a handful of pre-bought apartments. No working online booking, no CRM, no scalable process. Many don't even respond to email inquiries.

### Why Customers Still Use Agencies

From the stakeholder call, Balkanea has provided ~2,000 offers in the past 2-3 months and spoken to many of these customers. The reasons they come to an agency instead of Booking.com are concrete:

1. **Reassurance** — "If they go to Paris, which area is safe?" Customers want confirmation that where they're booking is the right choice. They want someone who knows.
2. **A curated shortlist with a personal guarantee** — Out of thousands of hotels in Paris, customers want someone to narrow it to 5 and say "I guarantee this will be great for you." Booking.com shows 10,000 results; an agency shows 5 and stands behind them.
3. **Discomfort handling the process alone** — Even customers who can afford a dinner at the Ritz feel uncomfortable arranging the full trip themselves. They want someone to take care of it.
4. **Open-ended budget advisory** — "I have €1,000, I want to go to Italy — where?" This isn't a search query. It's a conversation that requires back-and-forth to understand what type of travel fits them.
5. **Agencies that actually respond** — Jasmina noted that most of Balkanea's leads say they've emailed other agencies and never received an answer. Responsiveness alone is a differentiator.

Bea addresses reasons 1-4 at near-zero marginal cost. Reason 5 is inherent — AI responds instantly, 24/7. Agent escalation handles cases where human judgment is truly needed (e.g., 12-room business trips). This is Balkanea's strategic moat.

---

## 3. Scope of Work

### 3.1 In Scope — MVP v1

#### 3.1.1 User Accounts & Authentication

| Item | Detail |
|------|--------|
| **Registration** | Email + password; social login (Google, Apple) |
| **Login / session** | Persistent sessions with secure token storage |
| **Profile** | Name, email, phone, preferred language (MK/EN), preferred currency (MKD/EUR) |
| **Auth provider** | Supabase Auth (email, Google, Apple providers) |

**User Story:** As a Balkan traveler, I can create an account and log in so that my trips, bookings, and preferences are saved across sessions and devices.

#### 3.1.2 Hotel Search (RateHawk)

| Item | Detail |
|------|--------|
| **Search inputs** | Destination, check-in/check-out dates, number of guests (adults + children), rooms (1-4). Optimized for 2-4 travelers (family or 2-3 couples) which represent 60-80% of bookings. Requests exceeding 4 rooms route to agent escalation. |
| **Results** | Hotel name, photos, star rating, guest rating, price per night, total price, amenities, distance to center |
| **Filters** | Price range, star rating, guest rating, amenities, distance, meal plan |
| **Sort** | Price, rating, distance, recommended |
| **Detail view** | Full photo gallery, room types, cancellation policy, location map, amenities list |
| **Provider** | RateHawk API (search + book + confirm) |

**User Story:** As a traveler, I can search for hotels by destination and dates, filter and sort results, and view detailed hotel information so I can compare options and find the right hotel.

**Architecture note:** The provider interface is abstracted so additional suppliers (beyond RateHawk) can be integrated in v2 without rebuilding the search layer.

#### 3.1.3 Intelligent Natural-Language Search (Bea AI)

| Item | Detail |
|------|--------|
| **Text chat** | Type natural language queries: "I need a hotel in Ibiza near the beach for under €80/night" |
| **Voice interaction** | Speak to Bea in Macedonian or English via in-app voice button |
| **Recommendation engine** | Bea narrows thousands of results to 3-5 curated picks based on stated preferences, budget, travel style |
| **Context awareness** | Bea remembers conversation context within a session — follow-up questions refine results |
| **Travel advisory** | Bea answers common travel questions (safety, weather, visa, local tips) from knowledge base |
| **Language** | Macedonian-first; English secondary. Bea speaks fluent Macedonian natively |

**User Story:** As a traveler who doesn't know exactly what I want, I can describe my trip in my own words (text or voice) and Bea will understand my needs and recommend the best options — like having a knowledgeable travel agent in my pocket.

**Technology:**
- Text: Claude API (Anthropic) with travel-domain system prompt
- Voice: Retell AI with Macedonian (agent_4eff660016ae3f4aaa688f1742) and English (agent_88718b83329c3417f0b1dce5b5) agents
- Voice runs on WebRTC (web); native voice requires react-native-webrtc integration

#### 3.1.4 Agent Escalation

| Item | Detail |
|------|--------|
| **Warm transfer** | During business hours, Bea attempts a live transfer to a Balkanea agent |
| **After-hours / unavailable** | Bea takes the customer's details (name, phone, request summary) and creates a Salesforce case for agent follow-up |
| **Conversation handoff** | The full Bea conversation history is attached to the Salesforce case so the agent has complete context |
| **Trigger** | Customer requests a human; Bea detects a complex query she can't handle; customer expresses uncertainty or frustration |

**User Story:** As a traveler who needs human reassurance, I can ask to speak with a real person. If an agent is available, I'm connected immediately. If not, Bea takes my details and a Balkanea agent calls me back — already knowing my full conversation.

**Integration:** Uses the existing Salesforce lead/case creation endpoint established in the Nea chatbot backend (`POST /api/create-lead` on balkanea-lead-webhook.vercel.app).

#### 3.1.5 Booking & Payment

| Item | Detail |
|------|--------|
| **Booking flow** | Select hotel → select room → review details (cancellation policy, total price) → payment → instant confirmation |
| **Payment** | Credit/debit card via Stripe. Additional payment methods (bank transfer, local methods) to be evaluated with client based on customer expectations |
| **Agent-assisted payment** | For customers who prefer not to pay digitally, the booking can be escalated to a live agent who completes the payment process |
| **Confirmation** | In-app confirmation screen + email confirmation + push notification |
| **Cancellation** | Balkanea handles all cancellations and refunds (per hotel cancellation policy from RateHawk) |
| **Receipts** | Digital receipt accessible from booking history |

**User Story:** As a traveler who has found the right hotel, I can book and pay directly in the app and receive instant confirmation — or request an agent to help me complete the booking if I prefer.

#### 3.1.6 Personal Dashboard

| Item | Detail |
|------|--------|
| **Upcoming trips** | List of confirmed bookings with hotel, dates, check-in details |
| **Past trips** | Booking history with receipts and review prompts |
| **Booking management** | View booking details, cancellation policy; initiate cancellation |
| **Payment history** | All transactions with amounts, dates, status |
| **Profile settings** | Edit name, language, currency, notification preferences |

**User Story:** As a returning user, I can see all my upcoming and past trips, manage my bookings, and access my payment history from one place.

#### 3.1.7 Explore — Popular Destinations

| Item | Detail |
|------|--------|
| **Destinations** | Curated list of popular outbound destinations from the Balkans. Must reflect where Macedonian locals actually travel — Greece (Santorini, Athens, Thessaloniki), Turkey (Istanbul, Antalya), Italy, Croatia (Dubrovnik, Split), Montenegro (Kotor, Budva), Egypt, and other top destinations. Final list to be confirmed with Balkanea team. |
| **Categories** | Beach, Mountain, Culture, Adventure, Nightlife, Nature, History, Food & Wine |
| **Interaction** | Tap destination → pre-populated hotel search for that destination |
| **Content** | Hero image, tagline, category tags, rating, best time to visit. No travel guides or editorial content (that stays on the website — Jasmina was explicit about this) |

**User Story:** As a Macedonian traveler looking for inspiration, I can browse the destinations my peers love most and jump straight into a hotel search.

**Note:** The current balkanea.com website features 8 destinations (Dubrovnik, Split, Kotor, Santorini, Ohrid, Sarajevo, Athens, Belgrade) — predominantly Balkan/inbound. The mobile app prototype has 15 Balkan destinations. Since the app pivots to outbound travel, the Explore list needs to be rebuilt to feature the international destinations Balkan locals actually book (Greece, Turkey, Italy, Egypt, Croatia — per the stakeholder call). Balkanea team to confirm the priority destination list before development.

#### 3.1.8 Macedonian-First Localization

| Item | Detail |
|------|--------|
| **Languages** | Macedonian (default) and English |
| **Switching** | In-app language toggle; persisted in user profile |
| **Scope** | All UI text, Bea chat/voice, search placeholders, error messages, notifications |
| **Currency** | MKD and EUR display; user-selectable |

#### 3.1.9 Salesforce CRM Integration

| Item | Detail |
|------|--------|
| **Platform** | Salesforce Sales Cloud (existing org: balkaneacrm-dev-ed.develop.my.salesforce.com) |
| **User sync** | New app registration → Salesforce Contact/Lead |
| **Booking sync** | Each confirmed booking → Salesforce Opportunity or custom Booking object |
| **Conversation logging** | Bea AI conversations (summary + key details) → Salesforce Activity/Case |
| **Escalation cases** | Agent escalation requests → Salesforce Case with full conversation history |
| **Existing integration** | Extends the Salesforce connection already established in the Nea chatbot backend |

**User Story:** As a Balkanea team member, I can see every customer, every conversation, and every booking in Salesforce — whether it came from the app, the website, or a phone call.

#### 3.1.10 Push Notifications

| Item | Detail |
|------|--------|
| **Booking confirmed** | Immediate confirmation after successful payment |
| **Booking reminder** | 24 hours before check-in |
| **Agent callback** | "A Balkanea agent will call you shortly" / "Your request has been received" |
| **Cancellation** | Cancellation confirmed |

---

### 3.2 Out of Scope — Roadmap (v2+)

The following are explicitly excluded from this SOW. The architecture will include clean interfaces/seams so these can be added in future phases without rebuilding.

| Feature | Rationale | Target |
|---------|-----------|--------|
| Multiple hotel providers + room matching | Prove the model with RateHawk first (Luke) | v2 |
| Flights + flight-hotel packages | Not yet on the website either (Jasmina) | v2 |
| Business rules engine / pricing logic | Depends on multi-provider | v2 |
| Rewards / loyalty program | Needs user base first (Gorjan, deferred by Jasmina) | v2 |
| Travel content / destination guides | Website only (Jasmina) | Never in app |
| Group travel (20+ people) | Not primary market | v2+ |
| Restaurant reservations | Not validated by owner | v3+ |
| Expansion beyond Macedonia | After Macedonia launch is proven | v2 |
| Additional languages (Serbian, Albanian, Bulgarian) | After Macedonia traction | v2 |

---

## 4. Technical Architecture

### 4.1 System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    MOBILE APP (Expo)                     │
│         iOS / Android / Web — React Native               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │  Search   │ │   Bea    │ │ Booking  │ │ Dashboard │  │
│  │   Tab     │ │Chat/Voice│ │  Flow    │ │   Tab     │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬─────┘  │
└───────┼────────────┼────────────┼──────────────┼────────┘
        │            │            │              │
        ▼            ▼            ▼              ▼
┌─────────────────────────────────────────────────────────┐
│                  BACKEND API (Vercel)                     │
│              Serverless Node.js Functions                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐  │
│  │ Hotel    │ │  AI      │ │ Payment  │ │   User    │  │
│  │ Search   │ │ Orchestr.│ │ Service  │ │  Service  │  │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬─────┘  │
└───────┼────────────┼────────────┼──────────────┼────────┘
        │            │            │              │
   ┌────▼────┐ ┌────▼────┐ ┌────▼────┐  ┌─────▼──────┐
   │RateHawk │ │Claude AI│ │ Stripe  │  │  Supabase  │
   │  API    │ │Retell AI│ │         │  │ Auth + DB  │
   └─────────┘ └─────────┘ └─────────┘  └─────┬──────┘
                                               │
                                         ┌─────▼──────┐
                                         │ Salesforce  │
                                         │ Sales Cloud │
                                         └────────────┘
```

### 4.2 Technology Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Mobile framework** | Expo SDK 56 + Expo Router | Cross-platform (iOS, Android, Web) from single codebase; prototype already built on this stack |
| **Language** | TypeScript | Type safety across frontend and backend |
| **Backend** | Vercel Serverless Functions (Node.js) | Existing infrastructure from chatbot; zero-ops, auto-scaling |
| **Authentication** | Supabase Auth | Email + social login; open-source; row-level security for user data |
| **Database** | Supabase (PostgreSQL) | User profiles, booking records, conversation logs, app state |
| **Hotel inventory** | RateHawk API | Global hotel inventory; search, book, confirm in real-time |
| **AI (text)** | Claude API (Anthropic) | Natural language understanding, travel recommendations, conversation |
| **AI (voice)** | Retell AI (WebRTC) | Voice interaction; existing Macedonian + English agents |
| **Payments** | Stripe | Credit/debit card processing; PCI-compliant |
| **CRM** | Salesforce Sales Cloud | Existing org; lead/contact/booking sync |
| **Push notifications** | Expo Notifications | Cross-platform push via Expo's notification service |
| **Design system** | Custom (existing) | Premium theme tokens, typography, gradients — built in prototype |

### 4.3 Provider Abstraction Layer

To support Luke's 5-10 year vision while building only the RateHawk path today, the hotel search layer uses a provider interface:

```typescript
interface HotelProvider {
  search(params: SearchParams): Promise<HotelResult[]>
  getDetails(hotelId: string): Promise<HotelDetail>
  checkAvailability(hotelId: string, params: BookingParams): Promise<Availability>
  book(params: BookingRequest): Promise<BookingConfirmation>
  cancel(bookingId: string): Promise<CancellationResult>
}
```

MVP implements `RateHawkProvider`. v2 adds additional providers behind the same interface, plus a `ProviderAggregator` that merges and deduplicates results.

### 4.4 Data Model (Core Entities)

| Entity | Key Fields | Storage |
|--------|-----------|---------|
| **User** | id, email, name, phone, language, currency, supabase_auth_id | Supabase + Salesforce Contact |
| **Search** | id, user_id, destination, dates, guests, filters, timestamp | Supabase |
| **Hotel** | provider_id, name, location, stars, rating, amenities, images | RateHawk (not stored; fetched on demand) |
| **Booking** | id, user_id, hotel_id, room_type, check_in, check_out, guests, total_price, status, stripe_payment_id, ratehawk_booking_id | Supabase + Salesforce Opportunity |
| **Conversation** | id, user_id, messages[], type (text/voice), summary, escalated | Supabase + Salesforce Activity |
| **Escalation** | id, user_id, conversation_id, reason, status, agent_notes | Supabase + Salesforce Case |

### 4.5 Security

| Concern | Approach |
|---------|----------|
| **API keys** | All third-party API keys (RateHawk, Claude, Stripe, Retell) stored server-side only. No API keys in client bundle for production |
| **Authentication** | Supabase Auth with JWT tokens; row-level security policies on all user data |
| **Payment** | Stripe Elements handles card input — card numbers never touch our servers (PCI SAQ-A) |
| **Data in transit** | HTTPS everywhere; Supabase enforces TLS |
| **Data at rest** | Supabase (encrypted PostgreSQL); Salesforce (platform encryption) |
| **Voice** | Retell WebRTC connection is encrypted; voice data not stored beyond session |

---

## 5. Integration Requirements

### 5.1 RateHawk

| Requirement | Status |
|-------------|--------|
| Sandbox API credentials | **Blocked** — currently returning `incorrect_credentials`. Need activation from RateHawk. (Existing sandbox creds: partner 7788) |
| Production API credentials | Required before launch — separate activation |
| API operations needed | Hotel search, hotel details, room availability, booking creation, booking confirmation, booking cancellation |
| Rate limits | TBD — need to confirm with RateHawk based on expected volume |

**Dependency:** RateHawk sandbox credentials must be activated for development to proceed past the search integration milestone. This is the critical-path external dependency.

### 5.2 Stripe

| Requirement | Detail |
|-------------|--------|
| Account | Balkanea Stripe account (new or existing) |
| Integration | Stripe Payment Intents API + Stripe Elements (React Native) |
| Currencies | EUR, MKD |
| Payment methods | Credit/debit card (MVP); additional methods evaluable in v2 |
| Webhooks | Payment confirmation, refund processing |

### 5.3 Salesforce

| Requirement | Detail |
|-------------|--------|
| Org | balkaneacrm-dev-ed.develop.my.salesforce.com (existing) |
| Current usage | Sales Cloud for order tracking |
| New objects/flows needed | Booking custom object (or Opportunity customization), Case for escalations, Activity logging for Bea conversations |
| Integration method | REST API via existing backend endpoint pattern (extends /api/create-lead) |
| Sync direction | App → Salesforce (primary); Salesforce → App for agent updates (stretch) |

### 5.4 Supabase

| Requirement | Detail |
|-------------|--------|
| Project | New Supabase project for Balkanea |
| Auth | Email + password, Google OAuth, Apple Sign-In |
| Database | PostgreSQL with row-level security |
| Realtime | Optional — for live agent chat in v2 |

### 5.5 Retell AI (Voice)

| Requirement | Detail |
|-------------|--------|
| Agents | Macedonian (agent_4eff660016ae3f4aaa688f1742), English (agent_88718b83329c3417f0b1dce5b5) |
| Integration | WebRTC (web); react-native-webrtc (native) |
| Warm transfer | Retell call transfer to Balkanea phone number during business hours |
| Fallback | Bea collects details → Salesforce case creation |
| API key handling | Must move from client-side to backend proxy before App Store submission |

---

## 6. Deliverables

| # | Deliverable | Description |
|---|-------------|-------------|
| D1 | **Mobile application** | Expo app published to iOS App Store, Google Play Store, and web |
| D2 | **Backend API** | Vercel serverless functions: hotel search, booking, payment, user management, AI orchestration, CRM sync |
| D3 | **Supabase project** | Database schema, auth configuration, row-level security policies |
| D4 | **Salesforce configuration** | Custom objects, fields, and integration flows for booking and escalation tracking |
| D5 | **Bea AI configuration** | Claude system prompts (text) and Retell agent prompts (voice) tuned for travel advisory, hotel search, and Macedonian fluency |
| D6 | **Localization** | Complete Macedonian and English translations for all UI text |
| D7 | **Documentation** | API documentation, deployment guide, admin guide for Salesforce integration |
| D8 | **Source code** | Full source code in client's repository with CI/CD pipeline |

---

## 7. Milestones & Phases

### Phase 1: Foundation (Weeks 1-3)

| Task | Detail |
|------|--------|
| Supabase project setup | Auth, database schema, RLS policies |
| User registration + login | Email, Google, Apple sign-in |
| Profile management | Language, currency, personal details |
| Backend API scaffold | Vercel project structure, auth middleware, error handling |
| Salesforce user sync | New registrations → Salesforce Contact |

**Exit criteria:** Users can register, log in, and their profile appears in Salesforce.

### Phase 2: Search & AI (Weeks 3-6)

| Task | Detail |
|------|--------|
| RateHawk search integration | Hotel search with filters, sorting, pagination |
| Hotel detail view | Photos, room types, amenities, map, cancellation policies |
| Provider abstraction layer | Interface for future multi-provider support |
| Bea text chat | Claude-powered natural language hotel search and recommendations |
| Bea voice integration | Retell WebRTC on web + react-native-webrtc on native |
| Conversation logging | Store conversations in Supabase, sync summaries to Salesforce |

**Exit criteria:** Users can search hotels via filters or by talking to Bea (text and voice), view detailed results, and conversations are logged.

**Dependency:** RateHawk sandbox credentials must be activated before this phase can complete.

### Phase 3: Booking & Payment (Weeks 6-9)

| Task | Detail |
|------|--------|
| Stripe integration | Payment Intents, card input via Stripe Elements |
| Booking flow | Select room → review → pay → confirm |
| RateHawk booking API | Create booking, confirm booking, handle errors |
| Agent-assisted booking | Escalation option at payment stage for customers who prefer human help |
| Booking management | View, cancel from dashboard |
| Booking → Salesforce | Each confirmed booking creates Salesforce record |
| Email confirmations | Booking confirmation, cancellation confirmation |

**Exit criteria:** Users can book a hotel, pay by card, receive confirmation, and the booking appears in Salesforce.

### Phase 4: Escalation & Polish (Weeks 9-11)

| Task | Detail |
|------|--------|
| Agent escalation flow | Warm transfer during business hours; detail capture + SF case after hours |
| Push notifications | Booking confirmed, check-in reminder, agent callback |
| Explore tab rebuild | 15 destinations from balkanea.com, outbound-focused |
| Personal dashboard | Upcoming trips, past trips, payment history |
| Macedonian localization | Full UI translation + Bea prompt localization |
| UI polish | Premium design system applied consistently, animations, loading states |

**Exit criteria:** Complete user journey from discovery to post-booking, in Macedonian, with agent escalation working.

### Phase 5: Testing & Launch (Weeks 11-13)

| Task | Detail |
|------|--------|
| End-to-end testing | Full booking flow with real RateHawk + Stripe |
| Device testing | iOS (iPhone), Android, Web browsers |
| Performance optimization | App startup time, search response time, image loading |
| Security review | API key handling, auth flows, payment security |
| App Store submission | iOS App Store + Google Play Store |
| Production deployment | Backend + database + monitoring |
| Handoff | Documentation, admin training, Salesforce walkthrough |

**Exit criteria:** App live on App Store and Play Store, team trained on Salesforce workflows.

---

## 8. Assumptions & Dependencies

### Assumptions

| # | Assumption |
|---|-----------|
| A1 | Balkanea will provide timely feedback during each milestone review (within 3 business days) |
| A2 | RateHawk's booking API supports the full search → book → confirm → cancel flow programmatically |
| A3 | Balkanea has or will create a Stripe account for payment processing |
| A4 | The existing Salesforce Sales Cloud org can be extended with custom objects for booking tracking |
| A5 | Apple Developer and Google Play Developer accounts are available (or will be created) for app submission |
| A6 | Balkanea will provide real hotel photography or authorize use of RateHawk's hotel images |
| A7 | The Balkanea logo, brand assets, and style guide are available for app branding |
| A8 | At least one Balkanea team member is available during business hours to test agent escalation flows |
| A9 | Payment expectations and preferred methods will be confirmed by Balkanea before Phase 3 begins |

### External Dependencies

| # | Dependency | Impact if Delayed |
|---|-----------|-------------------|
| D1 | **RateHawk sandbox credentials activation** | Blocks Phase 2 (Search & AI). This is the critical-path dependency. |
| D2 | **RateHawk production credentials** | Blocks Phase 5 (Launch). Can be requested in parallel during development. |
| D3 | **Stripe account setup** | Blocks Phase 3 (Booking & Payment) |
| D4 | **Apple Developer account** ($99/year) | Blocks iOS App Store submission |
| D5 | **Google Play Developer account** ($25 one-time) | Blocks Google Play submission |
| D6 | **Client confirmation on payment methods** | May affect Phase 3 scope if additional methods beyond credit card are required |

---

## 9. Budget

**TBD** — To be discussed and agreed upon before SOW execution.

Budget will be finalized based on:
- Confirmation of Phase 3 payment scope (credit card only vs. additional methods)
- RateHawk API complexity (pending sandbox testing)
- Salesforce customization depth
- Any scope adjustments from milestone reviews

---

## 10. Timeline

**TBD — Target: ASAP for MVP delivery.**

Working estimate: **~13 weeks** from project kickoff to App Store submission. This is a planning estimate, not a commitment — final timeline to be agreed upon with budget. Subject to:
- RateHawk sandbox credentials being activated within Week 1
- Timely client feedback at each milestone (3 business days)
- No major scope changes during development

| Phase | Duration | Cumulative |
|-------|----------|-----------|
| Phase 1: Foundation | 3 weeks | Week 3 |
| Phase 2: Search & AI | 3 weeks | Week 6 |
| Phase 3: Booking & Payment | 3 weeks | Week 9 |
| Phase 4: Escalation & Polish | 2 weeks | Week 11 |
| Phase 5: Testing & Launch | 2 weeks | Week 13 |

---

## 11. Roadmap — Future Phases

### v2: Multi-Provider & Expansion

- Additional hotel providers beyond RateHawk (provider abstraction layer ready from v1)
- Room-matching logic across providers (same hotel, best price)
- Business rules engine for pricing and commission
- Expansion to Serbia, Bosnia, Albania (additional languages)
- Additional payment methods based on v1 learnings
- Rewards / loyalty program

### v3: Flights & Packages

- Flight search integration
- Flight + hotel package builder
- Complex itinerary management
- Group travel support (20+ travelers)

---

## 12. What Carries Forward from Prototype

A working prototype exists today demonstrating the core experience. The following components carry forward into the MVP build, reducing development time and risk:

| Component | Status | MVP Action |
|-----------|--------|-----------|
| Expo SDK 56 + React Native framework | Working | **Keep** — proven cross-platform foundation |
| Premium design system (theme, typography, gradients) | Working | **Keep** — all tokens and components reusable |
| Bea voice AI (Macedonian + English via Retell) | Working | **Keep** — strategic differentiator |
| Chat UI (gradient bubbles, typing indicator, trip cards) | Working | **Keep** — adapt to real data |
| Tab navigation + app structure | Working | **Keep** — Search/Explore/Dashboard mapping |
| Explore tab (15 destinations) | Working | **Rebuild** — pivot from inbound tourists to outbound Balkan travelers |
| Hotel search results UI | Working (simulated) | **Replace** — connect to real RateHawk API |
| Trip storage (AsyncStorage) | Working | **Replace** — Supabase database + user accounts |
| Claude demo chat | Working | **Evolve** — Bea drives real hotel search, speaks Macedonian natively |
| Salesforce lead creation | Working (chatbot) | **Extend** — add booking sync, conversation logging, escalation cases |

---

## 13. Acceptance Criteria

The MVP will be considered complete when:

1. A new user can register (email or social), log in, and set their language to Macedonian
2. The user can search for hotels by destination and dates, with results from RateHawk
3. The user can ask Bea (text or voice, in Macedonian) to find hotels matching natural-language criteria
4. Bea returns curated hotel recommendations based on the conversation
5. The user can select a hotel, choose a room, and pay by credit card with instant confirmation
6. The user can request agent assistance — warm transfer during business hours, or detail capture for callback
7. The user's dashboard shows upcoming trips, past bookings, and payment history
8. All users, bookings, conversations, and escalations appear in Salesforce
9. The app is available on iOS App Store, Google Play Store, and web
10. All UI text is available in Macedonian and English

---

## 14. Terms

- This SOW becomes effective upon written approval by Luke Sharkovski
- Changes to scope after approval will be handled via a Change Order process
- MARRA Global retains no ownership of customer data; all data belongs to Balkanea
- Source code is delivered to Balkanea's repository upon project completion

---

*Prepared by MARRA Global*
*Building the future of Balkan travel, one conversation at a time.*
