"""Card final FIXO do HÁGIOS — gerado uma vez, usado em todo carrossel.

Estrutura espelhada da referência @brandsdecoded: manchete em duas cores,
checklist à direita, divisor e CTA de comentário.

Para trocar a oferta, mexa só em KEYWORD e ITENS/ENTREGA abaixo.
"""
from __future__ import annotations

import sys

sys.path.insert(0, "/Users/holydev/Documents/Brand-Hagios/kit")

from PIL import Image, ImageDraw

from hagios_kit import (BRAND, FINAL_CARD, GOLD, GREY_DARK, H, INK, M, TERRA, W, WHITE,
                        bold, cond, fit_seg, headline_seg, header, reg, rich, w_of)

# ---------------------------------------------------------------- oferta
KEYWORD = "IA"
ITENS = [
    ("Diagnóstico de onde a IA entra no seu negócio", False),
    ("Implementação com dado, não com achismo", False),
    ("Conteúdo semanal com fonte verificada", True),   # True = destaque terracota
]
ENTREGA = "e eu te mando o primeiro passo para adaptar seu negócio à nova era da IA."


def check(d, x, y, s=30):
    """Marcador de item: quadrado terracota com tique branco."""
    d.rounded_rectangle([x, y, x + s, y + s], 8, fill=TERRA)
    d.line([(x + s * .24, y + s * .52), (x + s * .43, y + s * .71), (x + s * .78, y + s * .29)],
           fill=WHITE, width=4, joint="curve")


def build():
    c = Image.new("RGB", (W, H), INK)
    d = ImageDraw.Draw(c)
    header(d, True, left="POWERED BY HÁGIOS", mid="@HAGIOS.AI", right="2026 //")

    # logo em ouro
    logo = Image.open(BRAND / "hagios-logo-transparent.png").convert("RGBA")
    lw = 250
    logo = logo.resize((lw, int(logo.height * lw / logo.width)), Image.LANCZOS)
    c.paste(logo, (M, 104), logo)

    # manchete: duas cores, terracota no que importa
    lines = [
        [("O MOVIMENTO HÁGIOS", WHITE)],
        [("AJUDA EMPREENDEDORES", WHITE)],
        [("A SE ADAPTAREM À ", WHITE), ("NOVA", TERRA)],
        [("ERA DA INTELIGÊNCIA", TERRA)],
        [("ARTIFICIAL.", TERRA)],
    ]
    size = fit_seg(d, lines, W - M * 2, 78)
    y = headline_seg(d, 400, lines, start=size)

    # checklist
    y += 44
    fi = reg(31)
    for texto, destaque in ITENS:
        check(d, M, y + 2)
        d.text((M + 48, y - 2), texto, font=fi if not destaque else bold(31),
               fill=WHITE if not destaque else TERRA)
        y += 58

    # divisor + CTA
    y += 26
    d.line([(M, y), (W - M, y)], fill=(58, 58, 60), width=2)
    y += 34
    y = rich(d, y, [("Comenta ", False), (f'"{KEYWORD}"', True), (f" {ENTREGA}", False)],
             W - M * 2, 33, WHITE, TERRA)

    # assinatura em ouro
    d.text((M, H - 96), "@hagios.ai  ·  MOVIMENTO HÁGIOS", font=bold(21), fill=GOLD)
    c.save(FINAL_CARD)
    print("  ->", FINAL_CARD)


if __name__ == "__main__":
    build()
