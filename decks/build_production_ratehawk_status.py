# Builds Balkanea-Production-RateHawk-Status.pptx from scratch.
# Matches the established visual system from Balkanea-Hotel-DB-Schema-Review-V4.pptx
# (dark green title slide #00332A, warm off-white content slides #FAF7F2,
# white cards, green "Live" status pills, Segoe UI / Segoe UI Semibold).

from pptx import Presentation
from pptx.util import Emu, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE
from pptx.oxml.ns import qn

# ---- palette (sampled from the existing deck) ----
DARK_BG      = RGBColor(0x00, 0x33, 0x2A)
LIGHT_BG     = RGBColor(0xFA, 0xF7, 0xF2)
CARD_WHITE   = RGBColor(0xFF, 0xFF, 0xFF)
PILL_GREEN_BG= RGBColor(0xE1, 0xEF, 0xE6)
PILL_GREEN_TX= RGBColor(0x1F, 0x7A, 0x4D)
PILL_AMBER_BG= RGBColor(0xFB, 0xE8, 0xD3)
PILL_AMBER_TX= RGBColor(0x9A, 0x5B, 0x0C)
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


def add_footer(slide, page_num, label="BALKANEA WEB  •  PRODUCTION RATEHAWK STATUS"):
    add_text(slide, MARGIN, SLIDE_H - Emu(340000), Emu(9000000), Emu(240000), label, 9, FOOTER_GRAY, font=FONT)
    add_text(slide, SLIDE_W - Emu(700000), SLIDE_H - Emu(340000), Emu(400000), Emu(240000), str(page_num), 9, FOOTER_GRAY, align=PP_ALIGN.RIGHT)


def add_section_header(slide, top, number_label, title):
    add_text(slide, MARGIN, top, CONTENT_W, Emu(300000), number_label, 13, SECTION_HDR, bold=True, font=FONT_SB)
    add_text(slide, MARGIN, top + Emu(320000), CONTENT_W, Emu(500000), title, 24, CARD_TITLE, bold=True, font=FONT_SB)


# ============================== SLIDE 1 — TITLE ==============================
s = prs.slides.add_slide(BLANK)
set_bg(s, DARK_BG)
add_text(s, MARGIN, Emu(1700000), CONTENT_W, Emu(300000),
         "BALKANEA WEB  •  PRODUCTION RATEHAWK INTEGRATION", 14, EYEBROW_ORG, bold=True, font=FONT_SB)
add_text(s, MARGIN, Emu(2050000), CONTENT_W, Emu(1100000),
         "Production Integration\nStatus Update", 40, TITLE_CREAM, bold=True, font=FONT_SB, line_spacing=1.05)
add_text(s, MARGIN, Emu(3350000), Emu(9500000), Emu(500000),
         "Real hotel search, live pricing, and a full booking flow are now wired to production RateHawk "
         "— here's what's built, the real numbers behind it, and how the tech team can test it safely.",
         14.5, SUBTITLE_1, line_spacing=1.2)
add_text(s, MARGIN, Emu(4150000), Emu(9500000), Emu(300000),
         "Data:  3,484,416 hotels / 18,510,072 rooms      Countries:  All (250)      Status:  Live in production",
         12, SUBTITLE_2)
add_text(s, MARGIN, SLIDE_H - Emu(500000), Emu(6000000), Emu(300000), "2026-09-07", 11, SUBTITLE_2)

# ============================== SLIDE 2 — WHAT'S BEEN BUILT ==============================
s = prs.slides.add_slide(BLANK)
set_bg(s, LIGHT_BG)
add_section_header(s, Emu(560000), "01  —  WHAT'S BEEN BUILT", "Three things shipped this week")

add_card(s, Emu(1560000), Emu(1050000),
         "Full global hotel content database imported",
         "3,484,416 hotels / 18,510,072 rooms, every RateHawk-covered country (up from 850,218 hotels "
         "across 10 countries previously). Real names, photos, amenities, and room data — no fabricated content.",
         "Live")
add_card(s, Emu(2760000), Emu(1050000),
         "balkanea-web now runs on real production RateHawk",
         "Search, hotel detail, and pricing all query the new database + real production pricing — not "
         "the old 3-city sandbox (LA/Paris/Dubai). The full booking chain (search → rooms → prebook → "
         "order → payment → confirm) is wired end to end against production.",
         "Live")
add_card(s, Emu(3960000), Emu(1050000),
         "POC deployment, password-protected",
         "Vercel's native password protection needs a paid plan upgrade (this project is on Hobby) — built "
         "an app-level HTTP Basic Auth gate instead, no plan change required. Credentials shared separately.",
         "Live")
