# Balkanea Mobile App — MVP Scope & SOW Plan
## Based on stakeholder call, June 23 2026

---

## 1. Call Summary

### Luke's Vision
- Balkanea = the online agency for Southeast Europe, built on technology + AI, low/no-touch
- Traditional agencies (700+ in Macedonia alone) will disappear in 5-10 years — Balkanea is positioned to capture that market as it shifts online
- Current state = working proof of concept (website v3). Now ready to build the **first official product version** — a foundation for the next 5-10 years
- Wants both a mobile **app** (first priority) and a rebuilt **website** (second priority)
- Scalability thesis: 3 people can produce 100 offers/day vs. agencies doing 10/day — because of end-to-end process + technology + CRM

### Jasmina's Requirements
- App must be able to **sell hotel rooms** (core requirement)
- Flights would be great but not required for MVP
- **No travel content** in the app (no destination guides, itineraries, travel advice — that stays on the website)
- Must have: **user login + personal dashboard** (trips, payments, itinerary tracking)
- Must have: **intelligent search** — natural language, not just click-through filters ("I need a hotel in Ibiza near the beach")
- Future: connect to **multiple room providers** (not just RateHawk) with a provider-abstraction layer, room-matching logic, and business rules engine
- Future: **flight + hotel packages**

### Gorjan's Input
- "It should be the same as Booking" — but acknowledges that's a long-term target
- Emphasized **rewards/incentives** to motivate downloads (deferred by Jasmina as "not mandatory")

---

## 2. Critical Tensions to Resolve

### A. Market Orientation — Who Is the Buyer?

**DECIDED: Balkan locals booking trips worldwide (outbound).**

The app serves Macedonian/Balkan residents booking vacations abroad — Paris, Italy, Bali, Istanbul, Greece, etc. This matches Balkanea's actual customer base and the agency-displacement thesis.

**Implications:**
- Inventory is **global** (wherever RateHawk has supply), not Balkan-only
- Default language is **Macedonian**, with English as secondary
- Explore/discovery UX shifts from "15 Balkan destinations" to "popular destinations from the Balkans" (beach holidays in Greece/Turkey/Egypt, city breaks in European capitals, etc.)
- Bea speaks Macedonian fluently — this is a core differentiator vs. Booking.com which has limited Macedonian UX
- Currency defaults to MKD/EUR

### B. Booking Model — In-App Payment or Agent-Assisted?

**DECIDED: In-app payment (Booking.com model).**

Users search, select, and pay directly in the app with instant booking confirmation. This is the Booking.com-style self-service flow.

**Implications:**
- Need **payment integration** (Stripe or similar) — credit card at minimum, potentially local Balkan payment methods
- Need **real-time booking confirmation** from RateHawk API (not just search — the full book+confirm flow)
- RateHawk production API access must be activated (currently returning `incorrect_credentials`)
- Receipts, cancellation policies, and refund flows needed
- All bookings create records in **Salesforce CRM** for customer relationship tracking

### C. The "Personal Touch" Differentiator

**DECIDED: Hybrid with escalation.**

Bea (AI) handles the initial conversation — understanding what the customer wants, narrowing options, recommending hotels, answering common questions. When the customer needs human reassurance or the query is complex, Bea escalates to a Balkanea agent via in-app chat or callback.

**This is Balkanea's strategic moat.** It delivers Luke's scalability (3 people, 100 offers/day) while preserving the agency warmth that Jasmina describes customers needing:
- "Is this area of Paris safe?" → Bea answers (AI knowledge)
- "I have €1,000, I want to go to Italy — where?" → Bea narrows 10,000 hotels to 5 curated options
- "I'm uncomfortable booking, can someone help me?" → Bea hands off to a human agent
- "I need 12 rooms for a business trip" → Escalation to human agent

**Implications:**
- Bea needs to be trained on travel advisory (safety, local knowledge, seasonal recommendations)
- Need an **escalation flow** — in-app chat or scheduled callback with a Balkanea agent
- Agent-side interface needed (or Salesforce integration) so agents see the conversation history from Bea
- All interactions (AI + human) logged in **Salesforce CRM**

### D. Relationship Between App, Website, and CRM

**DECIDED: App and website are independent for now. Salesforce CRM is the shared backbone.**

