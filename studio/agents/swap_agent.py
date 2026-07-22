"""Agente 2 — Swap.

Recebe a foto-base (pessoa segurando uma lata) e TROCA a lata pela lata do
energético desejado, preservando pessoa, mãos, roupa e cenário.

Dois motores de edição (IMAGE_EDIT_PROVIDER):
  - fal    -> FLUX.1 Kontext: edição por instrução, SEM máscara. Recomendado.
  - openai -> gpt-image-2: localiza a lata por visão, monta máscara e edita.
"""
from __future__ import annotations

import base64
import io
from dataclasses import dataclass

from PIL import Image, ImageDraw, ImageFilter

import brands
from brain import vision_json
from config import SETTINGS


@dataclass
class SwapResult:
    brand_slug: str
    brand_name: str
    provider: str
    image: bytes           # herói final PNG
    base_fitted: bytes     # foto-base já ajustada ao canvas (debug/atribuição)
    mask: bytes            # máscara usada (b"" quando provider=fal)
    can_box: list[float]   # [x0,y0,x1,y1] normalizado ([] quando provider=fal)


# ----------------------------------------------------------------------------
# Utilidades de imagem
# ----------------------------------------------------------------------------
def _fit_cover(image_bytes: bytes, size: tuple[int, int]) -> bytes:
    """Redimensiona cobrindo o canvas e recorta no centro (como a referência)."""
    src = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    return _cover(src, size)


def _cover(src: Image.Image, size: tuple[int, int]) -> bytes:
    tw, th = size
    scale = max(tw / src.width, th / src.height)
    resized = src.resize((round(src.width * scale), round(src.height * scale)))
    left = (resized.width - tw) // 2
    top = (resized.height - th) // 2
    cropped = resized.crop((left, top, left + tw, top + th))
    out = io.BytesIO()
    cropped.save(out, format="PNG")
    return out.getvalue()


def _normalize_to_canvas(image_bytes: bytes, size: tuple[int, int]) -> bytes:
    """Garante que a saída do editor tenha exatamente o tamanho do canvas."""
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    if img.size == size:
        out = io.BytesIO()
        img.save(out, format="PNG")
        return out.getvalue()
    return _cover(img, size)


# ----------------------------------------------------------------------------
# Prompts
# ----------------------------------------------------------------------------
def _openai_prompt(brand: dict[str, str], grip: str) -> str:
    return (
        "Substitua APENAS a lata que a pessoa segura por uma "
        f"{brand['description']}. "
        "Mantenha exatamente a mesma pessoa, rosto, mãos, dedos, pele, roupa, "
        "iluminação, sombras e fundo — não altere nada fora da lata. "
        f"A nova lata deve encaixar naturalmente na mão ({grip}), com escala, "
        "perspectiva, reflexos e sombra de contato realistas, como uma foto "
        "publicitária nítida. Sem texto extra, sem watermark, sem distorção nos dedos."
    )


def _fal_prompt(brand: dict[str, str]) -> str:
    # Kontext responde melhor a instrução direta em inglês.
    return (
        f"Replace the drink can that the person is holding with a {brand['name']} "
        f"energy drink can ({brand['description']}). Keep the exact same person, "
        "face, hands, fingers, skin, clothing, pose, lighting, shadows and "
        "background — change only the can. Photorealistic product photography, "
        "correct scale and perspective, realistic reflections and contact shadow. "
        "No extra text, no watermark, no finger distortion."
    )


# ----------------------------------------------------------------------------
# Motor OpenAI (máscara)
# ----------------------------------------------------------------------------
def _locate_can(fitted: bytes) -> dict:
    instruction = (
        "Nesta foto uma pessoa segura uma lata (ou objeto cilíndrico segurável). "
        "Localize a REGIÃO da(s) lata(s) na mão da pessoa. Devolva a caixa "
        "envolvente NORMALIZADA (0.0-1.0), onde (0,0) é o topo-esquerdo e (1,1) o "
        "fundo-direito da imagem inteira. Se houver várias latas juntas, retorne a "
        "caixa que engloba o conjunto na mão. Descreva também como a mão segura, "
        "para a nova lata respeitar os dedos.\n\n"
        'Responda SOMENTE JSON: {"found":true,"box":[x0,y0,x1,y1],'
        '"count":1,"grip":"descrição de como a mão segura"}'
    )
    data = vision_json(instruction, fitted)
    if not data.get("found") or "box" not in data:
        raise RuntimeError(
            "Visão não localizou uma lata na foto-base. Escolha outra imagem "
            "(o Agente 1 devolve alternativas em result.ranked)."
        )
    return data


def _build_mask(size: tuple[int, int], box: list[float], pad: float = 0.06) -> bytes:
    """Máscara RGBA: opaca em tudo, TRANSPARENTE só sobre a lata (área a editar)."""
    w, h = size
    x0, y0, x1, y1 = box
    px, py = pad * w, pad * h
    x0 = max(0, x0 * w - px)
    y0 = max(0, y0 * h - py)
    x1 = min(w, x1 * w + px)
    y1 = min(h, y1 * h + py)

    mask = Image.new("RGBA", (w, h), (0, 0, 0, 255))
    hole = Image.new("L", (w, h), 0)
    ImageDraw.Draw(hole).rounded_rectangle([x0, y0, x1, y1], radius=int(0.03 * w), fill=255)
    hole = hole.filter(ImageFilter.GaussianBlur(radius=max(2, int(0.01 * w))))
    mask.putalpha(Image.eval(hole, lambda v: 255 - v))

    out = io.BytesIO()
    mask.save(out, format="PNG")
    return out.getvalue()


