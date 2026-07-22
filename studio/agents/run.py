"""Orquestrador dos 2 agentes.

Exemplos:
  # pipeline completo: acha a foto no Pinterest e troca a lata por Monster
  python run.py --tema "energético produtividade gen z" --marca monster

  # pular o Pinterest e usar uma foto-base local
  python run.py --base ./minha-foto.jpg --marca paz

  # só o Agente 1 (encontrar a foto-base), sem trocar a lata
  python run.py --tema "energético" --so-buscar

Saídas ficam em agents/output/<timestamp>/:
  hero.png        -> imagem final (capa do carrossel)
  base.png        -> foto-base ajustada
  mask.png        -> máscara usada na edição
  meta.json       -> queries, fonte (pin), score, marca, bbox
"""
from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path


def _timestamp() -> str:
    # time.time() é permitido aqui (script de linha de comando)
    return time.strftime("%Y%m%d-%H%M%S")


def main() -> int:
    parser = argparse.ArgumentParser(description="Hagios — agentes de sourcing + swap de lata")
    parser.add_argument("--tema", help="Tema do carrossel (dispara o Agente 1)")
    parser.add_argument("--publico", default=None, help="Público-alvo (opcional)")
    parser.add_argument("--base", help="Caminho de uma foto-base local (pula o Agente 1)")
    parser.add_argument("--marca", default="monster", help=f"Marca da lata. Ex: monster, redbull, paz")
    parser.add_argument("--candidatos", type=int, default=None, help="Qtde de candidatos do Pinterest")
    parser.add_argument("--so-buscar", action="store_true", help="Roda só o Agente 1")
    parser.add_argument("--out", default=None, help="Pasta de saída (default: agents/output/<ts>)")
    args = parser.parse_args()

    if not args.tema and not args.base:
        parser.error("informe --tema (para buscar no Pinterest) ou --base (foto local)")

    here = Path(__file__).resolve().parent
    out_dir = Path(args.out) if args.out else here / "output" / _timestamp()
    out_dir.mkdir(parents=True, exist_ok=True)

    meta: dict = {"marca": args.marca, "tema": args.tema}

    # ---- Agente 1: sourcing ----
    base_image: bytes
    if args.base:
        base_image = Path(args.base).read_bytes()
        meta["fonte"] = {"tipo": "arquivo_local", "path": args.base}
        print(f"[base] usando foto local: {args.base}")
    else:
        import sourcing_agent

        sourced = sourcing_agent.find_base_image(
            args.tema, audience=args.publico, candidate_count=args.candidatos, brand=args.marca
        )
        base_image = sourced.best.image
        meta["modo"] = sourced.mode
        meta["queries"] = sourced.queries
        if sourced.mode == "generate":
            meta["fonte"] = {"tipo": "gerado", "modelo": "fal", "prompt": sourced.queries[0]}
        else:
            meta["fonte"] = {
                "tipo": "pinterest",
                "pin_url": sourced.best.pin.pin_url,
                "image_url": sourced.best.pin.image_url,
                "descricao": sourced.best.pin.description,
                "score": sourced.best.score,
                "motivo": sourced.best.reason,
            }
            meta["alternativas"] = [
                {"pin_url": c.pin.pin_url, "score": c.score, "motivo": c.reason}
                for c in sourced.ranked[1:6]
            ]
        (out_dir / "base_original.png").write_bytes(base_image)

        if args.so_buscar:
            (out_dir / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2))
            print(f"\n✓ Agente 1 concluído. Foto-base + metadados em {out_dir}")
            print("  ATENÇÃO: valide licença/direito de imagem antes de uso comercial.")
            return 0

    # ---- Agente 2: swap ----
    import swap_agent

    swapped = swap_agent.swap_can(base_image, args.marca)
    (out_dir / "hero.png").write_bytes(swapped.image)
    (out_dir / "base.png").write_bytes(swapped.base_fitted)
    if swapped.mask:  # só o motor openai gera máscara
        (out_dir / "mask.png").write_bytes(swapped.mask)
    meta["marca_nome"] = swapped.brand_name
    meta["motor"] = swapped.provider
    meta["can_box"] = swapped.can_box
    (out_dir / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2))

    print(f"\n✓ Pronto. Herói do carrossel em {out_dir / 'hero.png'}")
    print("  ATENÇÃO: valide licença/direito de imagem antes de uso comercial.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
