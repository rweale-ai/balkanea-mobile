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
add_text(s, MARGIN, SLIDE_H - Emu(500000), Emu(6000000), Emu(300000), "2026-09-14", 11, SUBTITLE_2)

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

# ============================== SLIDE 5 — PERFORMANCE RESULTS (CHART) ==============================
s = prs.slides.add_slide(BLANK)
set_bg(s, LIGHT_BG)
add_section_header(s, Emu(560000), "04  —  PERFORMANCE RESULTS", "Full search, real Athens query, same dates on both sides")

chart_data = CategoryChartData()
chart_data.categories = ["Run 1 (cold)", "Run 2 (warm)", "Run 3 (warm)"]
chart_data.add_series("Real production (MySQL)", (14.1, 10.4, 9.9))
chart_data.add_series("Supabase (fork)", (17.7, 12.1, 12.4))

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
chart.value_axis.axis_title.text_frame.text = "Total seconds, full search → last chunk"
chart.value_axis.axis_title.text_frame.paragraphs[0].runs[0].font.size = Pt(9)

# Right-side takeaway cards
take_left = MARGIN + chart_w + Emu(300000)
take_w = CONTENT_W - chart_w - Emu(300000)
card = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, take_left, Emu(1500000), take_w, Emu(1750000))
card.adjustments[0] = 0.06
card.fill.solid(); card.fill.fore_color.rgb = CARD_WHITE
card.line.color.rgb = RGBColor(0xEC, 0xE6, 0xDC); card.line.width = Pt(0.75)
card.shadow.inherit = False
add_text(s, take_left + Emu(220000), Emu(1650000), take_w - Emu(440000), Emu(300000), "Real production is faster, cold and warm", 13, CARD_TITLE, bold=True, font=FONT_SB)
add_text(s, take_left + Emu(220000), Emu(2000000), take_w - Emu(440000), Emu(1150000),
         "MySQL is ahead by roughly 20–30% at every point measured (14.1s vs 17.7s cold; 9.9s vs "
         "12.4s warm). This matches the pre-existing baseline from earlier testing this "
         "week — today's DB fixes didn't close the gap.",
         11, CARD_BODY, line_spacing=1.15)

card2 = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, take_left, Emu(3400000), take_w, Emu(1650000))
card2.adjustments[0] = 0.06
card2.fill.solid(); card2.fill.fore_color.rgb = CARD_WHITE
card2.line.color.rgb = RGBColor(0xEC, 0xE6, 0xDC); card2.line.width = Pt(0.75)
card2.shadow.inherit = False
add_text(s, take_left + Emu(220000), Emu(3550000), take_w - Emu(440000), Emu(300000), "Why: chunk time isn't mostly DB time", 13, CARD_TITLE, bold=True, font=FONT_SB)
add_text(s, take_left + Emu(220000), Emu(3900000), take_w - Emu(440000), Emu(1050000),
         "Each chunk runs 3.3–4.5s, but the isolated DB fetch today's fixes target is ~350ms of "
         "that. The rest — the still-MySQL-sourced amenities query, filter/sort work — is shared "
         "architecture on both sides, and is where the next win likely has to come from.",
         11, CARD_BODY, line_spacing=1.15)

add_text(s, MARGIN, Emu(5250000), CONTENT_W, Emu(600000),
         "Method: direct AJAX timing (initial + all DB chunks, real Athens search, same 14–15 Sep dates and "
         "guest params on both sides, 259–266 hotels, 3 backend round-trips) — bypasses browser render time "
         "so it isolates backend behavior equally. An earlier pass used a different, heavier date range and "
         "produced inflated, non-comparable numbers — discarded.",
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

# ============================== SLIDE 7 — OPEN ITEMS / NEXT STEPS ==============================
s = prs.slides.add_slide(BLANK)
set_bg(s, LIGHT_BG)
add_section_header(s, Emu(560000), "06  —  NEXT STEPS", "Open items and where this goes next")

rows = [
    ("Find the real bottleneck: the shared amenities/filter step, not the DB fetch", "Chunk time is 3.3\u20134.5s; today's fixes touch only ~350ms of that. The still-MySQL-sourced amenities query and filter/sort work dominate on both sides \u2014 that's where the next real win has to come from.", Emu(260000)),
    ("Flag the today's-date plugin-directory incident to Hristijan", "Something outside this session replaced wp-content/plugins/ today, wiping the fork's files \u2014 worth checking blast radius on other plugins", Emu(260000)),
    ("Real production page still renders blank", "Pre-existing, confirmed unrelated to this work \u2014 needs separate investigation on the tech team's side", Emu(160000)),
    ("Engage Fable 5 on further user-facing speed options", "Beyond today's Tier-1 DB fixes \u2014 exploring what else moves the needle on perceived load time, in progress", 0),
]
add_row_card(s, Emu(1560000), "Open items", rows, "In progress", PILL_AMBER_BG, PILL_AMBER_TX)
add_footer(s, 7)

prs.save(r"C:\Users\raywe\Ray\Balkanea\Mobile\decks\Balkanea-Supabase-vs-MySQL-Comparison.pptx")
print("Saved.")
