"""Scraping de busca do Pinterest.

Usa o endpoint interno `BaseSearchResource` que a própria interface do Pinterest
consome. É frágil por natureza (pode mudar/bloquear) — por isso todo erro é
explícito e há suporte opcional a cookie de sessão via `PINTEREST_COOKIE`.

Não há API oficial aqui: isto é scraping. Respeite os Termos do Pinterest e o
direito de imagem antes de republicar qualquer foto num carrossel comercial.
"""
from __future__ import annotations

import json
import urllib.parse
from dataclasses import dataclass

import requests

from config import SETTINGS

_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
)


@dataclass
class PinResult:
    image_url: str
    pin_url: str
    description: str
    width: int
    height: int


def _base_url() -> str:
    tld = SETTINGS.pinterest_tld.strip().lstrip(".") or "com"
    return f"https://www.pinterest.{tld}"


def _headers() -> dict[str, str]:
    headers = {
        "User-Agent": _UA,
        "Accept": "application/json, text/javascript, */*, q=0.01",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
        "X-Requested-With": "XMLHttpRequest",
        "X-APP-VERSION": "cb5a1c1",
        "X-Pinterest-AppState": "active",
        "Referer": f"{_base_url()}/",
    }
    if SETTINGS.pinterest_cookie:
        headers["Cookie"] = SETTINGS.pinterest_cookie
    return headers


def _best_image(images: dict) -> tuple[str, int, int] | None:
    """Escolhe a maior variação disponível de uma pin (orig > 736x > ...)."""
    for key in ("orig", "736x", "600x", "474x", "236x"):
        node = images.get(key)
        if node and node.get("url"):
            return node["url"], node.get("width", 0), node.get("height", 0)
    return None


def search(query: str, limit: int = 16) -> list[PinResult]:
    """Retorna até `limit` pins para a busca. Lança em falha de rede/formato."""
    options = {
        "options": {
            "query": query,
            "scope": "pins",
            "bookmarks": [""],
            "page_size": max(limit * 2, 25),
        },
        "context": {},
    }
    data = json.dumps(options, separators=(",", ":"))
    source_url = f"/search/pins/?q={urllib.parse.quote(query)}"
    params = {
        "source_url": source_url,
        "data": data,
        "_": "0",
    }
    url = f"{_base_url()}/resource/BaseSearchResource/get/"

    resp = requests.get(url, params=params, headers=_headers(), timeout=25)
    if resp.status_code == 403:
        raise RuntimeError(
            "Pinterest devolveu 403 (bloqueio). Preencha PINTEREST_COOKIE no "
            "agents/.env com o cookie de uma sessão logada e tente de novo."
        )
    resp.raise_for_status()

    try:
        payload = resp.json()
        results = payload["resource_response"]["data"]["results"]
    except (ValueError, KeyError) as exc:
        raise RuntimeError(
            f"Formato inesperado do Pinterest (a estrutura pode ter mudado): {exc}"
        ) from exc

    pins: list[PinResult] = []
    for item in results:
        images = item.get("images") or {}
        best = _best_image(images)
        if not best:
            continue
        image_url, w, h = best
        description = (
            item.get("grid_title")
            or item.get("description")
            or (item.get("rich_summary") or {}).get("display_name")
            or ""
        )
        pins.append(
            PinResult(
                image_url=image_url,
                pin_url=f"{_base_url()}/pin/{item.get('id', '')}/",
                description=description.strip(),
                width=int(w or 0),
                height=int(h or 0),
            )
        )
        if len(pins) >= limit:
            break

    if not pins:
        raise RuntimeError(
            f"Nenhum pin retornado para '{query}'. Tente outra query ou cookie."
        )
    return pins


def download(image_url: str) -> bytes:
    resp = requests.get(image_url, headers={"User-Agent": _UA}, timeout=25)
    resp.raise_for_status()
    return resp.content
