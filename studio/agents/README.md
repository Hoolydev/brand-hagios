# Agentes Python — Sourcing + Pesquisa + Swap de lata

Três agentes que produzem o **herói da capa** dos carrosséis no estilo
`brandsdecoded`: uma pessoa segurando a lata REAL do energético certo.

Nos padrões, roda **inteiramente na fal.ai com uma credencial** (`FAL_KEY`):
cérebro (texto/visão via `any-llm`), geração da base (FLUX) e troca da lata
(Kontext). OpenAI é opcional.

- **Agente 1 · Sourcing** (`sourcing_agent.py`) — produz a foto-base. Dois modos
  (`SOURCING_MODE`):
  - **`generate`** (padrão) — gera a base com **Google Imagen 4** (`FAL_GEN_MODEL`,
    escolhido por comparação: melhor aderência ao enquadramento — rosto livre, lata
    na altura do peito, pessoa vestida) segurando uma **lata lisa prata, sem
    marca**, e ranqueia N variações por visão. Sem Pinterest, sem cookie, sem
    direito de imagem de terceiros.
  - **`pinterest`** — gera queries, faz **scraping do Pinterest**, baixa candidatos
    e ranqueia por visão.
- **Agente 3 · Pesquisa de Produto** (`product_research.py`) — encontra a imagem
  REAL da lata da marca: asset local curado (`agents/brands/<slug>.png`) se
  existir, senão **busca na web** (DuckDuckGo Images) + ranqueamento por visão.
- **Agente 2 · Swap** (`swap_agent.py`) — coloca a lata na mão da pessoa. Dois
  modos (`SWAP_MODE`):
  - **`reference`** (padrão) — usa a lata REAL do Agente 3 e faz **composição
    multi-imagem** (nano-banana / `FAL_COMPOSITE_MODEL`): a embalagem, logo e texto
    ficam FIÉIS ao produto, sem inventar. Preserva pessoa, mãos e cenário.
  - **`text`** — descreve a marca por texto (FLUX.1 Kontext ou gpt-image-2). O
    modelo "inventa" a lata; menos fiel. Serve de fallback.

O orquestrador `run.py` liga os dois: `tema → foto-base → herói`.

## Instalação

```bash
cd studio/agents
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # preencha as chaves
```

Nos padrões, **uma única `FAL_KEY` faz tudo** — cérebro (texto/visão via
`any-llm`), geração da base (FLUX) e troca da lata (Kontext). Não precisa de key
da OpenAI.

No `.env`:
- `FAL_KEY` — **obrigatória** nos padrões. Cérebro + geração + edição.
- `LLM_PROVIDER` — `fal` (padrão, usa `openai/gpt-4o` via any-llm) ou `openai`.
- `SOURCING_MODE` — `generate` (padrão) ou `pinterest`.
- `IMAGE_EDIT_PROVIDER` — `fal` (padrão, Kontext) ou `openai` (gpt-image-2).
- `OPENAI_API_KEY` — **opcional**, só se algum provider acima for `openai`.
- `PINTEREST_COOKIE` — só no modo `pinterest`; sem ele o scraping toma 403.

## Uso

```bash
# pipeline completo: acha a foto e troca a lata por Monster
python run.py --tema "energético produtividade gen z" --marca monster

# usar a marca-cliente
python run.py --tema "energético" --marca paz

# pular o Pinterest e usar uma foto-base local
python run.py --base ./foto.jpg --marca redbull

# só encontrar a foto-base (Agente 1), sem editar
python run.py --tema "energético" --so-buscar
```

Saídas em `agents/output/<timestamp>/`:

| arquivo | o que é |
|---|---|
| `hero.png` | imagem final — vira a capa do carrossel |
| `base.png` | foto-base ajustada ao canvas |
| `mask.png` | máscara usada na edição (debug) |
| `base_original.jpg` | pin original baixado (quando via Pinterest) |
| `meta.json` | queries, pin de origem, score, marca, bbox da lata |

## Marcas

Prontas: `monster`, `redbull`, `baly`, `paz`. Para adicionar/ajustar, crie
`agents/brands/<slug>.json`:

```json
{ "name": "Reign", "description": "lata Reign Total Body Fuel, preta com detalhes em..." }
```

## Como conecta ao studio (Next.js) — automático

Já está ligado. Fluxo:

1. Suba o serviço dos agentes:

   ```bash
   cd studio/agents && source .venv/bin/activate
   uvicorn api:app --port 8787
   ```

2. No `.env.local` do studio defina `HERO_AGENT_URL=http://localhost:8787`.

3. Ao gerar um carrossel cujo tema envolva um produto/bebida, o **Storytelling
   Agent** marca a capa com `imageStrategy: "hero"` e um `heroBrand`. O route
   `app/api/carousels/[id]/generate` chama `generateHeroImage` (`lib/agents/hero.ts`),
   que bate no `/hero` do serviço, recebe o PNG e salva via `saveAsset` (S3).

Endpoints do serviço:

| método | rota | o que faz |
|---|---|---|
| GET | `/health` | status + modelos + se há cookie do Pinterest |
| POST | `/hero` | pipeline completo: `{theme, brand, audience?}` → herói |
| POST | `/source` | só Agente 1: `{theme}` → foto-base + candidatos |
| POST | `/swap` | só Agente 2: `{image_base64, brand}` → lata trocada |

**Fallback:** sem `HERO_AGENT_URL`, a capa `hero` gera uma imagem editorial por
prompt (sem Pinterest/swap), então o build do studio nunca depende do serviço.

Uso manual continua valendo pelo `run.py` (ver acima).

## Avisos

- Isto é **scraping** do Pinterest, sem API oficial: pode quebrar/bloquear e está
  sujeito aos Termos deles.
- **Direito de imagem:** valide licença antes de republicar qualquer foto de
  terceiros num carrossel comercial. O `meta.json` guarda o pin de origem para
  rastreabilidade. Para risco zero, gere a foto-base com IA em vez de buscar.
