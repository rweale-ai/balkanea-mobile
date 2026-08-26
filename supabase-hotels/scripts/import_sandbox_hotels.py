"""
Import RateHawk's real SANDBOX hotel dump into the sandbox.hotels/
sandbox.rooms schema (20260826000000_sandbox_hotels_schema.sql).

Source: RateHawk's hotel/info/dump/ endpoint
(https://docs.emergingtravel.com/docs/b2b-api/static-content/retrieve-hotel-dump/),
called live against sandbox credentials -- returns a URL to a real
.jsonl.zst file. Confirmed 2026-08-25/26: 742 hotels, fixed synthetic test
inventory across exactly three regions/countries RateHawk sandbox actually
has rate data for (FR/Paris 249, AE/Dubai 247, US/Los Angeles 246).

Deliberately does NOT apply import_hotels.py's TARGET_COUNTRIES filter --
Ray, 2026-08-26: load the full sandbox dump regardless of country, since
the point is testing the pipeline against whatever sandbox actually has,
not matching production's target markets.

Re-runnable: same upsert-on-conflict pattern as import_hotels.py.

Usage:
    python import_sandbox_hotels.py
    (fetches the dump live from RateHawk each run -- no local file needed)

Requires SUPABASE_DB_URL and RATEHAWK_KEY_ID/RATEHAWK_API_KEY in .env
alongside this script.
"""

import io
import json
import os
import zstandard
import psycopg2
import psycopg2.extras
import urllib.request
import http.client
import base64


def load_env():
    env_path = os.path.join(os.path.dirname(__file__), "..", ".env")
    values = {}
    with open(env_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if "=" in line and not line.startswith("#"):
                k, v = line.split("=", 1)
                values[k] = v
    return values


def fetch_dump_url(key_id, api_key):
    auth = base64.b64encode(f"{key_id}:{api_key}".encode()).decode()
    conn = http.client.HTTPSConnection("api-sandbox.worldota.net", timeout=15)
    body = json.dumps({"inventory": "all", "language": "en"})
    conn.request(
        "POST", "/api/b2b/v3/hotel/info/dump/", body,
        {"Authorization": f"Basic {auth}", "Content-Type": "application/json"},
    )
    res = conn.getresponse()
    data = json.loads(res.read())
    conn.close()
    if data.get("status") != "ok":
        raise RuntimeError(f"dump request failed: {data}")
    return data["data"]["url"], data["data"]["last_update"]


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
    insert into sandbox.hotels (
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
    insert into sandbox.rooms (
        hotel_hid, country_code, room_group_id, name,
        room_amenities, rg_ext, name_struct, images
    ) values %s
    on conflict (country_code, hotel_hid, room_group_id) do update set
        name = excluded.name, room_amenities = excluded.room_amenities,
        rg_ext = excluded.rg_ext, name_struct = excluded.name_struct,
        images = excluded.images, updated_at = now()
"""


def main():
    env = load_env()
    db_url = env["SUPABASE_DB_URL"]
    key_id = env.get("RATEHAWK_KEY_ID", "973")
    api_key = env.get("RATEHAWK_API_KEY", "8bc39f4d-07ee-4fc8-a89a-931074bd79da")

    print("Requesting sandbox hotel dump from RateHawk...")
    url, last_update = fetch_dump_url(key_id, api_key)
    print(f"Dump URL: {url}")
    print(f"RateHawk last_update: {last_update}")

    print("Downloading + decompressing...")
    with urllib.request.urlopen(url, timeout=60) as resp:
        compressed = resp.read()
    dctx = zstandard.ZstdDecompressor()
    text = dctx.stream_reader(io.BytesIO(compressed)).read().decode("utf-8", errors="replace")
    lines = [l for l in text.split("\n") if l.strip()]
    print(f"Records in dump: {len(lines)}")

    conn = psycopg2.connect(db_url)
    conn.autocommit = False
    cur = conn.cursor()

    hotel_batch = {}
    room_batch = {}
    matched = 0
    skipped_deleted = 0
    parse_errors = 0

    for line in lines:
        try:
            rec = json.loads(line)
        except Exception:
            parse_errors += 1
            continue

        country_code = (rec.get("region") or {}).get("country_code")
        if not country_code:
            continue
        if rec.get("deleted"):
            skipped_deleted += 1
            continue

        matched += 1
        hrow = hotel_row(rec, country_code)
        hotel_batch[(hrow[1], hrow[0])] = hrow
        for rrow in room_rows(rec, country_code):
            room_batch[(rrow[1], rrow[0], rrow[2])] = rrow

    if hotel_batch:
        psycopg2.extras.execute_values(cur, HOTEL_UPSERT, list(hotel_batch.values()))
    if room_batch:
        psycopg2.extras.execute_values(cur, ROOM_UPSERT, list(room_batch.values()))
    conn.commit()

    cur.execute("select count(*) from sandbox.hotels;")
    hotel_count = cur.fetchone()[0]
    cur.execute("select count(*) from sandbox.rooms;")
    room_count = cur.fetchone()[0]
    cur.execute("select country_code, count(*) from sandbox.hotels group by country_code order by 2 desc;")
    by_country = cur.fetchall()

    cur.close()
    conn.close()

    print(f"\nDone.")
    print(f"Records in dump: {len(lines)}")
    print(f"Matched (not deleted): {matched}")
    print(f"Skipped as deleted: {skipped_deleted}")
    print(f"Parse errors: {parse_errors}")
    print(f"sandbox.hotels row count: {hotel_count}")
    print(f"sandbox.rooms row count: {room_count}")
    print(f"By country: {by_country}")


if __name__ == "__main__":
    main()
