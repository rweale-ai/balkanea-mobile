# -*- coding: utf-8 -*-
"""
2026-08-26: Ray set the Claude Code build cost high estimate to $1,000 (was
500), reflecting real additional engineering on 8/25 -- payment root-cause
debugging across three separate real charges, multiple reliability bug
fixes, and a new voucher/invoice/email feature. Low estimate (100) unchanged.
"""
import openpyxl

PATH = r"C:\Users\raywe\Documents\Balkanea-Mobile-Cost-Model.xlsx"
wb = openpyxl.load_workbook(PATH)
inputs = wb["Inputs"]

inputs["B30"] = 1000
inputs["C30"] = ("Revised 8/25 (was 500) -- reflects real additional engineering that day: payment "
                  "root-cause debugging across three separate real charges, multiple reliability bug "
                  "fixes, and a new voucher/invoice/email feature. Wide range still deliberate -- "
                  "dominated by debug/iteration cycles, not clean codegen.")

wb.save(PATH)
print("Saved:", PATH, "-- Inputs!B30 = 1000")
