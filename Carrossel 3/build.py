"""Carrossel 2 — receita brandsdecoded com identidade HÁGIOS.

Estrutura por tela: cabeçalho · manchete condensada em 2 cores · corpo cinza com
destaques em negrito · card de imagem (evidência) · barra de progresso.
"""
from __future__ import annotations

import pathlib

from PIL import Image, ImageDraw, ImageFont

BASE = pathlib.Path("/Users/holydev/Documents/Brand-Hagios/Carrossel 3")
SHOTS = BASE / "recortes"
OUT = BASE / "artes"
FOTOS = BASE / "fotos"
OUT.mkdir(parents=True, exist_ok=True)

W, H = 1080, 1350
TOTAL = 6  # 5 telas + card final fixo
M = 58

CREAM = (244, 241, 234)
INK = (14, 14, 15)
TERRA = (217, 119, 87)
WHITE = (255, 255, 255)
GREY_ON_CREAM = (122, 120, 116)
GREY_ON_DARK = (154, 152, 148)

HN = "/System/Library/Fonts/HelveticaNeue.ttc"


def cond(s):      return ImageFont.truetype(HN, s, index=9)   # Condensed Black
def reg(s):       return ImageFont.truetype(HN, s, index=0)   # Regular
def bold(s):      return ImageFont.truetype(HN, s, index=1)   # Bold


def w_of(d, t, f):
    return int(d.textbbox((0, 0), t, font=f)[2])


def fit(d, lines, maker, max_w, start, floor=26):
    s = start
    while s > floor:
        f = maker(s)
        if max(w_of(d, ln, f) for ln in lines) <= max_w:
            return s
        s -= 1
    return floor


def tracked(d, xy, text, font, fill, track=1.6):
    x, y = xy
    for ch in text:
        d.text((x, y), ch, font=font, fill=fill)
        x += w_of(d, ch, font) + track
    return x


def tracked_w(d, text, font, track=1.6):
    return int(sum(w_of(d, c, font) + track for c in text))


def header(d, dark: bool, left="POWERED BY HÁGIOS", mid="@HAGIOS.AI", right="2026 //"):
    """Cabecalho canonico do kit: assinatura / arroba centralizada / ano."""
    f = bold(16)
    g = GREY_ON_DARK if dark else GREY_ON_CREAM
    tracked(d, (M, 44), left, f, g, 1.4)
    tracked(d, ((W - tracked_w(d, mid, f, 1.4)) / 2, 44), mid, f, g, 1.4)
    tracked(d, (W - M - tracked_w(d, right, f, 1.4), 44), right, f, g, 1.4)


def progress(d, page, total, dark: bool):
    y = H - 68
    track_col = (58, 58, 60) if dark else (214, 210, 202)
    d.line([(M, y), (W - M - 90, y)], fill=track_col, width=3)
    end = M + (W - M * 2 - 90) * page / total
    d.line([(M, y), (end, y)], fill=TERRA, width=3)
    f = bold(17)
    label = f"{page}/{total}"
    grey = GREY_ON_DARK if dark else GREY_ON_CREAM
    d.text((W - M - w_of(d, label, f), y - 12), label, font=f, fill=grey)


def headline(d, y, lines, max_w, start=96, lead=1.0):
    """lines = [(texto, cor)]. Manchete condensada, caixa alta, duas cores."""
    size = fit(d, [t for t, _ in lines], cond, max_w, start)
    f = cond(size)
    lh = int(size * lead)
    for text, colour in lines:
        d.text((M, y), text, font=f, fill=colour)
        y += lh
    return y


def rich(d, y, segments, max_w, size, base_col, bold_col, lh=None):
    """Corpo em cinza com trechos (texto, True) em negrito escuro."""
    fr, fb = reg(size), bold(size)
    lh = lh or int(size * 1.36)
    # concatena tudo antes de quebrar, senao a pontuacao no inicio de um
    # segmento vira palavra solta e abre espaco antes do ponto
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
    line, x = [], 0
    space_r, space_b = w_of(d, " ", fr), w_of(d, " ", fb)
    for wd, is_b in words:
        f = fb if is_b else fr
        ww = w_of(d, wd, f)
        sp = space_b if is_b else space_r
        if x + ww > max_w and line:
            cx = M
            for t, b in line:
                ff = fb if b else fr
                d.text((cx, y), t, font=ff, fill=bold_col if b else base_col)
                cx += w_of(d, t, ff) + (space_b if b else space_r)
            y += lh
            line, x = [], 0
        line.append((wd, is_b))
        x += ww + sp
    if line:
        cx = M
        for t, b in line:
            ff = fb if b else fr
            d.text((cx, y), t, font=ff, fill=bold_col if b else base_col)
            cx += w_of(d, t, ff) + (space_b if b else space_r)
        y += lh
    return y


CARD_BOTTOM = H - 108


def card(canvas, shot, box, y, max_h=None, radius=26, pad=0):
    """Card de evidência: recorte real da fonte, cantos arredondados."""
    img = Image.open(SHOTS / f"{shot}.png").convert("RGB").crop(box)
    box_w = W - M * 2
    img = img.resize((box_w, max(1, int(img.height * box_w / img.width))), Image.LANCZOS)
    max_h = max_h or (CARD_BOTTOM - y)
    if img.height > max_h:
        img = img.crop((0, 0, box_w, max_h))
    mask = Image.new("L", img.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, img.width, img.height], radius, fill=255)
    canvas.paste(img, (M, y), mask)
    return y + img.height


