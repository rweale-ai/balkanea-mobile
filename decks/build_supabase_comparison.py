# Builds Balkanea-Supabase-vs-MySQL-Comparison.pptx from scratch.
# Matches the established visual system from Balkanea-Production-RateHawk-Status.pptx
# (dark green title slide #00332A, warm off-white content slides #FAF7F2,
# white cards, green "Live" status pills, Segoe UI / Segoe UI Semibold).

from pptx import Presentation
from pptx.util import Emu, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.chart.data import CategoryChartData
from pptx.enum.chart import XL_CHART_TYPE, XL_LEGEND_POSITION

# ---- palette (sampled from the existing deck) ----
DARK_BG      = RGBColor(0x00, 0x33, 0x2A)
LIGHT_BG     = RGBColor(0xFA, 0xF7, 0xF2)
CARD_WHITE   = RGBColor(0xFF, 0xFF, 0xFF)
PILL_GREEN_BG= RGBColor(0xE1, 0xEF, 0xE6)
PILL_GREEN_TX= RGBColor(0x1F, 0x7A, 0x4D)
PILL_AMBER_BG= RGBColor(0xFB, 0xE8, 0xD3)
PILL_AMBER_TX= RGBColor(0x9A, 0x5B, 0x0C)
PILL_BLUE_BG = RGBColor(0xDD, 0xE9, 0xF7)
PILL_BLUE_TX = RGBColor(0x1C, 0x4E, 0x80)
TITLE_CREAM  = RGBColor(0xFB, 0xF6, 0xEE)
SUBTITLE_1   = RGBColor(0xC9, 0xD9, 0xD3)
SUBTITLE_2   = RGBColor(0x9F, 0xB8, 0xAE)
EYEBROW_ORG  = RGBColor(0xED, 0x83, 0x23)
SECTION_HDR  = RGBColor(0x7A, 0x3E, 0x0F)
CARD_TITLE   = RGBColor(0x1A, 0x1A, 0x2E)
CARD_BODY    = RGBColor(0x6B, 0x65, 0x58)
FOOTER_GRAY  = RGBColor(0x9B, 0x93, 0x84)
WARN_BG      = RGBColor(0xFC, 0xE8, 0xE6)
WARN_TX      = RGBColor(0xA8, 0x2A, 0x1E)
GREEN_BAR    = RGBColor(0x1F, 0x7A, 0x4D)
AMBER_BAR    = RGBColor(0xE0, 0x8E, 0x1D)

FONT = "Segoe UI"
FONT_SB = "Segoe UI Semibold"

SLIDE_W = Emu(12192000)
SLIDE_H = Emu(6858000)
MARGIN = Emu(502920)
CONTENT_W = Emu(11185855)

prs = Presentation()
prs.slide_width = SLIDE_W
prs.slide_height = SLIDE_H
BLANK = prs.slide_layouts[6]

FOOTER_LABEL = "BALKANEA WEB  •  SUPABASE VS MYSQL COMPARISON"


def set_bg(slide, color):
    fill = slide.background.fill
    fill.solid()
    fill.fore_color.rgb = color


def add_text(slide, left, top, width, height, text, size, color, bold=False,
             font=FONT, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, line_spacing=None,
             wrap=True):
    box = slide.shapes.add_textbox(left, top, width, height)
    tf = box.text_frame
    tf.word_wrap = wrap
    tf.vertical_anchor = anchor
    tf.margin_left = 0
    tf.margin_right = 0
    tf.margin_top = 0
    tf.margin_bottom = 0
    lines = text.split("\n")
    for i, line in enumerate(lines):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = align
        if line_spacing:
            p.line_spacing = line_spacing
        run = p.add_run()
        run.text = line
        run.font.size = Pt(size)
        run.font.color.rgb = color
        run.font.bold = bold
        run.font.name = font
    return box


def add_pill(slide, left, top, text, bg, tx, width=Emu(900000)):
    shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, Emu(280000))
    shape.adjustments[0] = 0.5
    shape.fill.solid()
    shape.fill.fore_color.rgb = bg
    shape.line.fill.background()
    shape.shadow.inherit = False
    tf = shape.text_frame
    tf.margin_left = Emu(60000)
    tf.margin_right = Emu(60000)
    tf.margin_top = 0
    tf.margin_bottom = 0
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    p = tf.paragraphs[0]
    p.alignment = PP_ALIGN.CENTER
    run = p.add_run()
    run.text = text
    run.font.size = Pt(10)
    run.font.bold = True
    run.font.color.rgb = tx
    run.font.name = FONT_SB
    return shape