add_footer(s, 2)

# ============================== SLIDE 3 — THE WEBSITE ==============================
s = prs.slides.add_slide(BLANK)
set_bg(s, LIGHT_BG)
add_section_header(s, Emu(560000), "02  —  THE WEBSITE", "balkanea-web.vercel.app")

add_card(s, Emu(1560000), Emu(900000),
         "What changed for a visitor",
         "Before: search only worked for 3 sandbox cities, with either simulated pricing or fabricated hotels "
         "everywhere else. Now: any destination in the new database returns real hotels at real, live "
         "production prices — verified live for Athens (Greece) and Belgrade (Serbia, genuinely new coverage).")
add_card(s, Emu(2610000), Emu(1500000),
         "The full flow, wired end to end",
         "Search results  →  Hotel detail  →  Room selection (real rates, real book_hash)  →  "
         "Prebook (rate lock)  →  RateHawk order opened  →  Guest details + Bankart/NLB payment  →  "
         "RateHawk order confirmed  →  Booking confirmation + email.\n\n"
         "Every step above now talks to RateHawk's real production API through a dedicated VPN relay, "
         "not the sandbox environment.")
add_card(s, Emu(4260000), Emu(750000),
         "Access",
         "URL: balkanea-web.vercel.app  —  password-gated, credentials shared via a secure channel, not this deck.")
add_footer(s, 3)

# ============================== SLIDE 4 — DATABASE: LOAD TIME & SIZE ==============================
s = prs.slides.add_slide(BLANK)
set_bg(s, LIGHT_BG)
add_section_header(s, Emu(560000), "03  —  DATABASE", "Load time & size — real measured numbers")

ROW_H = Emu(340000)
TITLE_OFFSET = Emu(600000)
BOTTOM_PAD = Emu(180000)


def add_row_card(slide, top, title, rows, pill_text=None, pill_bg=PILL_GREEN_BG, pill_tx=PILL_GREEN_TX,
                  tall_row_indices=()):
    # rows: list of (label, value, extra_height_or_0)
    content_h = TITLE_OFFSET + sum(ROW_H + r[2] for r in rows) + BOTTOM_PAD
    card = add_card(slide, top, content_h, title, "", pill_text, pill_bg, pill_tx)
    ty = top + TITLE_OFFSET
    for label, val, extra in rows:
        row_h = ROW_H + extra
        add_text(slide, MARGIN + Emu(280000), ty, Emu(4200000), row_h, label, 11, CARD_BODY, line_spacing=1.1)
        add_text(slide, MARGIN + Emu(4600000), ty, Emu(6100000), row_h, val, 11, CARD_TITLE, bold=True, font=FONT_SB, line_spacing=1.1)
        ty += row_h
    return top + content_h  # bottom edge


bulk_rows = [
    ("Hotels / rooms loaded", "3,484,416 / 18,510,072", 0),
    ("Final database size", "32 GB  (of 60 GB provisioned, 53%)", 0),
    ("Source dump (compressed)", "~2.87 GB", 0),
    ("Total time", "~8.26 hours  (8.10h load + 9.6min index rebuild)", 0),
    ("Throughput (settled rate)", "~150–200 hotels/sec, after a real index-maintenance fix", 0),
]
bulk_top = Emu(1560000)
bulk_bottom = add_row_card(s, bulk_top, "Full (bulk) load — 2026-09-05", bulk_rows)

delta_rows = [
    ("Hotels changed / total time", "293,553 (~8.4% of catalog)  in  2.61 hours", 0),
    ("Average throughput", "~31 hotels/sec", 0),
    ("Known caveat", "Source file's last_update is still 2026-09-01 — unchanged 6 days running. "
                      "Not yet confirmed whether RateHawk's daily-delta file is actually refreshing on schedule.", Emu(260000)),
]
delta_top = bulk_bottom + Emu(150000)
add_row_card(s, delta_top, "Daily incremental (delta) load — first real test, 2026-09-06", delta_rows,
             "Needs\nreview", PILL_AMBER_BG, PILL_AMBER_TX)

add_footer(s, 4)

# ============================== SLIDE 5 — TRANSACTIONS / BOOKING FLOW ==============================
s = prs.slides.add_slide(BLANK)
set_bg(s, LIGHT_BG)
add_section_header(s, Emu(560000), "04  —  TRANSACTIONS", "The booking flow — how a real reservation is made")

