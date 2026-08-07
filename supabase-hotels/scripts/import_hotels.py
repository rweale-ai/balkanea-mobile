"""
Import hotel content from RateHawk's static-content dump into the
partitioned hotels/rooms tables.

Source: a JSONL export from RateHawk's retrieve_hotel_dump endpoint
(https://docs.emergingtravel.com/docs/b2b-api/static-content/retrieve-hotel-dump/),
provided by Hristijan (Balkanea) via cPanel/FTP. Current source file is
English-only (combined_all_hotels.jsonl, ~53GB) — see the hotel-DB proposal
doc for the language history; some individual hotels may still fall back to
a non-English language per Hristijan's note.

Scope (Ray, 2026-08-06):
  - Countries: filtered to the 10 current destination countries only.
  - Property kind (Hotel/Apartment/Guesthouse/etc.): NOT filtered — every
    kind is imported. Filtering by kind is a business/product decision still
    pending Luke's input; do it at query time once decided, not here.

Re-runnable: upserts on (country_code, hid) for hotels and
(country_code, hotel_hid, room_group_id) for rooms, so this can be re-run on
a refresh cadence (daily, per RateHawk's own guidance relayed by Hristijan)
without creating duplicates.

Usage:
    python import_hotels.py [path-to-jsonl]
    (defaults to D:\\balkanea-hotel-data\\combined_all_hotels.jsonl)

Requires SUPABASE_DB_URL in a .env file alongside this script (not committed).
"""

import json
import os
import sys
import time

import psycopg2
import psycopg2.extras

TARGET_COUNTRIES = {"HR", "CZ", "EG", "FR", "GR", "IT", "ME", "MK", "ES", "TR"}
BATCH_SIZE = 2000
DEFAULT_SOURCE = r"D:\balkanea-hotel-data\combined_all_hotels.jsonl"


def load_db_url():
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line.startswith("SUPABASE_DB_URL="):
                return line.split("=", 1)[1].strip()
    raise RuntimeError("SUPABASE_DB_URL not found in .env")


def hotel_row(rec, country_code):
    return (
        rec.get("hid"),
        country_code,
        rec.get("id"),
        rec.get("name"),
        rec.get("kind"),
        rec.get("star_rating"),
        rec.get("address"),
        (rec.get("region") or {}).get("id"),
        (rec.get("region") or {}).get("name"),
        (rec.get("region") or {}).get("type"),
        rec.get("latitude"),
        rec.get("longitude"),
        rec.get("phone"),
        rec.get("email"),
        rec.get("postal_code"),
        rec.get("check_in_time"),
        rec.get("check_out_time"),
        psycopg2.extras.Json(rec.get("images") or []),
        psycopg2.extras.Json(rec.get("amenity_groups") or []),
        psycopg2.extras.Json(rec.get("description_struct") or []),
        bool(rec.get("deleted") or False),
        "en",
    )


def room_rows(rec, country_code):
    hid = rec.get("hid")
    for rg in rec.get("room_groups") or []:
        yield (
            hid,
            country_code,
            rg.get("room_group_id"),
            rg.get("name"),
            psycopg2.extras.Json(rg.get("room_amenities") or []),
            psycopg2.extras.Json(rg.get("rg_ext") or {}),
            psycopg2.extras.Json(rg.get("name_struct") or {}),
            psycopg2.extras.Json(rg.get("images") or []),
        )


HOTEL_UPSERT = """
    insert into hotels (
        hid, country_code, slug, name, kind, star_rating, address,
        region_id, region_name, region_type, latitude, longitude,
        phone, email, postal_code, check_in_time, check_out_time,
        images, amenity_groups, description_struct, is_deleted, source_language
    ) values %s
    on conflict (country_code, hid) do update set
        slug = excluded.slug, name = excluded.name, kind = excluded.kind,
        star_rating = excluded.star_rating, address = excluded.address,
        region_id = excluded.region_id, region_name = excluded.region_name,
        region_type = excluded.region_type, latitude = excluded.latitude,
        longitude = excluded.longitude, phone = excluded.phone, email = excluded.email,
        postal_code = excluded.postal_code, check_in_time = excluded.check_in_time,
        check_out_time = excluded.check_out_time, images = excluded.images,
        amenity_groups = excluded.amenity_groups, description_struct = excluded.description_struct,
        is_deleted = excluded.is_deleted, source_language = excluded.source_language,
        updated_at = now()
"""