def add_card(slide, top, height, title, body, pill_text=None, pill_bg=PILL_GREEN_BG, pill_tx=PILL_GREEN_TX):
    card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, MARGIN, top, CONTENT_W, height)
    card.adjustments[0] = 0.035
    card.fill.solid()
    card.fill.fore_color.rgb = CARD_WHITE
    card.line.color.rgb = RGBColor(0xEC, 0xE6, 0xDC)
    card.line.width = Pt(0.75)
    card.shadow.inherit = False
    pad = Emu(280000)
    text_w = CONTENT_W - pad * 2 - (Emu(1000000) if pill_text else Emu(0))
    add_text(slide, MARGIN + pad, top + Emu(160000), text_w, Emu(360000), title, 15, CARD_TITLE, bold=True, font=FONT_SB)
    add_text(slide, MARGIN + pad, top + Emu(560000), text_w, height - Emu(700000), body, 11, CARD_BODY, line_spacing=1.15)
    if pill_text:
        add_pill(slide, MARGIN + CONTENT_W - Emu(1000000) - pad, top + Emu(200000), pill_text, pill_bg, pill_tx, width=Emu(1000000))
    return card


def add_footer(slide, page_num, label=FOOTER_LABEL):
    add_text(slide, MARGIN, SLIDE_H - Emu(340000), Emu(9000000), Emu(240000), label, 9, FOOTER_GRAY, font=FONT)
    add_text(slide, SLIDE_W - Emu(700000), SLIDE_H - Emu(340000), Emu(400000), Emu(240000), str(page_num), 9, FOOTER_GRAY, align=PP_ALIGN.RIGHT)


def add_section_header(slide, top, number_label, title):
    add_text(slide, MARGIN, top, CONTENT_W, Emu(300000), number_label, 13, SECTION_HDR, bold=True, font=FONT_SB)
    add_text(slide, MARGIN, top + Emu(320000), CONTENT_W, Emu(500000), title, 24, CARD_TITLE, bold=True, font=FONT_SB)


ROW_H = Emu(340000)
TITLE_OFFSET = Emu(600000)
BOTTOM_PAD = Emu(180000)


def add_row_card(slide, top, title, rows, pill_text=None, pill_bg=PILL_GREEN_BG, pill_tx=PILL_GREEN_TX):
    content_h = TITLE_OFFSET + sum(ROW_H + r[2] for r in rows) + BOTTOM_PAD
    card = add_card(slide, top, content_h, title, "", pill_text, pill_bg, pill_tx)
    ty = top + TITLE_OFFSET
    for label, val, extra in rows:
        row_h = ROW_H + extra
        add_text(slide, MARGIN + Emu(280000), ty, Emu(4200000), row_h, label, 11, CARD_BODY, line_spacing=1.1)
        add_text(slide, MARGIN + Emu(4600000), ty, Emu(6100000), row_h, val, 11, CARD_TITLE, bold=True, font=FONT_SB, line_spacing=1.1)
        ty += row_h
    return top + content_h


# ============================== SLIDE 1 — TITLE ==============================
s = prs.slides.add_slide(BLANK)
set_bg(s, DARK_BG)
add_text(s, MARGIN, Emu(1500000), CONTENT_W, Emu(300000),
         "BALKANEA WEB  •  HOTEL SEARCH DATA SOURCE", 14, EYEBROW_ORG, bold=True, font=FONT_SB)
add_text(s, MARGIN, Emu(1850000), CONTENT_W, Emu(1400000),
         "Supabase vs MySQL\nApples-to-Apples Comparison", 38, TITLE_CREAM, bold=True, font=FONT_SB, line_spacing=1.05)
add_text(s, MARGIN, Emu(3350000), Emu(9800000), Emu(700000),
         "A byte-identical fork of the real search page, with the ONLY difference being where static hotel "
         "content (name, photos, address, stars) comes from. Live RateHawk pricing is untouched on both. "
         "This deck covers what was built, today's performance work, and the real measured results.",
         14.5, SUBTITLE_1, line_spacing=1.25)
