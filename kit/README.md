# Kit HÁGIOS — sistema visual dos carrosséis

Regras enraizadas. Todo carrossel novo importa daqui em vez de recriar.

```python
import sys; sys.path.insert(0, "/Users/holydev/Documents/Brand-Hagios/kit")
from hagios_kit import *
```

---

## 1. REGRA DA CAPA

**Foto jornalística real sangrando na tela inteira.** Não é ilustração, não é stock genérico, não é IA quando existe registro do fato.

Extraída da varredura do @brandsdecoded__ (306 mil seguidores; contas relacionadas: Folha, Estadão, Forbes, Exame, O Globo, BBC — é posicionamento de imprensa). Todas as capas deles são foto do fato: time da CazéTV no estádio, Amanda Ramalho num programa, cerimônia da Copa.

Ordem de escolha da imagem:
1. Foto oficial do fato (release, newsroom, evento) — **sempre a primeira opção**
2. Foto de agência/banco licenciado
3. Geração por IA — só quando não existe registro real

```python
build_cover(photo_path, lines, source_line, out_path, focus=0.30, total=6)
```

Compõe: foto + scrim · cabeçalho · selo centralizado · manchete embaixo em duas cores · linha de fonte.

`lines` é lista de linhas, cada uma lista de segmentos `(texto, cor)` — permite trocar de cor no meio da linha.

**Manchete no formato de jornal:** `CONTEXTO: O QUE ACONTECEU`, longa e densa, 4 a 6 linhas, com os termos-chave em terracota.

---

## 2. CORES

| Cor | Hex | Uso |
|---|---|---|
| Terracota | `#D97757` | **Cor editorial.** Manchetes, destaques, barra de progresso, checks |
| Ouro | `#F2B711` | **Reservado ao logo e à assinatura.** Nunca em manchete |
| Creme | `#F4F1EA` | Fundo claro |
| Preto | `#0E0E0F` | Fundo escuro |
| Cinza | `#7A7874` / `#9A9894` | Corpo de texto sobre creme / sobre preto |

Ritmo sugerido de fundo num carrossel de 5: creme → preto → creme → creme → preto.

---

## 3. LAYOUT — A REGRA DA MOLDURA

**Só a CAPA sangra.** É a única tela em que a foto ocupa os 1080×1350 inteiros, com scrim
escurecendo o pé e a manchete por cima.

**Toda tela interna é moldura de cor sólida:**

```
┌──────────────────────────┐
│ cabeçalho                │
│                          │
│ MANCHETE em 2 cores      │  ← texto sobre a COR, nunca sobre a foto
│ corpo cinza com números  │
│                          │
│ ┌──────────────────────┐ │
│ │  imagem / recorte    │ │  ← card com cantos arredondados
│ └──────────────────────┘ │
│ barra de progresso   N/6 │
└──────────────────────────┘
```

Texto nunca é sobreposto à imagem fora da capa — foto atrás de texto mata a legibilidade,
que é o único trabalho que a tela interna precisa fazer.

---

## 4. ANATOMIA DAS TELAS INTERNAS

1. **Cabeçalho** — `POWERED BY HÁGIOS` · `@HAGIOS.AI` · `2026 //`
2. **Manchete** — Helvetica Neue Condensed Black, caixa alta, entrelinha 1.0 (nunca menos: a cedilha e o til batem na linha de baixo), duas cores
3. **Corpo** — sans regular em cinza com os números em **negrito**
4. **Card de evidência** — recorte real da fonte, cantos arredondados 26px
5. **Barra de progresso** — trilho cinza, preenchimento terracota, `N/6`

Funções: `header()` · `headline()` / `headline_seg()` · `rich()` · `card()` · `progress()`

---

## 5. CARD FINAL FIXO

`final-card.png` — **idêntico em todo carrossel**, sempre a última imagem.

```python
append_final_card("Carrossel X/artes")   # copia como 99-final.png
```

Para regenerar depois de mudar a oferta: `python kit/final_card.py`

**As duas strings editáveis** ficam no topo de `final_card.py`:
- `KEYWORD` — a palavra que o seguidor comenta (hoje: `IA`)
- `ENTREGA` — o que ele recebe
- `ITENS` — os três bullets do checklist

---

## 6. PENDÊNCIAS

**Logo diz "STUDIO CRIATIVO", o Instagram diz "MOVIMENTO HÁGIOS".** O card usa o logo como está e assina "MOVIMENTO HÁGIOS" embaixo. Se a marca migrou, vale gerar uma versão do logo sem o descritivo antigo.

**O CTA depende da automação de comentário→DM estar no ar.** O card promete envio automático; sem isso a promessa não se cumpre. O projeto `instagram-automation/` cobre exatamente esse fluxo.

**`KEYWORD` e `ENTREGA` foram escolhas minhas como padrão razoável**, não definição sua. Ajuste antes do primeiro uso real.
