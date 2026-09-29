# RateHawk Pre-Certification Checklist — draft answers (mobile app)

Draft, 2026-09-28. Answers marked **[code]** are what the code on branches
`fix/mobile-ratehawk-sandbox` (Chat + Mobile) actually does today.
Answers marked **[DECISION]** are business choices for Ray / Hristijan and
must be confirmed before this goes to RateHawk.

Source checklist: the Pre-Certification Checklist Google Doc from Sofia's
2026-08-17 sandbox-key email (thread APIR-54741).

## 1. Test bookings (sandbox, key 973)

| # | Scenario | Hotel | Result | Order |
|---|---|---|---|---|
| 1 | Multiroom (2A+child 3 / 2A+children 1,5,17) | Conrad LA 10004834 | **ok — through the app's backend handlers** (hotel-rooms → prebook → form → finish → status), 2026-09-28 | 100070843 (`balkanea-cert-1790610673234-multiroom-app`), since cancelled via `/hotel/order/cancel/` |
| 1–7 | All seven checklist scenarios | Conrad / Rosa Bell | re-run 2026-09-28 with `Chat/scripts/test-ratehawk-scenarios.js`: 5 as expected, 2 blocked by sandbox `rate_not_found` | see §8 |

Scenarios 2 (Uzbekistan residency) and 3 (Monaco residency + children) run
through the script only — the app does not yet send the guest's real
residency (see §4).

## 2. Workflow (search → cancellation)

