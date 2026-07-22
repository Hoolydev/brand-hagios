# Brand Hágios

Estúdio editorial para produzir carrosséis de Instagram com fonte rastreável — pesquisa,
tese, roteiro, copy e arte no mesmo lugar.

```
studio/      aplicação Next.js (o produto)
kit/         sistema visual em Python: gera as artes 1080×1350 e o card final fixo
Carrossel N/ carrosséis produzidos: manifests, roteiros, recortes das fontes e artes
```

## O que o sistema faz

O pipeline tem cinco etapas — **Radar → Tese → Roteiro → Arte → Publicação** — e cada uma
registra sua execução em `agent_runs`. Uma falha interrompe o fluxo e fica visível no painel
Agentes. Não existe geração simulada: sem credenciais, as ações reais ficam bloqueadas com
erro explícito.

**As fontes nunca são inventadas.** O usuário informa as URLs das matérias; o servidor baixa
cada página, extrai `title`, `publisher` e `og:image` do HTML real, e só então o modelo lê esse
material para escrever. A URL sai do que foi baixado, não do modelo.

## Rodando

```bash
cd studio
cp .env.example .env.local     # preencha DATABASE_URL, AUTH_SECRET e FAL_KEY
npm install
npm run db:migrate
npm run dev
```

### Criando o administrador

```bash
ADMIN_EMAIL=voce@empresa.com ADMIN_PASSWORD='senha-forte' \
  node scripts/seed-admin.mjs
```

As credenciais vêm do ambiente e nunca ficam no código. A senha é guardada com `scrypt` e
salt por usuário; a sessão é um cookie httpOnly assinado com HMAC.

## Providers de IA

Texto e imagem passam pela mesma `FAL_KEY`:

| Etapa | Modelo padrão |
|---|---|
| Tese, roteiro, copy | `anthropic/claude-sonnet-4.5` via `fal-ai/any-llm` |
| Imagem editorial | `fal-ai/flux-pro/v1.1-ultra` |

`OPENAI_API_KEY` é **opcional** e só habilita busca automática na web no Research Agent —
`web_search` não existe na fal. Sem ela o fluxo funciona por URLs informadas.

## Sistema visual

As regras de arte estão em [`kit/README.md`](kit/README.md) e são espelhadas nos prompts dos
agentes em `studio/lib/agents/editorial.ts`. As duas principais:

- **Só a capa sangra.** Toda tela interna é moldura de cor sólida com a imagem como card na
  faixa inferior — texto nunca sobre a foto.
- **Manchete em duas cores**, com o destaque na virada da frase, marcado entre `**asteriscos**`.

## Comandos

```bash
npm run dev          # servidor de desenvolvimento
npm run build        # build de produção
npm run db:generate  # gera migrations após alterar o schema
npm run db:migrate   # aplica migrations
```


## Deploy na Vercel

**Passo obrigatório:** em *Settings → Build and Deployment → Root Directory*, defina:

```
studio
```

Sem isso a Vercel procura o `package.json` na raiz do repositório, não encontra o Next
e o build falha com `No Next.js version detected`. Essa configuração **não pode** ser
feita pelo `vercel.json` — é a única que existe apenas no painel.

Feito isso, a Vercel lê `studio/vercel.json` e o build funciona sem mais nada.

**Variáveis obrigatórias** (Settings → Environment Variables):

| Variável | Para quê |
|---|---|
| `DATABASE_URL` | PostgreSQL. Precisa aceitar conexão externa (Neon, Supabase, Railway) |
| `AUTH_SECRET` | Assina o cookie de sessão. Gere com `openssl rand -base64 32` |
| `AUTH_REQUIRED` | `true` para exigir login |
| `FAL_KEY` | Texto e imagem |
| `FAL_LLM_MODEL` | `anthropic/claude-sonnet-4.5` |
| `FAL_IMAGE_MODEL` | `fal-ai/flux-pro/v1.1-ultra` |

Depois do primeiro deploy, crie o administrador apontando para o banco de produção:

```bash
DATABASE_URL='<url-de-producao>' ADMIN_EMAIL=voce@empresa.com \
  ADMIN_PASSWORD='senha-forte' node studio/scripts/seed-admin.mjs
```

### O que não roda em produção

- **`/api/import`** lê as pastas `Carrossel N/` do disco e copia artes para `public/`.
  O filesystem da Vercel é somente leitura, então a rota responde 501. É ferramenta local.
- **Upload de logo** depende do S3 (`S3_*`). Sem ele o campo existe mas não envia.
