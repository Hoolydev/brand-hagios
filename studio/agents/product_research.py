"""Agente 3 — Pesquisa de Produto.

Encontra a imagem REAL da lata da marca, para o Agente 2 compor a lata verdadeira
na mão da pessoa (embalagem/logo fiéis, sem inventar).

Ordem de resolução:
  1. Asset local curado em agents/brands/<slug>.(png|jpg|jpeg|webp) — o mais fiel,
     use para a marca-cliente (ex.: paz.png) ou para travar uma lata específica.
  2. Busca na web (DuckDuckGo Images, sem API/chave) + ranqueamento por visão.

É busca/scraping: respeite direitos de imagem. Para uso comercial, prefira o
asset oficial da marca no diretório local.
"""
from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path

import requests

import brands
from brain import vision_json
from config import SETTINGS

_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
)
_ASSET_DIR = Path(__file__).resolve().parent / "brands"
_ASSET_EXTS = ("png", "jpg", "jpeg", "webp")


@dataclass
class ProductResult:
    brand_slug: str
    brand_name: str
    image: bytes
    source: str          # "local" ou URL
    score: float = 0.0
    reason: str = ""


# ----------------------------------------------------------------------------
# Asset local
# ----------------------------------------------------------------------------
def _local_asset(slug: str) -> tuple[bytes, str] | None:
    key = slug.strip().lower().replace(" ", "").replace("-", "")
    for ext in _ASSET_EXTS:
        path = _ASSET_DIR / f"{key}.{ext}"
        if path.exists():
            return path.read_bytes(), str(path)
    return None


# ----------------------------------------------------------------------------
# Busca web (DuckDuckGo Images)
# ----------------------------------------------------------------------------
def _ddg_images(query: str, limit: int) -> list[dict]:
    session = requests.Session()
    session.headers.update({"User-Agent": _UA})
    r = session.post("https://duckduckgo.com/", data={"q": query}, timeout=20)
    m = re.search(r'vqd=["\']([\d-]+)["\']', r.text) or re.search(r"vqd=([\d-]+)&", r.text)
    if not m:
        raise RuntimeError("DuckDuckGo: token vqd não encontrado (layout pode ter mudado).")
    resp = session.get(
        "https://duckduckgo.com/i.js",
        params={"l": "us-en", "o": "json", "q": query, "vqd": m.group(1), "f": ",,,", "p": "1"},
        headers={"Referer": "https://duckduckgo.com/"},
        timeout=20,
    )
    resp.raise_for_status()
    return resp.json().get("results", [])[:limit]


def _download(url: str) -> bytes:
    resp = requests.get(url, headers={"User-Agent": _UA}, timeout=20)
    resp.raise_for_status()
    if len(resp.content) < 2000:  # placeholders/anti-hotlink costumam ser minúsculos
        raise RuntimeError("imagem muito pequena (provável bloqueio de hotlink)")
    return resp.content


def _score_can(image: bytes, brand_name: str) -> dict:
    instruction = (
        f"Esta imagem deve ser uma FOTO DE PRODUTO de UMA lata da marca "
        f"'{brand_name}'. Dê nota 0-100 considerando:\n"
        "1. É exatamente uma lata dessa marca (logo/cores corretos).\n"
        "2. Uma única lata, de frente, inteira e nítida.\n"
        "3. Foto de produto limpa (fundo neutro/branco/transparente), SEM mão, "
        "SEM pessoa, sem colagem.\n"
        "Penalize se for outra marca, várias latas, com pessoa, ou com watermark.\n\n"
        'Responda SOMENTE JSON: {"score":90,"is_clean_product":true,"reason":"..."}'
    )
    return vision_json(instruction, image)


# ----------------------------------------------------------------------------
# API pública
# ----------------------------------------------------------------------------
def find_product_image(brand_slug: str, count: int | None = None) -> ProductResult:
    brand = brands.resolve(brand_slug)
    print(f"[Agente 3 · Pesquisa] produto = {brand['name']}")

    # 1) asset local curado
    local = _local_asset(brand_slug)
    if local:
        data, path = local
        print(f"  usando asset local: {path}")
        return ProductResult(brand_slug, brand["name"], data, source="local", score=100.0)

    # 2) busca web + ranking por visão
    limit = count or SETTINGS.research_count
    query = f"{brand['name']} energy drink can product photo white background"
    print(f"  buscando na web: '{query}'")
    results = _ddg_images(query, limit)

    best: ProductResult | None = None
    for item in results:
        url = item.get("image")
        if not url:
            continue
        try:
            data = _download(url)
            scored = _score_can(data, brand["name"])
        except Exception as exc:
            print(f"  candidato ignorado ({str(url)[:50]}…): {exc}")
            continue
        raw = float(scored.get("score", 0) or 0)
        score = raw * 100 if raw <= 1 else raw
        if best is None or score > best.score:
            best = ProductResult(
                brand_slug, brand["name"], data, source=url,
                score=score, reason=str(scored.get("reason", "")),
            )
        if best and best.score >= 90:  # bom o bastante, evita gastar visão à toa
            break

    if not best:
        raise RuntimeError(
            f"Nenhuma foto de produto utilizável para '{brand['name']}'. "
            f"Adicione um asset em agents/brands/{brand_slug.lower()}.png."
        )
    print(f"  melhor produto: score={best.score:.0f} — {best.source[:60]}")
    return best
