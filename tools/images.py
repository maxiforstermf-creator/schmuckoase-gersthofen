"""Erzeugt AVIF + WebP in 800/1400/2000 px aus assets/img/_orig.

Aufruf:  python tools/images.py
Nie hochskalieren: Breiten > Original werden übersprungen (die größte
verfügbare Breite wird zusätzlich als eigene Stufe erzeugt).
"""
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets/img/_orig"
OUT = ROOT / "assets/img"
WIDTHS = (800, 1400, 2000)

# name: (quelle, crop-box oder None)
IMAGES = {
    "kette-tropfen":     ("10733.jpg", None),
    "anhaenger-rubin":   ("21354.jpg", None),
    "herrenuhr":         ("370-1.jpg", None),
    "uhr-anzug":         ("1176.jpg", None),
    "skelettuhr":        ("2149241141.jpg", None),
    "solitaer":          ("2149509265.jpg", None),
    "goldketten":        ("2149836423.jpg", None),
    "diamantring":       ("24.jpg", None),
    "kette-gestein":     ("91625.jpg", None),
    "szene-nugget":      ("commons/gold-nugget-james-st-john.jpg", (120, 0, 3531, 2000)),
    "szene-glut":        ("commons/pouring-gold-allen-drebert.jpg", None),
    "szene-werkbank":    ("commons/jewelers-workbench-thomas-farley.jpg", (0, 1250, 3840, 3650)),
    # Ankauf-Kacheln (Hintergründe)
    "kachel-zahngold":   ("commons/zahngold-kronen-bin-im-garten.jpg", (150, 80, 1350, 1240)),
    "kachel-muenzen":    ("commons/krugerrand-gage-skidmore.jpg", (430, 0, 1640, 1317)),
    "kachel-barren":     ("commons/goldbarren-stevebidmead.jpg", None),
    "kachel-silber":     ("commons/silbermuenzen-argenberg.jpg", (80, 40, 1820, 1276)),
}


def widths_for(w):
    ws = [x for x in WIDTHS if x <= w]
    if not ws or (w < WIDTHS[-1] and w not in ws and w - ws[-1] > 150):
        ws.append(w)
    return ws


def main():
    import sys
    only = set(sys.argv[1:])
    manifest = {}
    for name, (src, crop) in IMAGES.items():
        if only and name not in only:
            continue
        im = Image.open(SRC / src).convert("RGB")
        if crop:
            im = im.crop(crop)
        ws = widths_for(im.width)
        for w in ws:
            h = round(im.height * w / im.width)
            r = im.resize((w, h), Image.LANCZOS) if w != im.width else im
            r.save(OUT / f"{name}-{w}.avif", quality=52, speed=6)
            r.save(OUT / f"{name}-{w}.webp", quality=78, method=6)
        manifest[name] = {"widths": ws, "w": im.width, "h": im.height}
        print(f"{name:18} {im.width}x{im.height} -> {ws}")
    update_manifest(manifest)


def update_manifest(entries):
    path = OUT / "manifest.json"
    data = json.loads(path.read_text("utf-8")) if path.exists() else {}
    data.update(entries)
    path.write_text(json.dumps(dict(sorted(data.items())), indent=1) + "\n", "utf-8")


if __name__ == "__main__":
    main()
