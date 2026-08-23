#!/usr/bin/env python3
"""Preprocess Synora screenshots for the deck:
   - crop tall full-page captures to a clean landscape viewport
   - add rounded corners (the Synora card motif) with optional hairline border
   All outputs go to build/img/ as RGBA PNGs.
"""
import os
from PIL import Image, ImageDraw

SRC = "../assets/screenshots"
OUT = "img"
os.makedirs(OUT, exist_ok=True)

BORDER = (229, 232, 235, 255)  # Mist #E5E8EB

def rounded(im, radius, border=True, border_col=BORDER, bw=3):
    im = im.convert("RGBA")
    w, h = im.size
    mask = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle([0, 0, w - 1, h - 1], radius=radius, fill=255)
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    out.paste(im, (0, 0), mask)
    if border:
        d2 = ImageDraw.Draw(out)
        d2.rounded_rectangle([bw // 2, bw // 2, w - 1 - bw // 2, h - 1 - bw // 2],
                             radius=radius, outline=border_col, width=bw)
    return out

def load(name):
    return Image.open(os.path.join(SRC, name)).convert("RGB")

def crop_top(im, ratio):
    """Crop from the top to a target width:height ratio (keeps full width)."""
    w, h = im.size
    target_h = int(round(w / ratio))
    if target_h <= h:
        return im.crop((0, 0, w, target_h))
    # image is shorter than target: crop width instead
    target_w = int(round(h * ratio))
    x = (w - target_w) // 2
    return im.crop((x, 0, x + target_w, h))

def crop_band(im, top_frac, ratio):
    """Crop a landscape band starting at top_frac of the height."""
    w, h = im.size
    target_h = int(round(w / ratio))
    y = int(round(h * top_frac))
    if y + target_h > h:
        y = max(0, h - target_h)
    return im.crop((0, y, w, y + target_h))

# ---- Landscape 16:10 hero/feature crops -------------------------------------
R16 = 16 / 10
jobs_full = {
    # already ~16:10 viewport shots -> just round
    "dashboard_desktop": ("dashboard_desktop.png", None),
    "dark_dashboard":    ("dark_dashboard.png", None),
    "onboarding":        ("onboarding.png", None),
    "signup":            ("signup.png", None),
    "landing_desktop":   ("landing_desktop.png", None),
    "login_desktop":     ("login_desktop.png", None),
    "timetable":         ("timetable.png", None),
    "calendar":          ("calendar.png", None),
    "achievements":      ("achievements.png", None),
    # tall -> crop top to 16:10
    "tasks":             ("tasks.png", R16),
    "cgpa":              ("cgpa.png", R16),
    "attendance":        ("attendance.png", R16),
    "notes":             ("notes.png", R16),
    "notifications":     ("notifications.png", R16),
    "settings":          ("settings.png", R16),
}
for key, (fname, ratio) in jobs_full.items():
    im = load(fname)
    if ratio:
        im = crop_top(im, ratio)
    r = rounded(im, radius=34, border=True)
    r.save(os.path.join(OUT, key + ".png"))
    print(key, "->", r.size)

# ---- Responsive trio (device-proportioned rounded cards) --------------------
for key, fname, rad in [
    ("resp_desktop", "land_resp_desktop.png", 30),
    ("resp_tablet",  "land_resp_tablet.png", 26),
    ("resp_mobile",  "land_resp_mobile.png", 40),
]:
    im = load(fname)
    r = rounded(im, radius=rad, border=True, bw=4)
    r.save(os.path.join(OUT, key + ".png"))
    print(key, "->", r.size)

# ---- Tighter feature crops for small cards (montage / beyond-syllabus) -------
# Use the same rounded landscape versions; the montage will scale them down.
print("done")
