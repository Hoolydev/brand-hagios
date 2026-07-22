"""Serviço HTTP dos agentes (FastAPI).

Expõe os 2 agentes para o studio (Next.js) chamar durante o pipeline de imagem.
Endpoints síncronos rodam em threadpool — ok para chamadas longas (scrape + visão
+ edição). Sobe com:

    uvicorn api:app --port 8787

E no studio, defina HERO_AGENT_URL=http://localhost:8787
"""
from __future__ import annotations

import base64

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(title="Hagios Hero Agents", version="1.0.0")


class HeroRequest(BaseModel):
    theme: str
    brand: str = "monster"
    audience: str | None = None
    candidates: int | None = None


class SwapRequest(BaseModel):
    image_base64: str
    brand: str = "monster"


class SourceRequest(BaseModel):
    theme: str
    audience: str | None = None
    candidates: int | None = None


class ProductRequest(BaseModel):
    brand: str = "monster"


@app.get("/health")
def health() -> dict:
    # Importa aqui para o /health responder mesmo sem OPENAI_API_KEY
    try:
        from config import SETTINGS

        return {
            "ok": True,
            "llm_provider": SETTINGS.llm_provider,
            "sourcing_mode": SETTINGS.sourcing_mode,
            "swap_mode": SETTINGS.swap_mode,
            "fal_composite_model": SETTINGS.fal_composite_model if SETTINGS.swap_mode == "reference" else None,
            "fal_gen_model": SETTINGS.fal_gen_model if SETTINGS.sourcing_mode == "generate" else None,
            "image_edit_provider": SETTINGS.image_edit_provider,
            "fal_edit_model": SETTINGS.fal_edit_model if SETTINGS.image_edit_provider == "fal" else None,
            "image_model": SETTINGS.image_model,
            "text_model": SETTINGS.text_model,
            "fal_key": bool(SETTINGS.fal_key),
            "pinterest_cookie": bool(SETTINGS.pinterest_cookie),
        }
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "error": str(exc)}


@app.post("/source")
def source(req: SourceRequest) -> dict:
    """Só o Agente 1: encontra a foto-base no Pinterest."""
    import sourcing_agent

    try:
        result = sourcing_agent.find_base_image(
            req.theme, audience=req.audience, candidate_count=req.candidates
        )
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return {
        "mode": result.mode,
        "queries": result.queries,
        "image_base64": base64.b64encode(result.best.image).decode("ascii"),
        "source": _pin_meta(result.best),
        "alternatives": [_pin_meta(c) for c in result.ranked[1:6]],
    }


@app.post("/product")
def product(req: ProductRequest) -> dict:
    """Só o Agente 3: encontra a imagem real da lata da marca."""
    import product_research

    try:
        result = product_research.find_product_image(req.brand)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return {
        "brand": result.brand_name,
        "source": result.source,
        "score": result.score,
        "image_base64": base64.b64encode(result.image).decode("ascii"),
    }


@app.post("/swap")
def swap(req: SwapRequest) -> dict:
    """Só o Agente 2: troca a lata numa foto-base fornecida (base64)."""
    import swap_agent

    try:
        base_image = base64.b64decode(req.image_base64)
        result = swap_agent.swap_can(base_image, req.brand)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return {
        "image_base64": base64.b64encode(result.image).decode("ascii"),
        "brand": result.brand_name,
        "provider": result.provider,
        "can_box": result.can_box,
    }


@app.post("/hero")
def hero(req: HeroRequest) -> dict:
    """Pipeline completo: sourcing + swap -> herói da capa."""
    import sourcing_agent
    import swap_agent

    try:
        sourced = sourcing_agent.find_base_image(
            req.theme, audience=req.audience, candidate_count=req.candidates, brand=req.brand
        )
        swapped = swap_agent.swap_can(sourced.best.image, req.brand)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return {
        "image_base64": base64.b64encode(swapped.image).decode("ascii"),
        "mime": "image/png",
        "brand": swapped.brand_name,
        "brand_slug": req.brand,
        "provider": swapped.provider,
        "sourcing_mode": sourced.mode,
        "can_box": swapped.can_box,
        "queries": sourced.queries,
        "source": _pin_meta(sourced.best),
    }


def _pin_meta(candidate) -> dict:
    pin = candidate.pin
    return {
        "pin_url": pin.pin_url,
        "image_url": pin.image_url,
        "description": pin.description,
        "score": candidate.score,
        "reason": candidate.reason,
    }