- App and website are **separate products** — no shared auth, no shared UI, no dependency
- **Salesforce CRM** is the single source of truth for customer data across both
- Every app user registration, search, conversation (Bea AI + human agent), booking, and payment creates/updates Salesforce records
- Agent escalations from the app route through Salesforce so the existing team can handle them with their current workflow
- Website may be rebuilt later (Luke's phase 2) — the CRM integration built for the app will be reusable

---

## 3. Proposed MVP Scope

### Guiding Principle
**Architect for the full vision, build only what's needed to prove the model with RateHawk.**

Luke's "10-year foundation" and "minimum budget" goals are reconciled by designing clean interfaces/seams for future layers (multi-provider, flights, business rules) but implementing only the RateHawk single-provider path in v1.

### IN — MVP v1

| Feature | Rationale |
|---------|-----------|
| **User accounts + login** | Jasmina: "the app should have the section where you can log in" |
| **Personal dashboard** | Trips, booking history, payments — Jasmina: "your personal dashboard with travels and payments" |
| **Hotel search via RateHawk** | Core business — global inventory, prove the model with existing supplier |
| **Intelligent natural-language search** | Jasmina stressed this — "typing like I need a hotel in Ibiza near the beach" — Bea handles this |
| **AI advisory (Bea) + voice** | The "personal touch at scale" differentiator — Bea speaks fluent Macedonian, narrows thousands of options to curated picks |
| **Agent escalation** | In-app chat or callback request when customer needs human reassurance — routes to Salesforce |
| **In-app payment (Stripe)** | Direct booking with instant confirmation — Booking.com model |
| **Booking confirmation + management** | View, modify, cancel bookings from the dashboard |
| **2-4 travelers** | Luke: "family or two couples — 60-70-80% of bookings" |
| **Macedonian-first, English secondary** | Core market is Balkan locals; Bea speaks MK natively |
| **Salesforce CRM integration** | All users, searches, conversations, bookings → Salesforce records |
| **Popular destinations from the Balkans** | Greece, Turkey, Italy, Egypt, Croatia — what Balkan locals actually book (not "Discover the Balkans" for tourists) |

### OUT — Roadmap (v2+)

| Feature | Why deferred |
|---------|-------------|
| **Multi-provider integration** | Luke: "maximize relationship with RateHawk first… without proving this is nonsense to go another investment" |
| **Room-matching logic** | Depends on multi-provider |
| **Business rules engine** | Depends on multi-provider |
| **Flights + flight+hotel packages** | Jasmina: "we still don't have that functionality on our website" — not proven yet |
| **Rewards/loyalty program** | Gorjan's idea; Jasmina: "not mandatory" |
| **Travel content/guides** | Jasmina: "the app should NOT have any content that you currently have on the website" |
| **Restaurant reservations** | Ray's idea — interesting but not validated by owner |
| **Group travel (20+ people)** | Jasmina: "will not be our main focus" |
| **Rich itinerary content** | Explicitly excluded from app by Jasmina |

### What Carries Forward from the Prototype

| Built | Status for MVP |
|-------|---------------|
| Expo + React Native stack | **Keeps** — solid foundation, cross-platform |
| Design system (theme, typography, shadows, gradients) | **Keeps** — premium UI components reusable |
| Voice interaction (Retell/Bea) | **Keeps** — this IS the strategic differentiator |
| Chat UI + trip cards + hotel cards | **Keeps** — UI components adapt to real data |
| Tab navigation + app structure | **Keeps** — Plan/Explore/My Trips maps to Search/Explore/Dashboard |
| Explore tab (15 Balkan destinations) | **Rebuild** — becomes global popular destinations for outbound Balkan travelers |
| Simulated hotel data | **Replace** — real RateHawk search + booking API |
| In-memory trips (AsyncStorage) | **Replace** — real user accounts + backend database + Salesforce |
| Demo mode Claude chat | **Evolve** — Bea drives real hotel search, knows RateHawk inventory, speaks Macedonian |
| Locale selector | **Simplify** — Macedonian-first, fewer options needed |

---

## 4. SOW Writing Process

### Phase 1: Requirements Clarification (1-2 sessions)
- Resolve the 4 tensions above (market, booking model, advisory mechanic, system boundaries)
- Define user personas and core journeys
- Confirm MVP in/out scope

### Phase 2: Technical Architecture
- Provider abstraction layer design (build for RateHawk, interface for multi-provider)
- Auth + user management (Supabase or similar)
- Payment integration approach
- Backend API design
- AI/voice architecture
- Data model

### Phase 3: SOW Document
- Executive summary + vision
- MVP feature specifications (user stories)
- Technical architecture overview
- Integration requirements (RateHawk, payment, CRM)
- Timeline + milestones
- Budget estimate
- Assumptions + dependencies
- Roadmap (v2, v3)

---

## 5. Remaining Clarification Questions

### Booking & Revenue
1. What **payment methods** do Balkan customers expect? Credit card only, or local methods (bank transfer, etc.)?
2. What is Balkanea's **commission model** with RateHawk? Per-booking margin or revenue share?
3. Is the **RateHawk production API** access confirmed? (Currently returning `incorrect_credentials` in sandbox)
4. What are the **cancellation/refund policies** — does Balkanea handle refunds or does RateHawk?
5. What is the typical **booking value**? (Helps size payment processing costs)

### The Personal Touch & Escalation
6. What are the **top 5 questions** customers ask that make them prefer an agency over Booking? (Defines what Bea needs to answer well)
7. When Bea escalates to a human agent, what's the **expected response time**? Instant chat, or callback within hours?
8. How many **agents** would handle escalations at launch? (Sizes the Salesforce workflow)
9. Does the team already use **Salesforce chat/case management**, or do we need to set that up?

### Market Details
10. Launch in **Macedonia first**, then expand to Serbia/Bosnia/etc.? Or all Balkans from day one?
11. Beyond Macedonian + English, are other languages needed at launch? (**Serbian, Bulgarian, Albanian?**)
12. What are the **most popular destinations** Balkan locals book? (Greece, Turkey, Egypt, Italy — confirm the priority list)

### Business
13. What is the **budget envelope** for the MVP build?
14. What is the **target launch date**?
15. Who **signs off** on the SOW? Luke, Jasmina, or both?

---

## 6. Next Steps

1. **Ray** shares this document with Luke, Jasmina, and Gorjan
2. Schedule a **requirements clarification session** (1-2 hours) to resolve the 4 tensions
3. Based on answers, draft the **SOW v1** with detailed user stories and technical architecture
4. SOW review + sign-off
5. Build begins
