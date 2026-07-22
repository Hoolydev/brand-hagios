"""Agente 1 — Sourcing.

Encontra/produz a MELHOR foto-base para virar a capa de um carrossel: uma pessoa
segurando UMA lata lisa, com boa luz e espaço para a troca do produto.

Dois modos (SOURCING_MODE):
  - generate  (padrão) -> gera a base com fal FLUX (lata lisa prata, sem marca)
  - pinterest          -> scrape do Pinterest + ranking por visão

Ambos devolvem o mesmo SourcingResult, então o restante do pipeline não muda.
"""
from __future__ import annotations

from dataclasses import dataclass, field

import pinterest
from brain import complete_json, vision_json
from config import SETTINGS


@dataclass
class Candidate:
    pin: "pinterest.PinResult"
    image: bytes
    score: float = 0.0
    reason: str = ""
    holds_single_can: bool = False


@dataclass
class SourcingResult:
    query_theme: str
    queries: list[str]
    best: Candidate
    ranked: list[Candidate] = field(default_factory=list)
    mode: str = "pinterest"


def _build_queries(theme: str, audience: str | None) -> list[str]:
    prompt = (
        "Você é o Sourcing Agent de um estúdio de carrosséis. Preciso ENCONTRAR "
        "no Pinterest uma foto de UMA pessoa segurando UMA lata (que depois será "
        "trocada por um energético). Gere de 3 a 5 queries de busca curtas, em "
        "português e inglês, que maximizem achar esse tipo de foto (retrato, "
        "pessoa de frente, lata na mão, luz de estúdio ou natural limpa).\n\n"
        f"Tema do carrossel: {theme}\n"
        f"Público-alvo: {audience or 'jovens, geração Z'}\n\n"
        'Responda SOMENTE JSON: {"queries":["...","..."]}'
    )
    data = complete_json(prompt)
    queries = [q.strip() for q in data.get("queries", []) if q.strip()]
    return queries or [f"pessoa segurando lata {theme}", "person holding can studio"]


