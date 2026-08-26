import win32com.client
import os
import time

PATH = r"C:\Users\raywe\Ray\Balkanea\Mobile\decks\Balkanea-Mobile-Sandbox-Readiness-Update.pptx"
OUT_DIR = r"C:\Users\raywe\Ray\Balkanea\Mobile\decks\render"
os.makedirs(OUT_DIR, exist_ok=True)

powerpoint = win32com.client.Dispatch("PowerPoint.Application")
powerpoint.Visible = True
pres = powerpoint.Presentations.Open(PATH, WithWindow=True)

for i, slide in enumerate(pres.Slides, 1):
    out_path = os.path.join(OUT_DIR, f"verify826_{i:02d}.png")
    slide.Export(out_path, "PNG", 1280, 720)

count = pres.Slides.Count
pres.Close()
powerpoint.Quit()
time.sleep(1)
print(f"Exported {count} slides to {OUT_DIR}")