| Step | User action | ETG endpoint(s) |
|---|---|---|
| Search | Asks Nea / searches a destination (sandbox: Los Angeles, Paris, Dubai) | `search/serp/hotels/` with the destination's hotel ids **[code]** (production path for the website: `search/multicomplete/` + `search/serp/region/`) |
| Hotel page / rooms | Opens a hotel, sees rooms | `search/hp/` with the real per-room guests (children with ages) **[code]** |
| Hold | Opens the booking screen for a room | `hotel/prebook/` (no `price_increase_percent`) **[code]** |
| Create order | Taps Pay | `hotel/order/booking/form/` **[code]** |
| Payment | Pays by card (Bankart, Balkanea as merchant) | — (Balkanea's gateway) |
| Confirm | After payment succeeds | `hotel/order/booking/finish/` with one `rooms[]` entry per room, then polls `hotel/order/booking/finish/status/` **[code]** |
| Documents | Views voucher / invoice | `hotel/order/document/voucher/download/`, `.../info_invoice/download/` **[code]** |
| Cancel | Taps "Cancel booking" (signed-in guest) | `hotel/order/cancel/` **[code, new 2026-09-28]** — the booking is marked **refund due** (facts: guest paid, RateHawk penalty/refund), ops are emailed and see it in the ops portal, and they refund manually in Bankart **[code; Ray 2026-09-29]** |

## 3. Payment type
Form returns `payment_types[0]`; sandbox returns `deposit` and the app uses
it **[code]**. Balkanea charges the guest itself via Bankart, so this is the
B2B deposit model — confirm with RateHawk **[DECISION]**.

## 4. Search step
- **match_hash:** not used; prebook uses the rate's `book_hash` **[code]**.
- **Prebook / price_increase_percent:** the app sends **20%** **[code; value
  is Ray's call, 2026-09-29]**. RateHawk may lock the room up to 20% above the
  quote; the booking screen then charges exactly the locked `show_amount`
  and tells the guest the price changed before they pay. A lower locked
  price is passed on. Above 20% → prebook fails → "room unavailable", no
  charge. The price is fixed from the hold through payment. So scenario 4
  (Rosa Bell +10%) applies — verified 2026-09-29: quote EUR 211 → locked
  231.99, `price_changed: true`. The website sends no percentage (unchanged).
- **Prebook timeout:** within ETG's 60 s. Sandbox requests allow 55 s
  (measured 8–39 s); production requests 12 s **[code]** — 12 s is tight
  for prebook in production; consider raising **[DECISION]**.
- **Multiroom:** supported, several rooms in ONE rate/`book_hash` (same
  room type for all rooms) **[code]**.
- **Children:** supported with ages; the app asks ages before pricing **[code]**.
- **Residency:** the guest's country from the app's country selector,
  **default `mk`** **[code; Ray 2026-09-29]**, sent on search, room rates and
  Nea's searches (the book_hash is bound to it). The Uzbekistan/Monaco
  certification cases are run by script (the app's country list is the
  Balkans + a few markets).
- **Search timeouts:** 12 s per RateHawk call (sandbox order steps 45–55 s) **[code]**.
- **Final price field:** `payment_options.payment_types[0].show_amount` **[code]**.
- **Commission:** which side calculates it **[DECISION]**.
- **Rate name field:** `room_name` from the search step **[code]**
  (`room_data_trans.main_name` used only as a grouping fallback).

## 5. RPM (expected requests per minute)
`/serp/hotels`, `/serp/region`, `/serp/geo`, `/search/hp`, `/hotel/prebook`,
`/serp/prebook` — **[DECISION]**. For reference, sandbox limits seen on the
key: order endpoints 30 per 60 s; dumps 100 per day; content 30 per 60 s.

## 6. Static data
- **Sync method:** `hotel/info/dump/` for the initial load plus
  `hotel/info/incremental_dump/` for updates
  (`Mobile/supabase-hotels/scripts/import_hotels_incremental.js`) **[code]**;
  update frequency (daily?) **[DECISION]**. Production DB: ~3.48M hotels / 18.5M
  rooms (balkanea_hotels_poc_v2); sandbox: 742 hotels.
- **Regions:** resolved live with `search/multicomplete/` (production); a
  `region_names` lookup table serves typeahead **[code]**.
- **Room static data:** room images/amenities matched by `room_name`
  (normalized) **[code]**.
- **Reviews:** `hotel/reviews/dump/` (sandbox: 36 rated hotels, 26 reviews),
  shown as the guest rating and review count **[code]**.

## 7. IP whitelisting
Not needed for the sandbox. Production calls go through the static-IP relay
(`RATEHAWK_PROXY_URL`) **[code]** — relay health must be confirmed before
production testing **[DECISION/ops]**.

## 8. Fresh scenario run (2026-09-28, sandbox key 973)

`Chat/scripts/test-ratehawk-scenarios.js`, two passes (the second retried
the failures with ~17 min of status polling).

| # | Scenario | Result | order_id / partner_order_id |
|---|---|---|---|
| 1 | Multiroom (2A+child 3 / 2A+children 1,5,17) | ok | 100070849 / balkanea-cert-1790611129050-multiroom (also 100070843 via the app's handlers) |
| 2 | Uzbekistan residency | ok | 100070855 / balkanea-cert-1790611337814-uzbekistan |
| 3 | Children, Monaco residency (0y, 17y) | **failed 3×** — `rate_not_found` right after a successful prebook (form, then finish). Passed on 2026-08-24 (100051193) | 100070883 / balkanea-cert-1790611905749-children |
| 4 | Prebook +10% (Rosa Bell) | ok | 100070861 / balkanea-cert-1790611453004-priceincrease |
| 5 | unknown → success | ok (2nd pass; 1st pass `rate_not_found` at form) | 100070889 / balkanea-cert-1790612008948-unknown_success |
| 6 | unknown → soldout | error `soldout` (expected) | 100070879 / balkanea-cert-1790611747643-unknown_soldout |
| 7 | unknown ×2 → book_limit | **not reproduced** — both passes `rate_not_found` at finish → `booking_finish_did_not_succeed`. Passed on 2026-08-24 (book_limit after ~15 min) | 100070891 / balkanea-cert-1790612089284-unknown_book_limit |

`rate_not_found` appeared on the same Conrad room that booked fine in the
other scenarios, during a day of sandbox instability (HTTP 522s, 20–40 s
responses). **Ask RateHawk** whether the sandbox rates for scenarios 3 and 7
changed, or submit the 2026-08-24 order ids for those two.

## 9. Before production (deploy checklist)
1. Merge + deploy Chat PRs (#2, then #3) **before** any app build — an app
   build against the old backend loses Nea and sandbox routing.
2. Chat Vercel env: `ANTHROPIC_API_KEY` set for Preview **and** Production.
3. Ship the app build (Mobile PRs #1, #2).
4. **Rotate the Anthropic key after testers have the new build** (Ray,
   2026-09-29) — every earlier build contains it. Then remove
   `EXPO_PUBLIC_CLAUDE_API_KEY` from Mobile `.env` and EAS.
5. Add a real per-IP rate limit on `/api/nea-chat` before production traffic.
6. Switching the app to test production later: `EXPO_PUBLIC_RATEHAWK_ENV=test-production`.

## 10. Sandbox test-case run, 2026-09-29 (all 7 behave as expected)

These ran against api-sandbox.worldota.net with key 973, using the 5-step flow: search, prebook, booking form, finish, status poll. They were run with a direct test script, not through the app's UI.

| Test case | Order ID | Result |
|---|---|---|
| Multi-room (mixed adults and children) | 100072071 | ok |
| Children, Monaco residency | 100072075 | ok |
| Uzbekistan citizenship | 100072083 | ok |
| Prebook 10% price increase (Rosa Bell Motel) | 100072085 | ok |
| Unknown error, then success | 100072089 | ok after retries |
| Unknown error, then soldout | 100072091 | failed with `soldout` (expected) |
| Unknown error, then book_limit | 100072093 | failed with `book_limit` (expected) |

On 9/28 the Monaco and book_limit cases failed with `rate_not_found`. That was a temporary sandbox problem, and they pass on this rerun.