add_text(s, MARGIN, Emu(4350000), Emu(9800000), Emu(300000),
         "No production files modified  •  Fully isolated fork plugin  •  Live RateHawk pricing on both sides",
         12, SUBTITLE_2)
add_text(s, MARGIN, SLIDE_H - Emu(500000), Emu(6000000), Emu(300000), "2026-09-14  •  performance re-run 2026-09-15", 11, SUBTITLE_2)

# ============================== SLIDE 2 — WHAT WAS BUILT ==============================
s = prs.slides.add_slide(BLANK)
set_bg(s, LIGHT_BG)
add_section_header(s, Emu(560000), "01  —  WHAT WAS BUILT", "A fully isolated fork, not a code change")

add_card(s, Emu(1560000), Emu(1150000),
         "The constraint: zero production code changes",
         "Hristijan required no edits to real files (Hotel.php, HotelBatchRenderer.php, HotelSearch.batch.js, "
         "Frontend.php). Since HotelBatchRenderer hardcodes \u201cnew Hotel()\u201d internally with no injection point, "
         "subclassing wasn't viable — the only option that satisfies the constraint is a full fork.",
         "Live")
add_card(s, Emu(2810000), Emu(1150000),
         "One separate plugin, own AJAX actions, own cache",
         "balkanea-supabase-search-compare/ — its own PHP classes (SupabaseHotel, SupabaseHotelBatchRenderer), "
         "its own JS fork, and its own transient cache prefix (bkea_cmp_*) so a warm real-page cache can never "
         "give the comparison page a free hit. Active only on one comparison page URL.",
         "Live")
add_card(s, Emu(4060000), Emu(1150000),
         "Same live pricing, same template, same UI — different content source only",
         "hotels-list-v2.php template, filters, sort, map, and the live RateHawk pricing call "
         "(HotelProvideFactory) are all inherited unchanged. Only the static hotel content lookup swaps "
         "MySQL (st_hotel) for Supabase (hotels table, partitioned by country_code).",
         "Live")
add_footer(s, 2)

# ============================== SLIDE 3 — APPLES TO APPLES ==============================
s = prs.slides.add_slide(BLANK)
set_bg(s, LIGHT_BG)
add_section_header(s, Emu(560000), "02  —  METHODOLOGY", "What's identical vs. what's deliberately different")

id_rows = [
    ("Live RateHawk pricing call", "Identical — same HotelProvideFactory, same production API key", 0),
    ("Search template & UI", "Identical — hotels-list-v2.php, filters, sort, pagination", 0),
    ("Chunked loading architecture", "Identical — 14 \u2192 100 \u2192 250 hotel chunk sizing, same 3-layer cache design", 0),
    ("Map (Mapbox GL)", "Identical once fixed today — same map-search.js, same styling", 0),
]
id_bottom = add_row_card(s, Emu(1560000), "Held constant on both sides", id_rows, "Controlled", PILL_GREEN_BG, PILL_GREEN_TX)

diff_rows = [
    ("Static hotel content source", "MySQL st_hotel  vs.  Supabase hotels (partitioned by country_code)", 0),
    ("Hotel name / first photo", "Independently imported into each DB \u2014 can legitimately differ per hotel", Emu(120000)),
    ("Amenities / review-count filters", "Still MySQL-sourced on both sides \u2014 not yet ported (documented limitation)", Emu(120000)),
]
add_row_card(s, id_bottom + Emu(150000), "The one deliberate variable", diff_rows, "By design", PILL_BLUE_BG, PILL_BLUE_TX)
add_footer(s, 3)

# ============================== SLIDE 4 — TODAY'S OPTIMIZATION WORK ==============================
s = prs.slides.add_slide(BLANK)
set_bg(s, LIGHT_BG)
add_section_header(s, Emu(560000), "03  —  TODAY'S WORK", "Two backend fixes, verified live")

