"""Genera los PNG reales del icono de SleepTrack con Pillow.

Uso:  python icons/make_icons.py
Dibuja el mismo motivo que icons/icon.svg (luna creciente, estrellas y ondas)
a 4x y lo reduce con LANCZOS para obtener bordes suaves en 180, 192 y 512 px.
"""

import math
import os
from PIL import Image, ImageChops, ImageDraw, ImageFilter

BG = (11, 15, 26, 255)          # #0B0F1A
INDIGO = (129, 140, 248, 255)   # #818CF8
INDIGO_LIGHT = (165, 180, 252, 255)
CYAN = (56, 189, 248, 255)      # #38BDF8
SCALE = 4
SIZES = (180, 192, 512)


def box(v, W):
    return tuple(int(x * W / 512) for x in v)


def sparkle(draw, cx, cy, r, color, W):
    x, y, s = int(cx * W / 512), int(cy * W / 512), max(1, int(r * W / 512))
    draw.ellipse([x - s, y - s, x + s, y + s], fill=color)
    draw.polygon([
        (x, y - int(s * 3.1)), (x + int(s * 0.7), y - int(s * 0.7)),
        (x + int(s * 3.1), y), (x + int(s * 0.7), y + int(s * 0.7)),
        (x, y + int(s * 3.1)), (x - int(s * 0.7), y + int(s * 0.7)),
        (x - int(s * 3.1), y), (x - int(s * 0.7), y - int(s * 0.7)),
    ], fill=color)


def make(size):
    W = size * SCALE
    img = Image.new("RGBA", (W, W), BG)

    # Halo difuso detrás de la luna.
    glow = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    gd.ellipse(box((40, 34, 454, 420), W), fill=(*INDIGO[:3], 78))
    glow = glow.filter(ImageFilter.GaussianBlur(W * 0.065))
    img = Image.alpha_composite(img, glow)

    # Luna creciente: círculo índigo menos círculo desplazado.
    moon_glow = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    ImageDraw.Draw(moon_glow).ellipse(box((104, 112, 352, 360), W), fill=(*INDIGO[:3], 46))
    moon_glow = moon_glow.filter(ImageFilter.GaussianBlur(W * 0.035))
    img = Image.alpha_composite(img, moon_glow)

    moon = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    ImageDraw.Draw(moon).ellipse(box((106, 116, 350, 360), W), fill=INDIGO_LIGHT)
    cut = Image.new("L", (W, W), 0)
    ImageDraw.Draw(cut).ellipse(box((186, 82, 398, 294), W), fill=255)
    moon.putalpha(ImageChops.subtract(moon.getchannel("A"), cut))
    img = Image.alpha_composite(img, moon)

    # Estrellas y puntos de sueño.
    stars = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    sd = ImageDraw.Draw(stars)
    sparkle(sd, 370, 108, 3.2, CYAN, W)
    sparkle(sd, 138, 224, 2.0, (*CYAN[:3], 190), W)
    sd.ellipse(box((346, 210, 356, 220), W), fill=(*CYAN[:3], 200))
    sd.ellipse(box((118, 124, 126, 132), W), fill=(*CYAN[:3], 170))
    img = Image.alpha_composite(img, stars)

    # Ondas de sueño en la parte inferior.
    waves = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    wd = ImageDraw.Draw(waves)
    for phase, y0, amp, width, alpha in (
        (0.0, 374, 30, 9, 150),
        (1.1, 414, 32, 11, 225),
        (2.2, 454, 27, 7, 105),
    ):
        pts = []
        for i in range(0, 513, 4):
            x = i
            y = y0 + amp * math.sin((x / 512.0) * math.pi * 4 + phase)
            pts.append((int(x * W / 512), int(y * W / 512)))
        wd.line(pts, fill=(*CYAN[:3], alpha), width=max(1, int(width * W / 512)), joint="curve")
    img = Image.alpha_composite(img, waves)

    return img.convert("RGB").resize((size, size), Image.Resampling.LANCZOS)


def main():
    here = os.path.dirname(os.path.abspath(__file__))
    for size in SIZES:
        path = os.path.join(here, "icon-%d.png" % size)
        make(size).save(path, "PNG", optimize=True)
        print(path)


if __name__ == "__main__":
    main()
