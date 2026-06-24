# Balkanea Mobile App
## MVP Scope & Next Steps

**Prepared by:** Ray Weale, MARRA Global
**Date:** June 23, 2026
**Based on:** Stakeholder call with Luke, Jasmina, and Gorjan

---

## Executive Summary

Following our call, this document captures the agreed direction for the Balkanea mobile app, the proposed MVP scope, and the questions we need answered before writing the full Statement of Work (SOW).

The app's mission: **bring the agency experience into the palm of your hand** — Booking.com's global hotel inventory combined with the personal touch that Balkan travelers trust from their local agency. Powered by AI, delivered at a fraction of the cost.

---

## What We Heard

### From Luke
- Balkanea's competitive advantage is the **end-to-end process + technology** — 3 people producing 100 offers/day versus an agency's 10
- Traditional agencies (700+ in Macedonia) will disappear in 5-10 years as the market shifts online
- This app must be the **foundation for the next 5-10 years** — built properly, scalable, bulletproof
- Priority: **app first**, then rebuild the website

### From Jasmina
- The app must **sell hotel rooms** — that is the core
- Users need **login + personal dashboard** to see their trips, bookings, and payments
- **Intelligent search** is essential — not just filters, but natural language: *"I need a hotel in Ibiza near the beach"*
- Travel content (destination guides, itineraries, blog posts) stays on the **website only** — the app is a booking tool
- Future capability: connect to **multiple hotel providers** beyond RateHawk, with smart room-matching and pricing logic
- Flights and flight+hotel packages are desirable but not required for v1

### From Gorjan
- Long-term benchmark is **Booking.com**
- **Rewards and incentives** will motivate people to download and use the app

---

## Agreed Decisions

| Decision | Answer |
|----------|--------|
| **Who is the buyer?** | Balkan locals booking trips worldwide — Greece, Turkey, Italy, Egypt, and beyond |
| **How do they pay?** | In-app payment with instant booking confirmation (like Booking.com) |
| **What about the personal touch?** | AI assistant (Bea) handles initial conversation and recommendations; escalates to a human Balkanea agent when the customer needs reassurance or the request is complex |
| **How does the app relate to the website?** | They are independent products for now. Salesforce CRM is the shared backbone — all customer data flows there |

---

## The Balkanea Advantage — Why This Works

The gap in the market is clear: Booking.com has the rooms but no personal touch. Agencies have the personal touch but can't scale and are technologically behind.

**Balkanea bridges this gap with Bea** — an AI travel advisor who speaks fluent Macedonian, understands your preferences, and narrows 10,000 hotels down to 5 perfect options. When you need a human, she connects you to a real Balkanea agent who already knows your conversation.

This is how 3 people serve 100 customers a day. This is the Ferrari.

| Scenario | How it works |
|----------|-------------|
| *"I have €1,000, I want to go to Italy — where?"* | Bea asks about your preferences, suggests 3 destinations, shows curated hotels within budget |
| *"Is this area of Paris safe for my family?"* | Bea answers from her knowledge — no waiting for an agent to Google it |
| *"I need 12 rooms for a business trip"* | Bea gathers the details, then hands off to a Balkanea agent who handles the complex booking |
| *"I'm not sure, can someone help me decide?"* | Bea connects you to a live agent who sees the full conversation history |

---

## MVP Scope — What's In

| Feature | Why |
|---------|-----|
| **User accounts + login** | Personal dashboard with trips, bookings, payments |
| **Hotel search** | Global inventory via RateHawk — search by destination, dates, guests, budget |
| **Intelligent search (Bea)** | Natural language: type or speak what you want, Bea finds it |
| **Voice interaction** | Talk to Bea in Macedonian or English — plan your trip by voice |
| **AI recommendations** | Bea narrows thousands of options to a curated shortlist based on your preferences |
| **Agent escalation** | One tap to connect with a human Balkanea agent when you need reassurance |
| **In-app booking + payment** | Select a hotel, pay by card, get instant confirmation |
| **Booking management** | View, modify, or cancel your bookings from your dashboard |
| **Macedonian-first UI** | Full app experience in Macedonian, with English as secondary language |
| **Salesforce CRM** | Every user, conversation, and booking syncs to Salesforce for the team |
| **Popular destinations** | Curated for Balkan travelers — Greece, Turkey, Italy, Egypt, Croatia, and more |

---

## What's Not in v1 (Roadmap)

These are valuable features that we've deliberately deferred to keep the MVP focused and the budget realistic. The architecture will be designed so they can be added later without rebuilding.

| Feature | When |
|---------|------|
| Multiple hotel providers (beyond RateHawk) + smart room matching | v2 — after RateHawk model is proven |
| Flights + flight+hotel packages | v2 — not yet on the website either |
| Rewards / loyalty program | v2 — once there's a user base to reward |
| Travel content / destination guides | Stays on website only |
| Group travel (20+ people) | Not the primary market |
| Restaurant reservations | Future exploration |

**Architecture principle:** We build the interfaces for multi-provider, flights, and business rules now — but only implement the RateHawk path. When you're ready for v2, the plumbing is already there.

---

## What We've Already Built (Prototype)

A working prototype exists today in Expo Go on iPhone. It demonstrates the core experience:

| Component | Status |
|-----------|--------|
| Mobile app framework (iOS + Android + Web) | Working |
| Premium design system (Balkanea brand) | Working |
| Bea voice AI (Macedonian + English) | Working |
| Chat-based trip planning | Working |
| Hotel search results UI | Working (simulated data) |
| Destination exploration | Working (needs pivot to outbound) |
| Saved trips | Working (needs real backend) |

For the MVP, we keep the framework, design system, and Bea voice AI. We replace simulated data with real RateHawk bookings, add user accounts, payments, and Salesforce integration.

---

## Questions We Need Answered

Before we can write the detailed SOW, we need answers to these questions. Some may require a follow-up session.

### Booking & Revenue
1. What **payment methods** do your customers use? Credit card only, or also bank transfer or local methods?
2. What is the **commission/margin** arrangement with RateHawk?
3. Can we get **RateHawk production API access** activated? The sandbox credentials aren't working.
4. Who handles **cancellations and refunds** — Balkanea or RateHawk directly?
5. What is a typical **booking value** in euros?

### The Personal Touch
6. What are the **top 5 reasons** your customers prefer an agency over Booking? (This shapes what Bea needs to do well)
7. When a customer asks to speak to a human, what **response time** do you expect? Instant chat, or callback within a few hours?
8. How many **agents** are available to handle escalations at launch?
9. Do you currently use **Salesforce for case management / chat**, or would we need to set that up?

### Market
10. Do we **launch in Macedonia first**, then expand? Or all Balkans from day one?
11. Are **other languages** needed at launch beyond Macedonian and English?
12. Can you confirm the **most popular destinations** your customers book? (So we can prioritize what Bea knows best)

### Business
13. What is the **budget range** for the MVP build?
14. What is the **target launch date**?
15. Who **approves** the final SOW?

---

## Next Steps

| Step | Who | When |
|------|-----|------|
| Review this document | Luke, Jasmina, Gorjan | This week |
| Answer the 15 clarification questions | Jasmina + Luke | Before next session |
| Requirements clarification session (1-2 hours) | All | Next week |
| Draft SOW v1 with user stories + technical architecture | Ray / MARRA | Following week |
| SOW review + sign-off | Luke + Jasmina | TBD |
| Build begins | MARRA | Upon sign-off |

---

*Prepared by MARRA Global — Building the future of Balkan travel, one conversation at a time.*