def _collect(queries: list[str], target: int) -> list["pinterest.PinResult"]:
    seen: set[str] = set()
    pins: list[pinterest.PinResult] = []
    per_query = max(6, target // max(1, len(queries)) + 3)
    for query in queries:
        try:
            results = pinterest.search(query, limit=per_query)
        except Exception as exc:  # rede/bloqueio: registra e segue
            print(f"  [sourcing] query '{query}' falhou: {exc}")
            continue
        for pin in results:
            if pin.image_url in seen:
                continue
            seen.add(pin.image_url)
            pins.append(pin)
        if len(pins) >= target:
            break
    return pins[:target]


def _score_image(image: bytes, theme: str) -> dict:
    """Pontua UMA imagem por visão (compatível com fal e openai)."""
    instruction = (
        "Avalie esta foto como CAPA de um carrossel onde uma pessoa segura uma lata "
        "que será trocada por um energético.\n"
        f"Tema: {theme}\n\n"
        "Dê nota 0-100 considerando, em ordem de peso:\n"
        "1. A pessoa segura CLARAMENTE uma lata (ou cilindro do tamanho de lata) "
        "de forma visível e frontal.\n"
        "2. Idealmente UMA lata bem enquadrada (não uma pilha bagunçada).\n"
        "3. Boa nitidez, luz limpa, rosto/torso visíveis.\n"
        "4. Composição que permita trocar a lata sem distorcer a mão.\n"
        "Penalize sem pessoa, sem lata, watermark forte ou colagem.\n\n"
        'Responda SOMENTE JSON: {"score":87,"holds_single_can":true,"reason":"..."}'
    )
    return vision_json(instruction, image)


def _rank(candidates: list[Candidate], theme: str) -> list[Candidate]:
    """Ranqueia pontuando cada imagem individualmente."""
    for cand in candidates:
        try:
            item = _score_image(cand.image, theme)
        except Exception as exc:  # visão falhou nesta imagem: nota 0, segue
            print(f"  [rank] falhou numa imagem: {exc}")
            item = {}
        raw = float(item.get("score", 0) or 0)
        cand.score = raw * 100 if raw <= 1 else raw  # normaliza 0-1 -> 0-100
        cand.reason = str(item.get("reason", ""))
        cand.holds_single_can = bool(item.get("holds_single_can", False))
    return sorted(candidates, key=lambda c: c.score, reverse=True)


# ----------------------------------------------------------------------------
# Modo GENERATE (fal FLUX) — gera a base com lata lisa, sem marca
# ----------------------------------------------------------------------------
_DEFAULT_GEN_PROMPT = (
    "Editorial studio photograph, vertical 4:5 portrait. A single young adult "
    "wearing a stylish casual top or jacket, chest-up framing, facing the camera "
    "directly with a calm confident expression, face fully visible and NOT "
    "covered. They hold ONE plain blank matte silver aluminum drink can upright "
    "with both hands at chest height, centered in front of the chest and well "
    "below the chin; the front of the can faces the camera and is completely blank "
    "with no logo, no text and no branding. Solid seamless vivid green studio "
    "backdrop. Clean even softbox lighting, realistic detailed skin, natural "
    "well-formed hands and fingers, sharp focus, high-end fashion editorial look, "
    "subtle 35mm film grain. Empty space at the top and bottom for typography. "
    "The can must not cover or touch the face."
)


def _build_gen_prompt(theme: str, audience: str | None, brand: str | None) -> str:
    hint = f" A lata será trocada depois pela marca {brand}." if brand else ""
    instruction = (
        "Você é diretor de arte. Escreva UM prompt em inglês para um modelo de "
        "geração de imagem criar a foto-base da CAPA de um carrossel.\n"
        "REGRAS OBRIGATÓRIAS que o prompt DEVE conter, sem exceção:\n"
        "- uma única pessoa jovem, VESTIDA (top ou jaqueta estilosa), de frente "
        "para a câmera, expressão confiante;\n"
        "- ROSTO totalmente visível e NÃO coberto;\n"
        "- segurando com as DUAS mãos UMA lata de alumínio LISA, PRATA, SEM marca "
        "e SEM texto (blank unbranded silver can);\n"
        "- a lata na ALTURA DO PEITO, centralizada, abaixo do queixo, NÃO cobrindo "
        "o rosto; frente da lata voltada para a câmera;\n"
        "- enquadramento do peito para cima (chest-up), vertical 4:5;\n"
        "- fundo de estúdio SÓLIDO, uniforme e de cor VIBRANTE que combine com o "
        "tema; luz de estúdio limpa; foto editorial realista, mãos bem formadas;\n"
        "- espaço vazio acima e abaixo para tipografia.\n"
        "NUNCA coloque logos, marcas ou palavras na lata. NUNCA deixe a lata cobrir "
        "o rosto.\n"
        f"Tema: {theme}\nPúblico: {audience or 'geração Z'}.{hint}\n\n"
        'Responda SOMENTE JSON: {"prompt":"..."}'
    )
    try:
        data = complete_json(instruction)
        prompt = (data.get("prompt") or "").strip()
        return prompt or _DEFAULT_GEN_PROMPT
    except Exception as exc:
        print(f"  [gen] prompt via LLM falhou ({exc}); usando prompt padrão.")
        return _DEFAULT_GEN_PROMPT


def _generate_candidates(
    theme: str, audience: str | None, brand: str | None, count: int
) -> tuple[list[Candidate], str]:
    import fal_client
    import requests

    prompt = _build_gen_prompt(theme, audience, brand)
    print(f"  gerando {count} base(s) com {SETTINGS.fal_gen_model}…")
    result = fal_client.subscribe(
        SETTINGS.fal_gen_model,
        arguments={"prompt": prompt, "aspect_ratio": "3:4", "num_images": count},
    )
    images = (result or {}).get("images") or []
    candidates: list[Candidate] = []
    for img in images:
        url = img.get("url")
        if not url:
            continue
        try:
            data = requests.get(url, timeout=90).content
        except Exception as exc:
            print(f"  download da base gerada falhou: {exc}")
            continue
        pin = pinterest.PinResult(
            image_url=url,
            pin_url="",
            description=prompt[:140],
            width=int(img.get("width", 0) or 0),
            height=int(img.get("height", 0) or 0),
        )
        candidates.append(Candidate(pin=pin, image=data))
    if not candidates:
        raise RuntimeError(f"fal não gerou imagens. Resposta: {result}")
    return candidates, prompt


# ----------------------------------------------------------------------------
# Dispatcher
# ----------------------------------------------------------------------------
def find_base_image(
    theme: str,
    audience: str | None = None,
    candidate_count: int | None = None,
    brand: str | None = None,
) -> SourcingResult:
    mode = SETTINGS.sourcing_mode
    print(f"[Agente 1 · Sourcing] modo={mode} · tema='{theme}'")

    if mode == "generate":
        count = candidate_count or SETTINGS.gen_count
        candidates, prompt = _generate_candidates(theme, audience, brand, count)
        if len(candidates) > 1:
            print(f"  ranqueando {len(candidates)} bases por visão…")
            ranked = _rank(candidates, theme)
        else:
            ranked = candidates
        best = ranked[0]
        print(f"  melhor: score={best.score:.0f}")
        return SourcingResult(theme, [prompt], best, ranked, mode="generate")

    # modo pinterest
    target = candidate_count or SETTINGS.sourcing_candidates
    queries = _build_queries(theme, audience)
    print(f"  queries: {queries}")
    pins = _collect(queries, target)
    if not pins:
        raise RuntimeError(
            "Nenhum pin coletado. Verifique PINTEREST_COOKIE / conexão e tente de novo."
        )
    print(f"  {len(pins)} candidatos coletados, baixando…")
    candidates = []
    for pin in pins:
        try:
            candidates.append(Candidate(pin=pin, image=pinterest.download(pin.image_url)))
        except Exception as exc:
            print(f"  download falhou ({pin.image_url[:60]}…): {exc}")
    if not candidates:
        raise RuntimeError("Falha ao baixar qualquer candidato.")
    print(f"  ranqueando {len(candidates)} imagens por visão…")
    ranked = _rank(candidates, theme)
    best = ranked[0]
    print(f"  melhor: score={best.score:.0f} — {best.reason[:80]}")
    return SourcingResult(theme, queries, best, ranked, mode="pinterest")
