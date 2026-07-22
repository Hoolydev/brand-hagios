"""Configuração compartilhada pelos agentes.

Carrega o `agents/.env` e resolve os providers. A OpenAI é OPCIONAL: com
`LLM_PROVIDER=fal` e `IMAGE_EDIT_PROVIDER=fal`, tudo (cérebro + pixels) roda pela
mesma `FAL_KEY` via os endpoints `any-llm` / FLUX da fal.ai — não precisa de key
da OpenAI. Sem os providers necessários configurados, o import falha cedo.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

# Carrega agents/.env primeiro; se não existir, tenta o .env.local do studio
_HERE = Path(__file__).resolve().parent
load_dotenv(_HERE / ".env")
load_dotenv(_HERE.parent / ".env.local", override=False)


@dataclass(frozen=True)
class Settings:
    llm_provider: str                 # "fal" | "openai" — cérebro (texto/visão)
    openai_api_key: str | None
    text_model: str                   # modelo de texto/visão da OpenAI
    image_model: str                  # modelo de edição da OpenAI
    fal_llm_model: str                # modelo de texto no fal any-llm
    fal_vision_model: str             # modelo de visão no fal any-llm/vision
    image_edit_provider: str          # "fal" | "openai" — troca da lata
    fal_key: str | None
    fal_edit_model: str               # modelo de edição por TEXTO (Kontext)
    swap_mode: str                    # "reference" | "text"
    fal_composite_model: str          # modelo multi-imagem (base + lata real)
    research_count: int               # candidatos de produto por busca
    sourcing_mode: str                # "generate" | "pinterest"
    fal_gen_model: str
    gen_count: int
    pinterest_cookie: str | None
    pinterest_tld: str
    hero_size: str
    sourcing_candidates: int

    @property
    def hero_wh(self) -> tuple[int, int]:
        w, h = self.hero_size.lower().split("x")
        return int(w), int(h)


def _choice(name: str, default: str, allowed: tuple[str, ...]) -> str:
    value = os.getenv(name, default).strip().lower()
    if value not in allowed:
        raise RuntimeError(f"{name} inválido: {value!r} (use {' ou '.join(allowed)})")
    return value


def load_settings() -> Settings:
    fal_key = os.getenv("FAL_KEY") or None
    openai_key = os.getenv("OPENAI_API_KEY") or None
    default_provider = "fal" if fal_key else "openai"

    llm_provider = _choice("LLM_PROVIDER", default_provider, ("fal", "openai"))
    edit_provider = _choice("IMAGE_EDIT_PROVIDER", default_provider, ("fal", "openai"))
    sourcing_mode = _choice("SOURCING_MODE", "generate", ("generate", "pinterest"))
    swap_mode = _choice("SWAP_MODE", "reference", ("reference", "text"))

    # Validação de credenciais por necessidade real
    needs_fal = (
        edit_provider == "fal"
        or sourcing_mode == "generate"
        or llm_provider == "fal"
        or swap_mode == "reference"
    )
    needs_openai = edit_provider == "openai" or llm_provider == "openai"
    if needs_fal and not fal_key:
        raise RuntimeError("FAL_KEY é obrigatória para os providers fal (edição/geração/llm).")
    if needs_openai and not openai_key:
        raise RuntimeError("OPENAI_API_KEY é obrigatória quando LLM_PROVIDER ou IMAGE_EDIT_PROVIDER = openai.")

    return Settings(
        llm_provider=llm_provider,
        openai_api_key=openai_key,
        text_model=os.getenv("OPENAI_TEXT_MODEL", "gpt-5.4-mini"),
        image_model=os.getenv("OPENAI_IMAGE_MODEL", "gpt-image-2"),
        fal_llm_model=os.getenv("FAL_LLM_MODEL", "openai/gpt-4o-mini"),
        fal_vision_model=os.getenv("FAL_VISION_MODEL", "openai/gpt-4o"),
        image_edit_provider=edit_provider,
        fal_key=fal_key,
        fal_edit_model=os.getenv("FAL_EDIT_MODEL", "fal-ai/flux-pro/kontext"),
        swap_mode=swap_mode,
        fal_composite_model=os.getenv("FAL_COMPOSITE_MODEL", "fal-ai/gemini-25-flash-image/edit"),
        research_count=int(os.getenv("PRODUCT_RESEARCH_COUNT", "6")),
        sourcing_mode=sourcing_mode,
        fal_gen_model=os.getenv("FAL_GEN_MODEL", "fal-ai/imagen4/preview"),
        gen_count=int(os.getenv("SOURCING_GEN_COUNT", "4")),
        pinterest_cookie=os.getenv("PINTEREST_COOKIE") or None,
        pinterest_tld=os.getenv("PINTEREST_TLD", "com"),
        hero_size=os.getenv("HERO_SIZE", "1024x1536"),
        sourcing_candidates=int(os.getenv("SOURCING_CANDIDATES", "16")),
    )


SETTINGS = load_settings()

_openai_client = None


def get_openai():
    """Cliente OpenAI sob demanda. Só é chamado quando algum provider é openai."""
    global _openai_client
    if not SETTINGS.openai_api_key:
        raise RuntimeError("OPENAI_API_KEY não configurada, mas um provider openai foi acionado.")
    if _openai_client is None:
        from openai import OpenAI

        _openai_client = OpenAI(api_key=SETTINGS.openai_api_key)
    return _openai_client
