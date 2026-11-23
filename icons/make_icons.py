"""Genera los PNG de SleepTrack con Pillow a partir de icons/icon.svg.

Uso:  python icons/make_icons.py
Luna creciente, estrella y ondas de descanso con degradido
indigo suave -> cian nocturno (#818CF8 -> #38BDF8), 4x + LANCZOS.
"""

from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

HERE = Path(__file__).resolve().parent
SCALE = 32  # 64 unidades de viewBox -> 2048 px de master
N = 64 * SCALE
BG = (11, 15, 26, 255)       # #0B0F1A
INDIGO = (129, 140, 248, 255)  # #818CF8
CYAN = (56, 189, 248, 255)   # #38BDF8
STAR = [(50, 8), (51.6, 12.4), (56, 14), (51.6, 15.6), (50, 20),
        (48.4, 15.6), (44, 14), (48.4, 12.4)]


def px(v):
    return int(round(v * SCALE))


def box(*values):
    return tuple(px(v) for v in values)


def cubic(p0, p1, p2, p3, steps=20):
    points = []
    for i in range(steps + 1):
        t = i / steps
        u = 1 - t
        points.append((
            u**3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t**3 * p3[0],
            u**3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t**3 * p3[1],
        ))
    return points


def gradient():
    n = 256
    data = bytearray()
    for y in range(n):
        for x in range(n):
            t = (x + y) / (2 * (n - 1))
            data.append(int(t * 255 + 0.5))
    ramp = Image.frombytes("L", (n, n), bytes(data)).resize((N, N), Image.Resampling.BICUBIC)
    return Image.composite(Image.new("RGBA", (N, N), CYAN), Image.new("RGBA", (N, N), INDIGO), ramp)


def apply(mask, opacity=1.0):
    if opacity != 1.0:
        mask = mask.point(lambda v: int(v * opacity))
    layer = gradient()
    layer.putalpha(mask)
    return layer


def stroke(draw, points, width, fill=255):
    xy = [(px(x), px(y)) for x, y in points]
    draw.line(xy, fill=fill, width=px(width), joint="curve")
    r = int(px(width) / 2)
    for x, y in (points[0], points[-1]):
        draw.ellipse((px(x) - r, px(y) - r, px(x) + r, px(y) + r), fill=fill)


def wave(y):
    return (
        cubic((8, y), (13, y - 5), (18, y - 5), (23, y))
        + cubic((23, y), (28, y + 5), (33, y + 5), (38, y))
        + cubic((38, y), (43, y - 5), (48, y - 5), (56, y))
    )


def artwork():
    image = Image.new("RGBA", (N, N), BG)

    glow = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse(box(4, 3, 60, 59), fill=(*INDIGO[:3], 72))
    image = Image.alpha_composite(image, glow.filter(ImageFilter.GaussianBlur(N * 0.06)))

    rim = Image.new("L", (N, N), 0)
    ImageDraw.Draw(rim).rounded_rectangle(box(0.5, 0.5, 63.5, 63.5), radius=px(13.5), outline=255, width=px(1))
    image = Image.alpha_composite(image, apply(rim, 0.38))

    moon = Image.new("L", (N, N), 0)
    ImageDraw.Draw(moon).ellipse(box(9, 10, 49, 50), fill=255)
    cut = Image.new("L", (N, N), 0)
    ImageDraw.Draw(cut).ellipse(box(23, 3, 57, 37), fill=255)
    image = Image.alpha_composite(image, apply(ImageChops.subtract(moon, cut)))

    sparkle = Image.new("L", (N, N), 0)
    polygon = ImageDraw.Draw(sparkle)
    polygon.polygon([(px(x), px(y)) for x, y in STAR], fill=255)
    polygon.ellipse(box(49.4, 25.4, 52.6, 28.6), fill=200)
    image = Image.alpha_composite(image, apply(sparkle))

    waves = Image.new("L", (N, N), 0)
    wd = ImageDraw.Draw(waves)
    stroke(wd, wave(48), 3, 190)
    stroke(wd, wave(55), 3, 115)
    return Image.alpha_composite(image, apply(waves))


def main():
    master = artwork()
    for size in (180, 192, 512):
        path = HERE / f"icon-{size}.png"
        master.resize((size, size), Image.Resampling.LANCZOS).save(path, "PNG", optimize=True)
        print(f"wrote {path.name} ({size}x{size})")


if __name__ == "__main__":
    main()