# flow diagram: 4 boxes in a row with arrows
steps = ["Search &\nRoom Select", "Prebook\n(rate lock)", "RateHawk Order\nOpened", "Guest Payment\n(Bankart/NLB)", "RateHawk Order\nConfirmed"]
box_w = Emu(2050000)
gap = Emu(146000)
total_w = box_w * 5 + gap * 4
start_x = MARGIN + (CONTENT_W - total_w) // 2
by = Emu(1650000)
bh = Emu(950000)
x = start_x
for i, step in enumerate(steps):
    box = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, x, by, box_w, bh)
    box.adjustments[0] = 0.08
    box.fill.solid()
    box.fill.fore_color.rgb = CARD_WHITE
    box.line.color.rgb = RGBColor(0xEC, 0xE6, 0xDC)
    box.line.width = Pt(0.75)
    box.shadow.inherit = False
    tf = box.text_frame
    tf.word_wrap = True
    tf.vertical_anchor = MSO_ANCHOR.MIDDLE
    tf.margin_left = Emu(80000)
    tf.margin_right = Emu(80000)
    for j, line in enumerate(step.split("\n")):
        p = tf.paragraphs[0] if j == 0 else tf.add_paragraph()
        p.alignment = PP_ALIGN.CENTER
        run = p.add_run()
        run.text = line
        run.font.size = Pt(11.5)
        run.font.bold = True
        run.font.color.rgb = CARD_TITLE
        run.font.name = FONT_SB
    if i < len(steps) - 1:
        arrow = s.shapes.add_shape(MSO_SHAPE.RIGHT_ARROW, x + box_w, by + bh // 2 - Emu(60000), gap, Emu(120000))
        arrow.fill.solid()
        arrow.fill.fore_color.rgb = SECTION_HDR
        arrow.line.fill.background()
        arrow.shadow.inherit = False
    x += box_w + gap

add_card(s, Emu(2850000), Emu(870000),
         "Status: fully wired to production",
         "Every step above talks to RateHawk's production API (via the VPN relay) and Bankart/NLB's real "
         "payment gateway. This is not a simulation — completing this flow creates a genuine hotel "
         "reservation and a real charge.")

warn = s.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, MARGIN, Emu(3850000), CONTENT_W, Emu(1350000))
warn.adjustments[0] = 0.06
warn.fill.solid()
warn.fill.fore_color.rgb = WARN_BG
warn.line.fill.background()
warn.shadow.inherit = False
add_text(s, MARGIN + Emu(280000), Emu(3990000), CONTENT_W - Emu(560000), Emu(300000),
         "⚠  Open risk — not yet resolved", 13, WARN_TX, bold=True, font=FONT_SB)
add_text(s, MARGIN + Emu(280000), Emu(4340000), CONTENT_W - Emu(560000), Emu(800000),
         "The RateHawk order is opened BEFORE payment is taken — so reaching checkout, not just completing it, "
         "already creates a real order with RateHawk. Two things are still unconfirmed: (1) Balkanea's actual "
         "credit/billing terms with RateHawk (a production order becomes a real payable), and (2) whether "
         "RateHawk's Pre-Certification Checklist is fully signed off. Don't complete a real booking through "
         "payment until both are confirmed.",
         11, WARN_TX, line_spacing=1.2)

add_footer(s, 5)

# ============================== SLIDE 6 — HOW TO TEST ==============================
s = prs.slides.add_slide(BLANK)
set_bg(s, LIGHT_BG)
add_section_header(s, Emu(560000), "05  —  FOR THE TECH TEAM", "How to test this safely")

add_card(s, Emu(1560000), Emu(1000000),
         "Safe to test freely — no risk",
         "Search any destination, browse hotel detail pages, and select rooms. All of this is real "
         "production data and real production pricing, but creates no commitment or charge of any kind.",
         "Go ahead")
add_card(s, Emu(2760000), Emu(1000000),
         "Stop before completing payment",
         "You can safely click through to the guest-details / checkout screen to review the UX — just "
         "don't submit payment. See the risk note on the previous slide for why.",
         "Caution", PILL_AMBER_BG, PILL_AMBER_TX)
add_card(s, Emu(3960000), Emu(1000000),
         "Direct database access, if useful",
         "Can invite you as a Developer on the Supabase project (balkanea_hotels_poc_v2) to browse tables "
         "or run queries directly — ask Ray. Main tables: hotels (partitioned by country_code) and rooms.")
add_card(s, Emu(5160000), Emu(700000),
         "Full metrics & docs",
         "Mobile/supabase-hotels/docs/load-metrics.md — complete throughput tables and methodology behind slide 4.")
add_footer(s, 6)

prs.save("Balkanea-Production-RateHawk-Status.pptx")
print("Saved", len(prs.slides._sldIdLst), "slides")