def _edit_openai(fitted: bytes, brand: dict[str, str], canvas: tuple[int, int]):
    from config import get_openai

    located = _locate_can(fitted)
    box = [float(v) for v in located["box"]]
    mask = _build_mask(canvas, box)
    result = get_openai().images.edit(
        model=SETTINGS.image_model,
        image=("base.png", fitted, "image/png"),
        mask=("mask.png", mask, "image/png"),
        prompt=_openai_prompt(brand, located.get("grip", "")),
        size=f"{canvas[0]}x{canvas[1]}",
        input_fidelity="high",
    )
    b64 = result.data[0].b64_json
    if not b64:
        raise RuntimeError("gpt-image-2 não devolveu dados de imagem.")
    return base64.b64decode(b64), mask, box


# ----------------------------------------------------------------------------
# Motor fal.ai (FLUX.1 Kontext, sem máscara)
# ----------------------------------------------------------------------------
def _edit_fal(fitted: bytes, brand: dict[str, str], canvas: tuple[int, int]) -> bytes:
    import fal_client
    import requests

    image_url = fal_client.upload(fitted, "image/png")
    result = fal_client.subscribe(
        SETTINGS.fal_edit_model,
        arguments={
            "prompt": _fal_prompt(brand),
            "image_url": image_url,
            "num_images": 1,
        },
    )
    images = (result or {}).get("images") or []
    if not images or not images[0].get("url"):
        raise RuntimeError(f"fal.ai não devolveu imagem. Resposta: {result}")
    edited = requests.get(images[0]["url"], timeout=90).content
    return _normalize_to_canvas(edited, canvas)


# ----------------------------------------------------------------------------
# Motor fal.ai — composição multi-imagem (base + lata REAL)
# ----------------------------------------------------------------------------
def _composite_prompt(brand: dict[str, str]) -> str:
    return (
        "The first image shows a person holding a plain unbranded can with both "
        f"hands. The second image is a real {brand['name']} can. Replace the can in "
        "the first image with the EXACT can from the second image, keeping its "
        "label, logo, colors and text identical to the second image. Keep the "
        "person, face, hands, fingers, pose, clothing, lighting and background "
        "exactly the same. Fit the can naturally into the hands with correct scale, "
        "perspective, reflections and contact shadows. Photorealistic, no finger "
        "distortion, no extra text or watermark."
    )


def _composite_fal(
    fitted: bytes, can_image: bytes, brand: dict[str, str], canvas: tuple[int, int]
) -> bytes:
    import fal_client
    import requests

    base_url = fal_client.upload(fitted, "image/png")
    can_url = fal_client.upload(can_image, "image/png")
    result = fal_client.subscribe(
        SETTINGS.fal_composite_model,
        arguments={
            "prompt": _composite_prompt(brand),
            "image_urls": [base_url, can_url],
        },
    )
    images = (result or {}).get("images") or []
    if not images or not images[0].get("url"):
        raise RuntimeError(f"fal composite não devolveu imagem. Resposta: {result}")
    edited = requests.get(images[0]["url"], timeout=120).content
    return _normalize_to_canvas(edited, canvas)


# ----------------------------------------------------------------------------
# Orquestração
# ----------------------------------------------------------------------------
def swap_can(
    base_image: bytes,
    brand_slug: str,
    size: tuple[int, int] | None = None,
    reference_image: bytes | None = None,
) -> SwapResult:
    canvas = size or SETTINGS.hero_wh
    brand = brands.resolve(brand_slug)
    fitted = _fit_cover(base_image, canvas)

    # --- Modo REFERENCE: compõe a lata REAL (embalagem fiel) ---
    if SETTINGS.swap_mode == "reference":
        try:
            can_image, can_source = reference_image, "fornecida"
            if can_image is None:
                import product_research

                found = product_research.find_product_image(brand_slug)
                can_image, can_source = found.image, found.source
            print(
                f"[Agente 2 · Swap] {brand['name']} · composição multi-imagem "
                f"({SETTINGS.fal_composite_model}) · lata: {can_source[:50]}"
            )
            hero = _composite_fal(fitted, can_image, brand, canvas)
            print("  herói gerado ✓")
            return SwapResult(
                brand_slug=brand_slug,
                brand_name=brand["name"],
                provider=f"reference:{SETTINGS.fal_composite_model}",
                image=hero,
                base_fitted=fitted,
                mask=b"",
                can_box=[],
            )
        except Exception as exc:
            print(f"  [swap] modo reference falhou ({exc}); caindo para edição por texto.")

    # --- Modo TEXT (ou fallback): descreve a lata por texto ---
    provider = SETTINGS.image_edit_provider
    print(f"[Agente 2 · Swap] marca alvo = {brand['name']} · motor = {provider} (texto)")
    if provider == "fal":
        print(f"  editando com {SETTINGS.fal_edit_model} (Kontext)…")
        hero = _edit_fal(fitted, brand, canvas)
        mask, box = b"", []
    else:
        print("  localizando a lata e editando com", SETTINGS.image_model, "…")
        hero, mask, box = _edit_openai(fitted, brand, canvas)

    print("  herói gerado ✓")
    return SwapResult(
        brand_slug=brand_slug,
        brand_name=brand["name"],
        provider=provider,
        image=hero,
        base_fitted=fitted,
        mask=mask,
        can_box=box,
    )