add_card(s, Emu(1560000), Emu(1200000),
         "Fix 1 — cache the partition key instead of re-resolving it every chunk",
         "hotels is partitioned by country_code (249 partitions); every chunk was re-running a region_names "
         "lookup for an answer that can't change within a search. Now resolved once per search and cached "
         "on the raw transient. Measured: 109ms saved per chunk (10-run isolated test, 107\u2013110ms range).",
         "Shipped")
add_card(s, Emu(2860000), Emu(1200000),
         "Fix 2 — persistent DB connections (PDO::ATTR_PERSISTENT) + transaction-mode pooling",
         "Verified empirically first: a worker-persistence probe (10 chunk-cadence-spaced requests) hit only "
         "3 distinct PHP worker PIDs \u2014 workers here do survive between chunk requests, so a persistent "
         "connection can actually be reused. Paired with port 6543 (required for persistent connections to "
         "avoid pinning dedicated Postgres backends) and EMULATE_PREPARES for pooling safety.",
         "Shipped")
add_card(s, Emu(4160000), Emu(1150000),
         "Isolated DB-layer effect \u2014 real, but a smaller slice of chunk time than hoped",
         "1,293 ms/chunk (before) \u2192 347 ms/chunk (both fixes), in an isolated DB-only benchmark. In the "
         "full request, chunk wall-time is 3.3\u20134.5s and is dominated by other shared-architecture work "
         "(the still-MySQL-sourced amenities query, filter/sort processing) \u2014 not primarily the piece fixed "
         "here. See next slide for what that means end to end.",
         "Verified", PILL_BLUE_BG, PILL_BLUE_TX)
add_footer(s, 4)

# ============================== SLIDE 5 — PERFORMANCE RESULTS (CHART) — RE-RUN 2026-09-15 ==============================
s = prs.slides.add_slide(BLANK)
set_bg(s, LIGHT_BG)
add_section_header(s, Emu(560000), "04  —  PERFORMANCE RESULTS", "Re-run 2026-09-15 — real Athens query, two fresh date ranges, both run orders")

chart_data = CategoryChartData()
chart_data.categories = ["Range A: Nov 15–18\n(MySQL run 1st)", "Range B: Dec 20–23\n(Supabase run 1st)"]
chart_data.add_series("Real production (MySQL)", (66.9, 76.6))
chart_data.add_series("Supabase (fork)", (122.3, 112.3))

chart_left, chart_top, chart_w, chart_h = MARGIN, Emu(1500000), Emu(7300000), Emu(3550000)
gframe = s.shapes.add_chart(XL_CHART_TYPE.COLUMN_CLUSTERED, chart_left, chart_top, chart_w, chart_h, chart_data)
chart = gframe.chart
chart.has_legend = True
chart.legend.position = XL_LEGEND_POSITION.BOTTOM
chart.legend.include_in_layout = False
plot = chart.plots[0]
plot.has_data_labels = True
plot.data_labels.number_format = '0.0"s"'
plot.data_labels.number_format_is_linked = False
plot.data_labels.font.size = Pt(10)
plot.data_labels.font.name = FONT
series = chart.series
series[0].format.fill.solid()
series[0].format.fill.fore_color.rgb = GREEN_BAR
series[1].format.fill.solid()
series[1].format.fill.fore_color.rgb = AMBER_BAR
chart.category_axis.tick_labels.font.size = Pt(10)
chart.value_axis.tick_labels.font.size = Pt(9)
chart.value_axis.has_title = True
chart.value_axis.axis_title.text_frame.text = "Total seconds, full search → result count settled"
chart.value_axis.axis_title.text_frame.paragraphs[0].runs[0].font.size = Pt(9)

# Right-side takeaway cards
take_left = MARGIN + chart_w + Emu(300000)
take_w = CONTENT_W - chart_w - Emu(300000)
card = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, take_left, Emu(1500000), take_w, Emu(1750000))
card.adjustments[0] = 0.06
card.fill.solid(); card.fill.fore_color.rgb = CARD_WHITE
card.line.color.rgb = RGBColor(0xEC, 0xE6, 0xDC); card.line.width = Pt(0.75)
card.shadow.inherit = False
add_text(s, take_left + Emu(220000), Emu(1650000), take_w - Emu(440000), Emu(300000), "Both sides got much slower since 9/14 — and it's not the database", 13, CARD_TITLE, bold=True, font=FONT_SB)
add_text(s, take_left + Emu(220000), Emu(2000000), take_w - Emu(440000), Emu(1150000),
         "MySQL now settles in 67–77s, Supabase in 112–122s — both far above the 14–18s "
         "baseline from 9/14. The Supabase-slower gap holds in BOTH run orders (MySQL-first and "
         "Supabase-first), so it isn't a warm-cache artifact — something got worse on both sides.",
         11, CARD_BODY, line_spacing=1.15)

