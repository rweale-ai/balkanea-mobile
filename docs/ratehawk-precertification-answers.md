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
| Cancel | Taps "Cancel booking" (signed-in guest) | `hotel/order/cancel/` **[code, new 2026-09-28]** — guest refund is a separate manual step **[DECISION]** |

## 3. Payment type
Form returns `payment_types[0]`; sandbox returns `deposit` and the app uses
it **[code]**. Balkanea charges the guest itself via Bankart, so this is the
B2B deposit model — confirm with RateHawk **[DECISION]**.

## 4. Search step
- **match_hash:** not used; prebook uses the rate's `book_hash` **[code]**.
- **Prebook / price_increase_percent:** not sent (0%) **[code]**. A price
  increase makes prebook fail → the guest is told the room is unavailable
  and is not charged. The app does not read `price_changed` (a price
  *decrease* after prebook is not passed on). Scenario 4 (Rosa Bell +10%)
  is only mandatory if we allow increases — we currently don't **[DECISION]**.
- **Prebook timeout:** within ETG's 60 s. Sandbox requests allow 55 s
  (measured 8–39 s); production requests 12 s **[code]** — 12 s is tight
  for prebook in production; consider raising **[DECISION]**.
- **Multiroom:** supported, several rooms in ONE rate/`book_hash` (same
  room type for all rooms) **[code]**.
- **Children:** supported with ages; the app asks ages before pricing **[code]**.
- **Residency:** always `gb` today (production region search: `mk`).
  Should be the guest's real residency (most guests: `mk`) **[DECISION + code
  follow-up]**.
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
