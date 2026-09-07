# RateHawk Hotel DB — Load Metrics

Real, measured performance data from the `balkanea_hotels_poc_v2` full-dump import (2026-09-05/06) and the first daily incremental test (2026-09-06/07). All numbers below are from actual runs, not estimates, except where explicitly marked as an estimate.

## Environment

- **Project:** `balkanea_hotels_poc_v2` (Supabase, ref `fojvwgzngnggzxpvpiym`, region `eu-west-1`, Postgres 17)
- **Compute:** Medium (4GB RAM / 2-core)
- **Disk:** 60GB provisioned from creation
- **Schema:** `hotels`/`rooms`, partitioned by `country_code`, 250 partitions (every ISO 3166-1 alpha-2 code)

## Bulk (full) load — 2026-09-05

### Final volumes

| Metric | Value |
|---|---|
| Hotels loaded | 3,484,416 |
| Rooms loaded | 18,510,072 |
| Rooms per hotel (avg) | 5.31 |
| Source dump (compressed, `.jsonl.zst`) | ~2.87 GB (3,085,599,448 bytes) |
| Compressed bytes / hotel | ~886 bytes |
| Final DB size (post index rebuild) | 32 GB |
| Disk utilization | 53% of 60 GB provisioned |
| Uncompressed storage / hotel (DB, incl. rooms + indexes) | ~9.6 KB |

### Timing

| Phase | Duration |
|---|---|
| Bulk load (post index-drop restart, streaming + upsert) | 29,168s (8.10 hours) |
| Index/FK rebuild (6 indexes + 1 FK, after load) | 578s (9.6 minutes) |
| **Total end-to-end** | **~29,746s (~8.26 hours)** |

### Throughput — real vs. index-maintenance overhead

The load was run twice: an initial attempt with all indexes live throughout, and a restart with 6 secondary indexes + 1 FK dropped before loading (kept only the 3 indexes required for the upsert's `ON CONFLICT`), rebuilt afterward. This was a real, measured fix, not a guess — first attempt showed sustained decay from index-maintenance cost growing with table size; the fix held.

**Attempt 1 (all indexes live) — decayed under sustained index-maintenance cost:**

| Segment | Hotels/sec |
|---|---|
| 0 → ~114K (early burst) | ~375/s |
| ~114K → 500K | ~125/s |
| 500K → 630K | ~45/s |

**Attempt 2 (6 secondary indexes + FK dropped, rebuilt after) — held far better, with one real transient dip:**

| Segment (matched count) | Hotels/sec |
|---|---|
| 0 → 500K (mostly re-upserts of attempt-1 data) | ~142/s |
| 500K → 1.0M | ~48.6/s (real dip — investigated, proved transient) |
| 1.0M → 1.5M | ~84.2 → 96.5/s (recovering) |
| 1.5M → 2.0M | ~200.2/s |
| 2.0M → 2.5M | ~203.7/s |
| 2.5M → 3.0M | ~160.3/s |
| 3.0M → 3.48M (final) | ~198.8/s |

Settled into a **~150–200/s band** for the back half of the run — roughly 3-4x the pre-fix decayed rate (~45/s), and never resumed decaying once past the transient dip. The dip itself was root-caused to per-segment content variance (some countries carry heavier hotel/room payloads than others), not a resource limit or a sign the index fix wasn't working.

**Index rebuild timings** (bulk build against the fully-loaded table, for sizing future runs):

| Index/constraint | Build time |
|---|---|
| `idx_hotels_region` | 38.1s |
| `idx_hotels_kind` | 39.3s |
| `idx_rooms_hotel` (rooms table, 5x the row count) | 130.7s |
| `idx_hotels_star_rating_name` | 39.8s |
| `idx_hotels_region_name_lower` | 39.0s |
| `fk_rooms_hotel` (add + validate, single step — see note) | 200.3s |
| `idx_hotels_amenity_groups_gin` (GIN) | 90.6s |

Note: Postgres does not support the usual `NOT VALID`-then-`VALIDATE`-separately two-step for a FK between two partitioned tables — `fk_rooms_hotel` had to be added as a single blocking `ADD CONSTRAINT` instead (validated inline across all 18.5M rooms, 0 orphans found).

## Daily incremental (delta) load — first real test, 2026-09-06/07

### Volumes

| Metric | Value |
|---|---|
| Lines scanned | 293,553 |
| Hotels upserted | 290,343 |
| Hotels soft-deleted | 0 (never observed a real `deleted: true` record yet) |
| Parse errors | 0 |
| % of full catalog changed | ~8.4% (293,553 / 3,484,416) |
| Source dump `last_update` at test time | 2026-09-01 (5 days stale relative to the 2026-09-06 test — see caveat below) |
| Source dump (compressed) | ~583 MB (611,358,296 bytes) |
| Compressed bytes / hotel | ~2,083 bytes — **~2.35x denser than the full dump's ~886 bytes/hotel** (incremental records carry more data per record on average; an earlier same-day estimate of ~690K hotels from raw byte size alone was wrong for exactly this reason — bytes-per-hotel isn't constant between the two dump types) |

### Timing

| Metric | Value |
|---|---|
| Total elapsed | 9,409s (2.61 hours) |
| Overall average throughput | ~31.2 hotels/sec |

| Segment | Hotels/sec |
|---|---|
| 0 → 50K | ~24.8/s |
| 50K → 100K | ~20.2/s |
| 100K → 150K | ~26.0/s |
| 150K → 293,553 (final) | ~47.8/s |

No index drop/rebuild was used for this run (daily volume is small enough relative to the full 3.48M-row table that it wasn't worth the operational overhead) — throughput here reflects normal upsert cost against the fully-indexed live table.

### Caveat — this is one data point, not yet a baseline

The tested file's `last_update` was 5 days stale, so ~293K changed hotels may overstate what a genuinely fresh, run-daily cadence looks like (RateHawk's own model is daily incremental on top of a weekly full dump — see `project_balkanea_ratehawk_incremental_dump` memory). A scheduled test is running 2026-09-07 05:00 ET against a fresher file; update this doc with that result once it completes, and again after a few more days, before treating either number as "normal."

## Playbook reference

Full reusable checklist (provisioning size, index drop/rebuild sequence, performance-tracking setup, known gotchas) is in memory as `project_balkanea_full_dump_import_playbook` — not duplicated here to avoid drift between the two.