card2 = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, take_left, Emu(3400000), take_w, Emu(1650000))
card2.adjustments[0] = 0.06
card2.fill.solid(); card2.fill.fore_color.rgb = CARD_WHITE
card2.line.color.rgb = RGBColor(0xEC, 0xE6, 0xDC); card2.line.width = Pt(0.75)
card2.shadow.inherit = False
add_text(s, take_left + Emu(220000), Emu(3550000), take_w - Emu(440000), Emu(300000), "Why: a repeating/duplicate request loop, worse on Supabase", 13, CARD_TITLE, bold=True, font=FONT_SB)
add_text(s, take_left + Emu(220000), Emu(3900000), take_w - Emu(440000), Emu(1050000),
         "Even driven by URL navigation (not a Search click), both sides fire literal duplicate "
         "concurrent chunk requests and keep polling every ~4s well after real results stop "
         "growing. Supabase's final hotel count (578–633) is ~2x MySQL's (295–326) for the "
         "identical query — almost certainly duplicated chunks, not real extra inventory.",
         11, CARD_BODY, line_spacing=1.15)

add_text(s, MARGIN, Emu(5250000), CONTENT_W, Emu(600000),
         "Method: direct URL navigation (bypasses the known Search-click double-submit path), Performance "
         "Resource Timing on admin-ajax.php, two Athens date ranges not touched in prior testing, each side "
         "run both first and second to rule out order/warm-cache bias. “Settled” = displayed hotel count "
         "and request count both unchanged for 20–30s. Full raw timings in Mobile/decks/perf_runs.json.",
         10, FOOTER_GRAY, line_spacing=1.2)
add_footer(s, 5)

# ============================== SLIDE 6 — MAP + CONTENT FIXES ==============================
s = prs.slides.add_slide(BLANK)
set_bg(s, LIGHT_BG)
add_section_header(s, Emu(560000), "05  —  VISUAL PARITY", "Map fix, and what's still an open, expected difference")

add_card(s, Emu(1560000), Emu(1500000),
         "Map fix (three layered bugs, all resolved today)",
         "1) map-search.js / Mapbox GL were never enqueued on this page \u2014 traced to an infrastructure "
         "change earlier today that also silently dropped the fork's files, unrelated to the DB work above.\n"
         "2) Wrong Mapbox API-key option name (api_key_mapbox, not apiKeyMapbox).\n"
         "3) #map's height tracked the results list's full length \u2192 an extremely tall/narrow container broke "
         "fitBounds's aspect ratio, panning the view into unrelated terrain. Fixed with a viewport-height, "
         "sticky map panel plus a settle-point re-fit once the full result set has loaded.",
         "Fixed")
add_card(s, Emu(3260000), Emu(1550000),
         "Hotel names & hero photos differ \u2014 expected, not a bug",
         "Both DBs are matched to the same live RateHawk hid, but static content (name, first photo) was "
         "imported independently into each. Neither source is \u201cthe correct one\u201d \u2014 MySQL's own hotel "
         "names have 3 confirmed mismatches against RateHawk's own live names too. Coverage note: Supabase "
         "matched 14/14 hotels in an earlier sampled batch vs. MySQL's 7\u201311/14 \u2014 more complete, "
         "differently-sourced content.",
         "By design", PILL_BLUE_BG, PILL_BLUE_TX)
add_footer(s, 6)

# ============================== SLIDE 7 — TEST SITE 3: SKELETON UX + HONEST NUMBER ==============================
s = prs.slides.add_slide(BLANK)
set_bg(s, LIGHT_BG)
add_section_header(s, Emu(560000), "06  —  TEST SITE 3", "A third variant built to chase a 3\u20135s render \u2014 and the honest result")

