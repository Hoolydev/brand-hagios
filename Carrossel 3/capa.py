"""Capa no padrão da grade @brandsdecoded, com identidade HÁGIOS.

Foto sangrando · cabeçalho · selo central · manchete embaixo em duas cores.
Gera duas versões para escolha: foto real do evento e foto gerada.
"""
from __future__ import annotations

import math
import pathlib

from PIL import Image, ImageDraw, ImageFont

BASE = pathlib.Path("/Users/holydev/Documents/Brand-Hagios/Carrossel 3")
FOTOS = BASE / "fotos"
OUT = BASE / "artes"
OUT.mkdir(parents=True, exist_ok=True)

W, H = 1080, 1350
M = 52
TERRA = (217, 119, 87)
WHITE = (255, 255, 255)
BLUE = (29, 155, 240)
HN = "/System/Library/Fonts/HelveticaNeue.ttc"


def cond(s): return ImageFont.truetype(HN, s, index=9)
def bold(s): return ImageFont.truetype(HN, s, index=1)
def reg(s):  return ImageFont.truetype(HN, s, index=0)


def w_of(d, t, f): return int(d.textbbox((0, 0), t, font=f)[2])


def tracked(d, xy, text, font, fill, track=1.5):
    x, y = xy
    for ch in text:
        d.text((x, y), ch, font=font, fill=fill)
        x += w_of(d, ch, font) + track
    return x


def tracked_w(d, text, font, track=1.5):
    return int(sum(w_of(d, c, font) + track for c in text))


def starburst(d, cx, cy, r, colour, points=10):
    pts = []
    for i in range(points * 2):
        ang = math.pi * i / points - math.pi / 2
        rad = r if i % 2 == 0 else r * 0.44
        pts.append((cx + rad * math.cos(ang), cy + rad * math.sin(ang)))
    d.polygon(pts, fill=colour)


def verified(d, cx, cy, r):
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=BLUE)
    d.line([(cx - r * 0.44, cy + r * 0.02), (cx - r * 0.10, cy + r * 0.36), (cx + r * 0.46, cy - r * 0.34)],
           fill=WHITE, width=max(3, int(r * 0.26)), joint="curve")


def fit_lines(d, lines, max_w, start):
    """Maior corpo em que a linha mais larga (soma dos segmentos) cabe."""
    s = start
    while s > 26:
        f = cond(s)
        if max(sum(w_of(d, t, f) for t, _ in ln) for ln in lines) <= max_w:
            return s
        s -= 1
    return 26


def build(photo_name: str, out_name: str, focus: float = 0.5):
    c = Image.new("RGB", (W, H), (10, 10, 12))
    p = Image.open(FOTOS / photo_name).convert("RGB")
    sc = max(W / p.width, H / p.height)
    p = p.resize((int(p.width * sc), int(p.height * sc)), Image.LANCZOS)
    left = int((p.width - W) * focus)
    c.paste(p.crop((left, 0, left + W, H)), (0, 0))

    # scrim inferior para a manchete e leve escurecida no topo
    bot = Image.new("L", (1, H), 0)
    for y in range(H):
        t = max(0.0, (y - H * 0.30) / (H * 0.70))
        bot.putpixel((0, y), int(250 * (t ** 1.35)))
    c.paste(Image.new("RGB", (W, H), (6, 5, 8)), (0, 0), bot.resize((W, H)))
    top = Image.new("L", (1, H), 0)
    for y in range(H):
        top.putpixel((0, y), int(165 * max(0.0, 1 - y / 170) ** 1.2))
    c.paste(Image.new("RGB", (W, H), (6, 5, 8)), (0, 0), top.resize((W, H)))

    d = ImageDraw.Draw(c)

    # cabeçalho
    hf = bold(16)
    tracked(d, (M, 44), "POWERED BY HÁGIOS", hf, (196, 193, 188), 1.4)
    mid = "@HAGIOS.AI"
    tracked(d, ((W - tracked_w(d, mid, hf, 1.4)) / 2, 44), mid, hf, (196, 193, 188), 1.4)
    rt = "2026 //"
    tracked(d, (W - M - tracked_w(d, rt, hf, 1.4), 44), rt, hf, (196, 193, 188), 1.4)

    # manchete (segmentos coloridos por linha)
    lines = [
        [("O TIKTOK SHOP CRESCEU ", WHITE), ("102 VEZES", TERRA)],
        [("EM UM ANO NO BRASIL:", WHITE)],
        [("A PROFISSÃO QUE PAGA ATÉ ", WHITE), ("30%", TERRA)],
        [("DE COMISSÃO", TERRA), (" E NÃO EXIGE DIPLOMA", WHITE)],
    ]
    size = fit_lines(d, lines, W - M * 2, 74)
    f = cond(size)
    lh = int(size * 1.04)
    block = lh * len(lines)
    y = H - 118 - block

    # selo da conta acima da manchete
    bf = bold(34)
    handle = "@hagios.ai"
    hw = w_of(d, handle, bf)
    total = 30 + 14 + hw + 12 + 26
    bx = (W - total) / 2
    by = y - 62
    starburst(d, bx + 15, by, 18, TERRA)
    d.text((bx + 30 + 14, by - 22), handle, font=bf, fill=WHITE)
    verified(d, bx + 30 + 14 + hw + 12 + 13, by, 14)

    for ln in lines:
        x = M
        for text, col in ln:
            d.text((x, y), text, font=f, fill=col)
            x += w_of(d, text, f)
        y += lh

    d.text((M, H - 96), "Fonte: TikTok Newsroom Brasil · Momentum Works · jun 2026",
           font=reg(21), fill=(168, 165, 160))
    c.save(OUT / out_name)
    print("  ->", out_name)


if __name__ == "__main__":
    build("tiktok_evento.jpg", "01-capa-A-foto-real.png", focus=0.30)
    build("flux_1.png", "01-capa-B-gerada.png", focus=0.5)
