"""Sistema visual HÁGIOS — módulo compartilhado por todos os carrosséis.

Regras enraizadas aqui:
  · CAPA  = foto jornalística real sangrando + selo + manchete embaixo em 2 cores
  · CORES = terracota no texto editorial, OURO reservado ao logo e à assinatura
  · FIM   = card final fixo, idêntico em todo carrossel (ver final_card.py)

Uso:
    import sys; sys.path.insert(0, "/Users/holydev/Documents/Brand-Hagios/kit")
    from hagios_kit import *
"""
from __future__ import annotations

import math
import pathlib

from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path("/Users/holydev/Documents/Brand-Hagios")
KIT = ROOT / "kit"
BRAND = ROOT / "studio/public/brand"
FINAL_CARD = KIT / "final-card.png"

W, H = 1080, 1350
M = 54

# --- paleta -----------------------------------------------------------------
CREAM = (244, 241, 234)
INK = (14, 14, 15)
TERRA = (217, 119, 87)   # cor editorial: manchetes e destaques
GOLD = (242, 183, 17)    # reservada ao logo e à assinatura
WHITE = (255, 255, 255)
BLUE = (29, 155, 240)
GREY_CREAM = (122, 120, 116)
GREY_DARK = (154, 152, 148)

HN = "/System/Library/Fonts/HelveticaNeue.ttc"


def cond(s): return ImageFont.truetype(HN, s, index=9)   # Condensed Black
def bold(s): return ImageFont.truetype(HN, s, index=1)
def reg(s):  return ImageFont.truetype(HN, s, index=0)


def w_of(d, t, f): return int(d.textbbox((0, 0), t, font=f)[2])


def fit(d, lines, maker, max_w, start, floor=26):
    s = start
    while s > floor:
        f = maker(s)
        if max(w_of(d, ln, f) for ln in lines) <= max_w:
            return s
        s -= 1
    return floor


def fit_seg(d, lines, max_w, start, maker=cond, floor=26):
    """Ajusta manchetes cujas linhas são listas de segmentos (texto, cor)."""
    s = start
    while s > floor:
        f = maker(s)
        if max(sum(w_of(d, t, f) for t, _ in ln) for ln in lines) <= max_w:
            return s
        s -= 1
    return floor


def tracked(d, xy, text, font, fill, track=1.5):
    x, y = xy
    for ch in text:
        d.text((x, y), ch, font=font, fill=fill)
        x += w_of(d, ch, font) + track
    return x


def tracked_w(d, text, font, track=1.5):
    return int(sum(w_of(d, c, font) + track for c in text))


# --- elementos de marca -----------------------------------------------------
def starburst(d, cx, cy, r, colour, points=10):
    pts = []
    for i in range(points * 2):
        ang = math.pi * i / points - math.pi / 2
        rad = r if i % 2 == 0 else r * 0.44
        pts.append((cx + rad * math.cos(ang), cy + rad * math.sin(ang)))
    d.polygon(pts, fill=colour)


def verified(d, cx, cy, r):
    d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=BLUE)
    d.line([(cx - r * .44, cy + r * .02), (cx - r * .10, cy + r * .36), (cx + r * .46, cy - r * .34)],
           fill=WHITE, width=max(3, int(r * .26)), joint="curve")


def badge(d, cy, handle="@hagios.ai", size=34):
    """Selo centralizado: estrela terracota + arroba + verificado."""
    f = bold(size)
    hw = w_of(d, handle, f)
    total = 30 + 14 + hw + 12 + 26
    bx = (W - total) / 2
    starburst(d, bx + 15, cy, 18, TERRA)
    d.text((bx + 44, cy - int(size * .64)), handle, font=f, fill=WHITE)
    verified(d, bx + 56 + hw + 13, cy, 14)


def header(d, dark: bool, left="POWERED BY HÁGIOS", mid="@HAGIOS.AI", right="2026 //"):
    f = bold(16)
    g = (196, 193, 188) if dark else GREY_CREAM
    tracked(d, (M, 44), left, f, g, 1.4)
    tracked(d, ((W - tracked_w(d, mid, f, 1.4)) / 2, 44), mid, f, g, 1.4)
    tracked(d, (W - M - tracked_w(d, right, f, 1.4), 44), right, f, g, 1.4)


def progress(d, page, total, dark: bool):
    y = H - 68
    d.line([(M, y), (W - M - 90, y)], fill=(58, 58, 60) if dark else (214, 210, 202), width=3)
    d.line([(M, y), (M + (W - M * 2 - 90) * page / total, y)], fill=TERRA, width=3)
    f = bold(17)
    lab = f"{page}/{total}"
    d.text((W - M - w_of(d, lab, f), y - 12), lab, font=f, fill=GREY_DARK if dark else GREY_CREAM)


