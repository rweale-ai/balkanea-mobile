# -*- coding: utf-8 -*-
"""
Updates Balkanea-Mobile-Cost-Model.xlsx:
- Corrects Inputs!B23/B24 (hotel DB hosting) to match the actual running numbers
  (sandbox ~$25/mo Pro plan, production ~$75/mo) -- the old 12.5/32.5 midpoints
  were stale.
- Adds a new "RATEHAWK PRODUCTION PREREQUISITES" input block (AWS static-IP relay
  cost -- now a real production-certification requirement, not optional) and a
  "TESTING & STORE-ASSET DESIGN" input block (day-rate x days, defaulting to $0
  so the model doesn't silently assume paid outside help).
- Wires the AWS relay cost into the Running Cost & Margin totals.
- Wires a real formula into Implementation Costs' testing/design row instead of
  the placeholder note.
All additions are appended below existing rows (not inserted), so no existing
formula's cell references shift.
"""
import openpyxl

PATH = r"C:\Users\raywe\Documents\Balkanea-Mobile-Cost-Model.xlsx"
wb = openpyxl.load_workbook(PATH)

inputs = wb["Inputs"]
running = wb["Running Cost & Margin"]
impl = wb["Implementation Costs"]

# ---------------------------------------------------------------------------
# 1. Correct stale hotel-DB hosting numbers (Inputs!B23/B24)
# ---------------------------------------------------------------------------
inputs["B23"] = 25
inputs["C23"] = "Actual sandbox run rate, Supabase Pro plan, confirmed 8/21 (was a $12.5 placeholder midpoint)."
inputs["B24"] = 75
inputs["C24"] = "Actual production baseline once live, Supabase Pro (was a $32.5 placeholder midpoint). HA read replica still deferred until traffic justifies it."

# ---------------------------------------------------------------------------
# 2. New input block: RateHawk production prerequisites (AWS static-IP relay)
# ---------------------------------------------------------------------------
inputs["A32"] = "RATEHAWK PRODUCTION PREREQUISITES"
inputs["A33"] = "AWS static-IP relay -- monthly (base)"
inputs["B33"] = 8
inputs["C33"] = "Required for RateHawk PRODUCTION certification only -- sandbox needs no IP whitelisting. Real, verified AWS spend, not an estimate."
inputs["A34"] = "AWS static-IP relay -- HA add-on, monthly (optional)"
inputs["B34"] = 14
inputs["C34"] = "Standby instance + auto-failover. Not included in running-cost totals by default -- add manually if HA is wanted before production traffic justifies it."

# ---------------------------------------------------------------------------
# 3. New input block: testing & store-asset design day-rate
# ---------------------------------------------------------------------------
inputs["A36"] = "TESTING & STORE-ASSET DESIGN"
inputs["A37"] = "Day-rate for external testing/design time (if assumed)"
inputs["B37"] = 0
inputs["C37"] = "Default $0 -- QA draws on existing TestFlight testers and already-built/speced UI, not a new hire. Set a real day-rate here only if outside help should be costed."
inputs["A38"] = "Estimated days (testing + store assets)"
inputs["B38"] = 8
inputs["C38"] = "~3-5 days structured QA (incl. new multi-room + RateHawk error-matrix coverage) + ~2-3 days store assets -- see Plan slide. Edit if scope changes."

for cell in ("A32", "A36"):
    inputs[cell].font = openpyxl.styles.Font(bold=True)

# ---------------------------------------------------------------------------
# 4. Running Cost & Margin: add the AWS relay as a new fixed monthly cost line
#    and fold it into both the Sonnet and Haiku totals.
# ---------------------------------------------------------------------------
running["A32"] = "AWS static-IP relay (RateHawk production prerequisite)"
running["B32"] = "=Inputs!B33"
running["C32"] = "=Inputs!B33"
running["D32"] = "Flat regardless of scenario -- base cost only, HA add-on not included by default."

running["B15"] = "=SUM(B10:B14)+B32"
running["C15"] = "=SUM(C10:C14)+C32"
running["B19"] = "=B18+B11+B12+B13+B14+B32"
running["C19"] = "=C18+C11+C12+C13+C14+C32"

# ---------------------------------------------------------------------------
# 5. Implementation Costs: wire a real formula into the testing/design row
#    instead of the placeholder "add a day-rate here" note, and add a total
#    that includes it (appended as a new row so the existing totals stay put).
# ---------------------------------------------------------------------------
impl["B15"] = "=Inputs!B37*Inputs!B38"
impl["D15"] = "= day-rate x estimated days, both editable on Inputs. $0 by default -- see note there."

impl["A21"] = "TOTAL ONE-TIME INCLUDING TESTING/DESIGN (if a day-rate is set)"
impl["B21"] = "=B18+B15"
impl["A22"] = "  ...at the high engineering estimate"
impl["B22"] = "=B19+B15"
impl["A21"].font = openpyxl.styles.Font(bold=True)

wb.save(PATH)
print("Saved:", PATH)
