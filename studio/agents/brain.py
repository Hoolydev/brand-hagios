"""Cérebro dos agentes: texto e visão, com provider plugável (fal | openai).

- fal    -> endpoints `fal-ai/any-llm` (texto) e `fal-ai/any-llm/vision` (visão),
            rodando modelos da OpenAI/Anthropic/Google com a MESMA FAL_KEY.
- openai -> Responses API direto na OpenAI.

Expõe duas funções que sempre devolvem JSON parseado:
  complete_json(instruction)          -> texto puro
  vision_json(instruction, image)     -> uma imagem (bytes)
"""
from __future__ import annotations

import base64
import json
from typing import Any

from config import SETTINGS


# ----------------------------------------------------------------------------
# Parsing tolerante
# ----------------------------------------------------------------------------
def _parse_json(text: str) -> Any:
    raw = (text or "").strip()
    if raw.startswith("```"):
        raw = raw.split("```", 2)[1]
        if raw.lower().startswith("json"):
            raw = raw[4:]
        raw = raw.strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        start, end = raw.find("{"), raw.rfind("}")
        if start != -1 and end != -1:
            return json.loads(raw[start : end + 1])
        raise


def _data_url(image_bytes: bytes, mime: str = "image/png") -> str:
    return f"data:{mime};base64,{base64.b64encode(image_bytes).decode('ascii')}"


# ----------------------------------------------------------------------------
# Provider OpenAI (Responses API)
# ----------------------------------------------------------------------------
def _openai_text(instruction: str) -> str:
    from config import get_openai

    response = get_openai().responses.create(model=SETTINGS.text_model, input=instruction)
    return response.output_text


def _openai_vision(instruction: str, image: bytes) -> str:
    from config import get_openai

    content = [
        {"type": "input_text", "text": instruction},
        {"type": "input_image", "image_url": _data_url(image)},
    ]
    response = get_openai().responses.create(
        model=SETTINGS.text_model, input=[{"role": "user", "content": content}]
    )
    return response.output_text


# ----------------------------------------------------------------------------
# Provider fal (any-llm)
# ----------------------------------------------------------------------------
def _fal_text(instruction: str) -> str:
    import fal_client

    result = fal_client.subscribe(
        "fal-ai/any-llm",
        arguments={"model": SETTINGS.fal_llm_model, "prompt": instruction},
    )
    if result.get("error"):
        raise RuntimeError(f"fal any-llm erro: {result['error']}")
    return result.get("output") or ""


def _fal_vision(instruction: str, image: bytes) -> str:
    import fal_client

    image_url = fal_client.upload(image, "image/png")
    result = fal_client.subscribe(
        "fal-ai/any-llm/vision",
        arguments={
            "model": SETTINGS.fal_vision_model,
            "prompt": instruction,
            "image_url": image_url,
        },
    )
    if result.get("error"):
        raise RuntimeError(f"fal any-llm/vision erro: {result['error']}")
    return result.get("output") or ""


# ----------------------------------------------------------------------------
# API pública
# ----------------------------------------------------------------------------
def complete_json(instruction: str) -> Any:
    text = _fal_text(instruction) if SETTINGS.llm_provider == "fal" else _openai_text(instruction)
    return _parse_json(text)


def vision_json(instruction: str, image: bytes) -> Any:
    text = (
        _fal_vision(instruction, image)
        if SETTINGS.llm_provider == "fal"
        else _openai_vision(instruction, image)
    )
    return _parse_json(text)