# --- blocos de conteúdo -----------------------------------------------------
def headline(d, y, lines, max_w=W - M * 2, start=92, lead=1.0, maker=cond):
    """lines = [(texto, cor)] — uma cor por linha."""
    size = fit(d, [t for t, _ in lines], maker, max_w, start)
    f = maker(size)
    lh = int(size * lead)
    for text, colour in lines:
        d.text((M, y), text, font=f, fill=colour)
        y += lh
    return y


def headline_seg(d, y, lines, max_w=W - M * 2, start=92, lead=1.04, maker=cond):
    """lines = [[(texto, cor), ...]] — várias cores dentro da mesma linha."""
    size = fit_seg(d, lines, max_w, start, maker)
    f = maker(size)
    lh = int(size * lead)
    for ln in lines:
        x = M
        for text, colour in ln:
            d.text((x, y), text, font=f, fill=colour)
            x += w_of(d, text, f)
        y += lh
    return y


def rich(d, y, segments, max_w, size, base_col, bold_col, lh=None, x0=M):
    """Corpo com trechos (texto, True) em negrito. Concatena antes de quebrar
    para a pontuação no início de um segmento não virar palavra solta."""
    fr, fb = reg(size), bold(size)
    lh = lh or int(size * 1.36)
    flat = "".join(t for t, _ in segments)
    flags = [b for t, b in segments for _ in t]
    words, cur, cur_b = [], "", False
    for ch, b in zip(flat, flags):
        if ch == " ":
            if cur:
                words.append((cur, cur_b))
            cur, cur_b = "", False
        else:
            if not cur:
                cur_b = b
            cur += ch
    if cur:
        words.append((cur, cur_b))
    sr, sb = w_of(d, " ", fr), w_of(d, " ", fb)
    line, x = [], 0
    def flush(ln, yy):
        cx = x0
        for t, b in ln:
            ff = fb if b else fr
            d.text((cx, yy), t, font=ff, fill=bold_col if b else base_col)
            cx += w_of(d, t, ff) + (sb if b else sr)
    for wd, b in words:
        f = fb if b else fr
        ww = w_of(d, wd, f)
        if x + ww > max_w and line:
            flush(line, y); y += lh; line, x = [], 0
        line.append((wd, b)); x += ww + (sb if b else sr)
    if line:
        flush(line, y); y += lh
    return y


def card(canvas, shot_path, box, y, max_h=None, radius=26):
    """Card de evidência: recorte real da fonte, cantos arredondados."""
    img = Image.open(shot_path).convert("RGB").crop(box)
    bw = W - M * 2
    img = img.resize((bw, max(1, int(img.height * bw / img.width))), Image.LANCZOS)
    max_h = max_h or (H - 108 - y)
    if img.height > max_h:
        img = img.crop((0, 0, bw, max_h))
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, img.width, img.height], radius, fill=255)
    canvas.paste(img, (M, y), mask)
    return y + img.height


# --- REGRA DA CAPA ----------------------------------------------------------
def build_cover(photo_path, lines, source_line, out_path, focus=0.5, total=6, start=74):
    """Capa padrão HÁGIOS: foto real sangrando, selo centralizado e manchete
    embaixo em duas cores. `lines` = [[(texto, cor), ...]]."""
    c = Image.new("RGB", (W, H), INK)
    p = Image.open(photo_path).convert("RGB")
    sc = max(W / p.width, H / p.height)
    p = p.resize((int(p.width * sc), int(p.height * sc)), Image.LANCZOS)
    left = int((p.width - W) * focus)
    c.paste(p.crop((left, 0, left + W, H)), (0, 0))

    bot = Image.new("L", (1, H), 0)
    for y in range(H):
        t = max(0.0, (y - H * .30) / (H * .70))
        bot.putpixel((0, y), int(250 * (t ** 1.35)))
    c.paste(Image.new("RGB", (W, H), (6, 5, 8)), (0, 0), bot.resize((W, H)))
    top = Image.new("L", (1, H), 0)
    for y in range(H):
        top.putpixel((0, y), int(165 * max(0.0, 1 - y / 170) ** 1.2))
    c.paste(Image.new("RGB", (W, H), (6, 5, 8)), (0, 0), top.resize((W, H)))

    d = ImageDraw.Draw(c)
    header(d, True)
    size = fit_seg(d, lines, W - M * 2, start)
    lh = int(size * 1.04)
    y = H - 118 - lh * len(lines)
    badge(d, y - 62)
    headline_seg(d, y, lines, start=size)
    d.text((M, H - 96), source_line, font=reg(21), fill=(168, 165, 160))
    c.save(out_path)
    return out_path


def append_final_card(out_dir, name="99-final.png"):
    """Copia o card final fixo para o fim do carrossel."""
    dest = pathlib.Path(out_dir) / name
    if not FINAL_CARD.exists():
        raise FileNotFoundError(f"card final não gerado: {FINAL_CARD} (rode kit/final_card.py)")
    Image.open(FINAL_CARD).save(dest)
    return dest