add_card(s, Emu(1560000), Emu(1150000),
         "What was built \u2014 \u201c?fast=1\u201d on the same comparison URL",
         "A front-end skeleton-loading overlay (6 pulsing placeholder cards) fires the instant Search is "
         "clicked, replacing the spinner-only wait. Verified live: appears synchronously on click, is cleanly "
         "replaced by real results with no errors. It changes what the wait feels like \u2014 it does not, and was "
         "never claimed to, change the real backend timing.",
         "Shipped")
add_card(s, Emu(2810000), Emu(1150000),
         "One lever intentionally not pursued: RateHawk's own hotels_limit",
         "Production's WorldotaProvider.php has a commented-out hotels_limit parameter that could shrink the "
         "live RateHawk response itself. Implementing it requires copying a file containing embedded API "
         "credentials \u2014 blocked by this session's own credential-handling safeguards. Skipped rather than "
         "worked around; flagged below for Hristijan's team to test directly on their own file.",
         "Skipped", PILL_AMBER_BG, PILL_AMBER_TX)
add_card(s, Emu(4060000), Emu(1450000),
         "The honest number: 3\u20135s is not achieved for a genuinely cold first search",
         "Measured with a MutationObserver on the real click-to-render path (not polling, which earlier gave "
         "false 30\u201345s \u201cstall\u201d readings that turned out to just be the polling interval). Best clean "
         "real-content case on a small, never-cached destination: 11.0s. On Athens \u2014 the flagship, "
         "highest-inventory destination \u2014 a genuinely cold run measured 24.8s end to end. See the next slide "
         "for exactly where that time goes.",
         "Measured", PILL_BLUE_BG, PILL_BLUE_TX)
add_footer(s, 7)

# ============================== SLIDE 8 — COLD SEARCH BREAKDOWN ==============================
s = prs.slides.add_slide(BLANK)
set_bg(s, LIGHT_BG)
add_section_header(s, Emu(560000), "07  —  WHERE THE TIME GOES", "Athens, cold search, click \u2192 hotels on screen: 24.8s broken down")

chart_data2 = CategoryChartData()
chart_data2.categories = ["Cold Athens search (24.8s total)"]
chart_data2.add_series("WP nonce refresh", (33.6,))
chart_data2.add_series("RateHawk + content fetch", (65.5,))
chart_data2.add_series("Client render", (0.9,))

bar_left, bar_top, bar_w, bar_h = MARGIN, Emu(1550000), Emu(7300000), Emu(1500000)
gframe2 = s.shapes.add_chart(XL_CHART_TYPE.BAR_STACKED_100, bar_left, bar_top, bar_w, bar_h, chart_data2)
chart2 = gframe2.chart
chart2.has_legend = True
chart2.legend.position = XL_LEGEND_POSITION.BOTTOM
chart2.legend.include_in_layout = False
plot2 = chart2.plots[0]
plot2.has_data_labels = False
s2 = chart2.series
s2[0].format.fill.solid(); s2[0].format.fill.fore_color.rgb = PILL_BLUE_TX
s2[1].format.fill.solid(); s2[1].format.fill.fore_color.rgb = AMBER_BAR
s2[2].format.fill.solid(); s2[2].format.fill.fore_color.rgb = GREEN_BAR
chart2.category_axis.tick_labels.font.size = Pt(10)
chart2.value_axis.visible = False

rows2 = [
    ("WordPress nonce refresh (_getFreshNonce)", "8.4s  \u2014  33.6% of total. A plain security-token round trip to admin-ajax.php \u2014 zero RateHawk or DB work, pure WP overhead, and it happens BEFORE the real search call is even allowed to fire.", Emu(200000)),
    ("Live RateHawk fetch + Supabase/MySQL content assembly", "16.3s  \u2014  65.5% of total. The actual hotel search: live pricing round trip plus joining in static content (name, photos, address) for all matching hotels.", Emu(200000)),
    ("Client-side render (parse response, swap skeleton for real cards)", "0.2s  \u2014  0.9% of total. Effectively free \u2014 not a place to look for savings.", 0),
]
add_row_card(s, Emu(3150000), "The three components, in order", rows2, "Measured", PILL_BLUE_BG, PILL_BLUE_TX)
add_text(s, MARGIN, Emu(5580000), CONTENT_W, Emu(880000),
         "Bug found while instrumenting this: the search FORM submits TWICE per single click (two independent "
         "\u201cForm submitted\u201d sequences from one click, confirmed via console log on synthetic and real "
         "OS-level clicks alike). Lives in production's shared hotel-search.js, not this fork. The fork's own "
         "generation-counter drops the stale duplicate, but the survivor sometimes then hit a hard client error "
         "(\u201cSomething went wrong\u201d) instead of succeeding \u2014 seen after one plain click, 48s in. Doubles "
         "real RateHawk API call volume and server load per search either way.",
         10, FOOTER_GRAY, line_spacing=1.15)
