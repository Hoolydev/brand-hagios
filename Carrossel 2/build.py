"""Carrossel 2 — receita brandsdecoded com identidade HÁGIOS.

Estrutura por tela: cabeçalho · manchete condensada em 2 cores · corpo cinza com
destaques em negrito · card de imagem (evidência) · barra de progresso.
"""
from __future__ import annotations

import pathlib

from PIL import Image, ImageDraw, ImageFont

BASE = pathlib.Path("/Users/holydev/Documents/Brand-Hagios/Carrossel 2")
SHOTS = BASE / "recortes"
OUT = BASE / "artes-hagios"
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


def s1():
    def build(c, d):
        y = headline(d, 168, [
            ("UGC CREATOR,", INK),
            ("AFILIADO, BLOGUEIRO.", INK),
            ("NO PAPEL,", TERRA),
            ("NÃO EXISTEM.", TERRA),
        ], W - M * 2, 92)
        y = rich(d, y + 34, [
            ("O mercado de criadores caminha para ", False), ("US$ 480 bilhões até 2027", True),
            (". Mas nenhuma dessas funções tem registro no Ministério do Trabalho.", False),
        ], W - M * 2, 33, GREY_ON_CREAM, INK)
        card(c, "cbo", (0, 0, 1280, 620), y + 36)
    slide(1, False, CREAM, build).save(OUT / "01-capa.png")


def s2():
    def build(c, d):
        y = headline(d, 168, [
            ("O DINHEIRO SAIU DA TV", WHITE),
            ("E INVENTOU CARGOS", WHITE),
            ("NO CAMINHO.", TERRA),
        ], W - M * 2, 92)
        y = rich(d, y + 34, [
            ("Entre 2013 e 2025 a TV linear caiu de ", False), ("41,3% para 12,4%", True),
            (" do investimento global de mídia. Em maio de 2025 o TikTok Shop chega ao Brasil e cria do zero a função do afiliado.", False),
        ], W - M * 2, 33, GREY_ON_DARK, WHITE)
        card(c, "tiktok", (150, 180, 1250, 700), y + 36)
    slide(2, True, INK, build).save(OUT / "02-deslocamento.png")


def s3():
    def build(c, d):
        y = headline(d, 168, [
            ("QUASE NINGUÉM", INK),
            ("LARGOU O EMPREGO.", INK),
            ("TODO MUNDO", TERRA),
            ("EMPILHOU MAIS UM.", TERRA),
        ], W - M * 2, 92)
        y = rich(d, y + 30, [
            ("Só ", False), ("25,6% vivem exclusivamente de conteúdo", True),
            (". Os outros 74,4% complementam com freela, CLT ou infoproduto. Ninguém trocou de trabalho — empilhou mais um.", False),
        ], W - M * 2, 32, GREY_ON_CREAM, INK)
        y = card(c, "youpix", (40, 250, 845, 487), y + 30, max_h=300)
        card(c, "exame", (60, 483, 1232, 607), y + 16, max_h=160)
    slide(3, False, CREAM, build).save(OUT / "03-virada.png")


def s4():
    def build(c, d):
        y = headline(d, 168, [
            ("BUSQUE 'UGC CREATOR'", INK),
            ("NA BASE OFICIAL DE", INK),
            ("OCUPAÇÕES DO GOVERNO.", INK),
            ("NÃO ESTÁ LÁ.", TERRA),
        ], W - M * 2, 92)
        y = rich(d, y + 30, [
            ("Sem CBO, essas funções ", False), ("não entram no CAGED nem na RAIS", True),
            (". Somem dentro dos 26,1 milhões por conta própria do IBGE.", False),
        ], W - M * 2, 32, GREY_ON_CREAM, INK)
        card(c, "cbo", (420, 180, 1045, 560), y + 30)
    slide(4, False, CREAM, build).save(OUT / "04-tensao.png")


def s5():
    def build(c, d):
        y = headline(d, 236, [
            ("NÃO É FALTA", WHITE),
            ("DE TRABALHO.", WHITE),
            ("É FALTA", TERRA),
            ("DE REGISTRO.", TERRA),
        ], W - M * 2, 104)
        y = rich(d, y + 44, [
            ("A ocupação já existe no mercado. ", True),
            ("Ela ainda não existe no papel — e é por isso que o único número sobre quanto um UGC creator ganha vem de quem vende o curso.", False),
        ], W - M * 2, 33, GREY_ON_DARK, WHITE)
        box_top = y + 50
        lines = ["CBO / Ministério do Trabalho · cbo.mte.gov.br",
                 "Influency.me + Opinion Box, via Exame (2024)",
                 "YouPix, via N4 News (2025)",
                 "WARC, via MediaPost · TikTok Newsroom Brasil"]
        box_bot = box_top + 78 + len(lines) * 38 + 60
        d.rounded_rectangle([M, box_top, W - M, box_bot], 26, outline=(58, 58, 60), width=2)
        tracked(d, (M + 34, box_top + 30), "AS FONTES DESTE CARROSSEL", bold(20), TERRA, 1.6)
        ly = box_top + 78
        for ln in lines:
            d.text((M + 34, ly), ln, font=reg(26), fill=GREY_ON_DARK)
            ly += 38
        tracked(d, (M + 34, ly + 12), "LINKS NOS COMENTÁRIOS · @HAGIOS.AI", bold(19), WHITE, 1.5)
    slide(5, True, INK, build).save(OUT / "05-fechamento.png")


if __name__ == "__main__":
    for fn in (s1, s2, s3, s4, s5):
        fn()
        print("  ->", fn.__name__)
    print("\nArtes em", OUT)