ROOM_UPSERT = """
    insert into rooms (
        hotel_hid, country_code, room_group_id, name,
        room_amenities, rg_ext, name_struct, images
    ) values %s
    on conflict (country_code, hotel_hid, room_group_id) do update set
        name = excluded.name, room_amenities = excluded.room_amenities,
        rg_ext = excluded.rg_ext, name_struct = excluded.name_struct,
        images = excluded.images, updated_at = now()
"""


def get_db_size_mb(conn):
    with conn.cursor() as c:
        c.execute("select pg_database_size(current_database());")
        return c.fetchone()[0] / (1024 * 1024)


def main():
    source = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_SOURCE
    db_url = load_db_url()

    conn = psycopg2.connect(db_url)
    conn.autocommit = False
    cur = conn.cursor()

    # Keyed by natural key, not lists — de-duplicates within a batch, which
    # Postgres requires (ON CONFLICT DO UPDATE errors if the same batch tries
    # to touch the same row twice; the source data has some duplicate hotel/
    # room records, last-one-wins here matches the upsert semantics used on
    # conflict). Known gap: rooms with a null room_group_id all collide on
    # this key within a single Python dict, unlike Postgres's unique
    # constraint which treats nulls as distinct — accepted, same edge case
    # noted in the migration.
    hotel_batch = {}
    room_batch = {}
    scanned = 0
    matched = 0
    skipped_deleted = 0
    parse_errors = 0
    start = time.time()

    def reconnect():
        nonlocal conn, cur
        try:
            conn.close()
        except Exception:
            pass
        conn = psycopg2.connect(db_url)
        conn.autocommit = False
        cur = conn.cursor()

    def flush():
        nonlocal conn, cur
        for attempt in range(5):
            try:
                if hotel_batch:
                    psycopg2.extras.execute_values(cur, HOTEL_UPSERT, list(hotel_batch.values()))
                if room_batch:
                    psycopg2.extras.execute_values(cur, ROOM_UPSERT, list(room_batch.values()))
                conn.commit()
                hotel_batch.clear()
                room_batch.clear()
                return
            except psycopg2.OperationalError as e:
                print(f"flush failed (attempt {attempt + 1}/5): {e}", flush=True)
                time.sleep(10)
                reconnect()
        raise RuntimeError("flush failed after 5 retries")

    with open(source, "r", encoding="utf-8", errors="replace") as f:
        for line in f:
            scanned += 1
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
            except Exception:
                parse_errors += 1
                continue

            country_code = (rec.get("region") or {}).get("country_code")
            if country_code not in TARGET_COUNTRIES:
                continue
            if rec.get("deleted"):
                skipped_deleted += 1
                continue

            matched += 1
            hrow = hotel_row(rec, country_code)
            hotel_batch[(hrow[1], hrow[0])] = hrow  # (country_code, hid)
            for rrow in room_rows(rec, country_code):
                room_batch[(rrow[1], rrow[0], rrow[2])] = rrow  # (country_code, hotel_hid, room_group_id)

            if len(hotel_batch) >= BATCH_SIZE:
                flush()

            if scanned % 500_000 == 0:
                elapsed = time.time() - start
                print(f"scanned {scanned:,} lines | matched {matched:,} | "
                      f"errors {parse_errors} | {elapsed:.0f}s elapsed | "
                      f"db size {get_db_size_mb(conn):.0f}MB", flush=True)

    flush()
    cur.close()
    conn.close()

    elapsed = time.time() - start
    print(f"\nDone in {elapsed:.0f}s")
    print(f"Lines scanned: {scanned:,}")
    print(f"Hotels matched (target countries, not deleted): {matched:,}")
    print(f"Skipped as deleted: {skipped_deleted:,}")
    print(f"Parse errors: {parse_errors}")


if __name__ == "__main__":
    main()