add_footer(s, 8)

# ============================== SLIDE 9 — SIMPLE RECOMMENDATION (RE-RUN 2026-09-15) ==============================
s = prs.slides.add_slide(BLANK)
set_bg(s, LIGHT_BG)
add_section_header(s, Emu(560000), "08  —  HOW TO MAKE IT FASTER", "One ranked list — by measured impact, biggest first")

add_card(s, Emu(1560000), Emu(1650000),
         "#1 — Stop the repeating/duplicate admin-ajax loop",
         "Biggest lever by far. Confirmed today on BOTH sides: literal concurrent duplicate chunk requests, "
         "plus a polling loop that keeps firing every ~4s well past when results stop growing. This alone is "
         "most of the gap between today's 67–122s totals and 9/14's 14–18s baseline — and it's why Supabase "
         "shows ~2x the hotel count MySQL does for the same query (duplicated chunks, not real inventory). "
         "Fix: the same dedup/stale-response guard Fix 2 already added for the click path, plus stop the loop "
         "on the real terminal chunk (hasMore:false) instead of retrying.",
         "Backend")
add_card(s, Emu(3360000), Emu(1200000),
         "#2 — Batch or parallelize chunk fetches instead of one every ~4s",
         "Total time now scales almost linearly with hotel count (17–19 calls for MySQL, 26–29 for Supabase) "
         "because chunks fetch one at a time with a fixed pacing gap between them. Fetching 2–3 chunks "
         "concurrently would cut total time roughly in proportion, on top of the #1 fix.",
         "Backend")
add_card(s, Emu(4710000), Emu(1200000),
         "#3 — Take the WordPress nonce refresh off the critical path",
         "Still a fixed ~8.4s tax (33.6% of the original 24.8s search) on every search before either fix above "
         "even starts — pre-fetch it on page load, before Search is clicked. Smaller than #1/#2 today, but "
         "free once they're done.",
         "Backend")
add_footer(s, 9)

# ============================== SLIDE 10 — OPEN ITEMS / NEXT STEPS ==============================
s = prs.slides.add_slide(BLANK)
set_bg(s, LIGHT_BG)
add_section_header(s, Emu(560000), "09  —  NEXT STEPS", "Open items and where this goes next")

rows = [
    ("Fix the double form-submission bug in shared hotel-search.js", "Real, reproducible: two full AJAX submissions per single click, confirmed via console log. Doubles RateHawk call volume per search and can surface as a hard client-side error on a plain click \u2014 likely affects real production too, since it's shared code.", Emu(260000)),
    ("Find the real bottleneck: the RateHawk/content fetch, not the DB fetch", "It's 65.5% of the 24.8s total; today's DB fixes touch a much smaller slice. The still-MySQL-sourced amenities query and filter/sort work dominate on both sides \u2014 that's where the next real win has to come from.", Emu(260000)),
    ("Flag the today's-date plugin-directory incident to Hristijan", "Something outside this session replaced wp-content/plugins/ today, wiping the fork's files \u2014 worth checking blast radius on other plugins", Emu(260000)),
    ("Real production page still renders blank", "Pre-existing, confirmed unrelated to this work \u2014 needs separate investigation on the tech team's side", 0),
]
add_row_card(s, Emu(1560000), "Open items", rows, "In progress", PILL_AMBER_BG, PILL_AMBER_TX)
add_footer(s, 10)

prs.save(r"C:\Users\raywe\Ray\Balkanea\Mobile\decks\Balkanea-Supabase-vs-MySQL-Comparison.pptx")
print("Saved.")