# ------------------------------------------------------------------ telas
def slide(n, dark, bg, build):
    c = Image.new("RGB", (W, H), bg)
    d = ImageDraw.Draw(c)
    header(d, dark)
    build(c, d)
    progress(d, n, TOTAL, dark)
    return c


def s2():
    def build(c, d):
        y = headline(d, 168, [
            ("O TIKTOK SHOP SAIU DE", WHITE),
            ("US$ 1 MILHÃO PARA", WHITE),
            ("US$ 46 MI POR MÊS.", TERRA),
        ], W - M * 2, 92)
        y = rich(d, y + 34, [
            ("Em três meses de operação no Brasil o GMV mensal saltou de US$ 1 milhão para ", False),
            ("US$ 46,1 milhões", True),
            (", segundo a Momentum Works. No mundo, a plataforma movimentou US$ 64,3 bilhões em 2025 — quase o dobro do ano anterior.", False),
        ], W - M * 2, 32, GREY_ON_DARK, WHITE)
        y = card(c, "momentum", (106, 636, 1180, 836), y + 34)
        stats = [("MAI/2025", "US$ 1 MI"), ("AGO/2025", "US$ 46,1 MI"), ("GLOBAL 2025", "US$ 64,3 BI")]
        bw = (W - M * 2 - 32) // 3
        by = y + 34
        for i, (rot, val) in enumerate(stats):
            bx = M + i * (bw + 16)
            d.rounded_rectangle([bx, by, bx + bw, by + 168], 20, fill=(24, 24, 26))
            tracked(d, (bx + 24, by + 30), rot, bold(18), TERRA, 1.4)
            vs = fit(d, [val], cond, bw - 48, 58)
            d.text((bx + 24, by + 72), val, font=cond(vs), fill=WHITE)
    slide(2, True, INK, build).save(OUT / "02-mercado.png")


def s3():
    def build(c, d):
        y = headline(d, 168, [
            ("VOCÊ NÃO PRECISA", INK),
            ("TER ESTOQUE.", INK),
            ("PRECISA SABER VENDER.", TERRA),
        ], W - M * 2, 92)
        y = rich(d, y + 32, [
            ("A comissão do afiliado é definida por produto e vai de ", False),
            ("5% a 30%", True),
            (", com prática de mercado entre 8% e 15%. O pagamento cai em até 15 dias após a entrega, via PIX, com saque mínimo de R$ 50. E 68% dos empreendedores da plataforma vendem só com alcance orgânico, sem pagar mídia.", False),
        ], W - M * 2, 31, GREY_ON_CREAM, INK)
        card(c, "exame_tiktok", (0, 0, 1280, 760), y + 32)
    slide(3, False, CREAM, build).save(OUT / "03-comissao.png")


def s4():
    def build(c, d):
        y = headline(d, 168, [
            ("UMA LOJA VENDEU", INK),
            ("R$ 17 MILHÕES. UMA", INK),
            ("CRIADORA, R$ 400 MIL", TERRA),
            ("EM UMA ÚNICA LIVE.", TERRA),
        ], W - M * 2, 92)
        y = rich(d, y + 30, [
            ("A BigHome entrou em dezembro de 2025 e chegou a R$ 17 milhões com 300 afiliados ativos. ", False),
            ("Vitória Merlos acumula R$ 2,8 milhões em vendas", True),
            (". A Natura fez 52 mil lives em 2025, 60% delas conduzidas por consultoras. Valores de vendas divulgados pelo próprio TikTok.", False),
        ], W - M * 2, 30, GREY_ON_CREAM, INK)
        card(c, "tiktok", (150, 180, 1250, 700), y + 30)
    slide(4, False, CREAM, build).save(OUT / "04-casos.png")


def s5():
    def build(c, d):
        y = headline(d, 150, [
            ("E 80% DAS EMPRESAS", WHITE),
            ("NÃO ACHAM", WHITE),
            ("QUEM CONTRATAR.", TERRA),
        ], W - M * 2, 92)
        y = rich(d, y + 30, [
            ("77,1% das indústrias paulistas não preencheram vagas e ", False),
            ("55% apontam falta de candidatos interessados", True),
            (" (FIESP/SENAI-SP). O Brasil precisa qualificar 14 milhões de profissionais até 2027. Dos jovens, 58% querem o próprio negócio e 11% veem a indústria como carreira.", False),
        ], W - M * 2, 30, GREY_ON_DARK, WHITE)
        y = card(c, "senai", (205, 335, 1075, 578), y + 30)
        y = headline(d, y + 46, [("AS DUAS PORTAS ESTÃO ABERTAS.", WHITE)], W - M * 2, 70)
        rich(d, y + 22, [
            ("De um lado, ", False), ("14 milhões de vagas para qualificar", True),
            (". Do outro, um mercado que nasceu ontem e já paga comissão. Nunca custou tão pouco começar dos dois lados.", False),
        ], W - M * 2, 29, GREY_ON_DARK, WHITE)
    slide(5, True, INK, build).save(OUT / "05-contraste.png")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for fn in (s2, s3, s4, s5):
        fn()
        print("  ->", fn.__name__)
    print("\nArtes em", OUT)
