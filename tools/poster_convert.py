"""Konvertiert die gerenderten Ring-PNGs (tools/_out) nach AVIF/WebP mit Alpha."""
from pathlib import Path
from PIL import Image
from images import update_manifest

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "tools/_out"
OUT = ROOT / "assets/img"

jobs = {"ring-poster": (800, 1400), "ring-mark": (600,)}
for name, widths in jobs.items():
    im = Image.open(SRC / f"{name}.png").convert("RGBA")
    for w in widths:
        r = im.resize((w, w), Image.LANCZOS) if w != im.width else im
        r.save(OUT / f"{name}-{w}.avif", quality=60, speed=6)
        r.save(OUT / f"{name}-{w}.webp", quality=82, method=6)
        print(f"{name}-{w}")
    update_manifest({name: {"widths": list(widths), "w": im.width, "h": im.height}})
