"""Catálogo de latas de energético para o Agente 2.

Cada entrada descreve a lata em detalhe para o prompt de edição ficar fiel.
Você pode sobrescrever/estender criando um JSON em agents/brands/<slug>.json:
    {"name": "...", "description": "..."}
"""
from __future__ import annotations

import json
from pathlib import Path

_BUILTIN: dict[str, dict[str, str]] = {
    "monster": {
        "name": "Monster Energy",
        "description": (
            "lata preta fosca de Monster Energy com o logo icônico em verde neon "
            "no formato de garra de três riscos (o 'M' rasgado), texto 'MONSTER "
            "ENERGY' branco na base, acabamento matte"
        ),
    },
    "redbull": {
        "name": "Red Bull",
        "description": (
            "lata alta e fina prata/azul da Red Bull, com os dois touros vermelhos "
            "colidindo sobre um sol amarelo, faixas diagonais azul e prata, "
            "texto 'Red Bull' em vermelho"
        ),
    },
    "baly": {
        "name": "Baly",
        "description": (
            "lata da Baly Energy Drink com gradiente colorido vibrante e o logo "
            "'BALY' em destaque, visual jovem e tropical"
        ),
    },
    "paz": {
        "name": "PAZ",
        "description": (
            "lata prata clean da marca 'PAZ' com o logotipo 'PAZ' em letras "
            "vermelhas grandes e verticais em estilo condensado, minimalista, "
            "acabamento acetinado — a marca-cliente do carrossel"
        ),
    },
}


def resolve(slug: str) -> dict[str, str]:
    key = slug.strip().lower().replace(" ", "").replace("-", "")
    # override/adicional em agents/brands/<slug>.json
    custom = Path(__file__).resolve().parent / "brands" / f"{key}.json"
    if custom.exists():
        data = json.loads(custom.read_text(encoding="utf-8"))
        return {"name": data.get("name", slug), "description": data["description"]}
    if key in _BUILTIN:
        return _BUILTIN[key]
    # marca desconhecida: usa o próprio nome como descrição mínima
    return {
        "name": slug,
        "description": f"lata de energético da marca '{slug}', design realista e nítido",
    }


def available() -> list[str]:
    slugs = set(_BUILTIN)
    folder = Path(__file__).resolve().parent / "brands"
    if folder.exists():
        slugs.update(p.stem for p in folder.glob("*.json"))
    return sorted(slugs)
