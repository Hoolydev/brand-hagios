# Hagios Culture Engine

Plataforma editorial para pesquisar sinais culturais, construir uma tese de marca e gerar carrosséis rastreáveis para Instagram.

## O que é real

- Autenticação via Clerk com rotas de entrada/cadastro, controles de workspace e sincronização do perfil no PostgreSQL.
- PostgreSQL com Drizzle para usuários, marcas, carrosséis, slides, fontes, assets e execuções de agentes.
- Pesquisa atual via Responses API com a ferramenta `web_search`.
- Extração server-side de `canonical`, `og:title`, `og:description`, `og:site_name` e `og:image` das matérias.
- Pipeline sequencial Research > Brand > Storytelling > Copy > Image.
- Imagens editoriais reais ligadas à matéria original e exibidas com atribuição.
- Imagens originais geradas por GPT Image 2 e persistidas em storage S3 compatível.
- Biblioteca por usuário; nenhum projeto depende de `localStorage`.

Sem credenciais, o produto entra em modo de configuração: ações reais ficam bloqueadas e as APIs retornam erros explícitos. Não existe geração simulada.

## Arquitetura de dados

O PostgreSQL guarda metadados e relacionamentos. Binários de imagem vão para um storage de objetos; o banco mantém URL, chave, MIME type, origem, atribuição e vínculo com o slide.

Tabelas principais:

- `users`: identidade local vinculada ao usuário Clerk. As tabelas legadas de sessão continuam no schema para não quebrar dados existentes.
- `brand_profiles`: identidade e voz de cada marca.
- `carousels`: briefing, tese, estado e versão corrente.
- `sources`: URL real, metadados editoriais, `og:image`, relevância e política de uso.
- `slides`: copy, papel narrativo, estratégia de imagem e fonte associada.
- `assets`: arquivo gerado ou importado e sua rastreabilidade.
- `agent_runs`: entrada, saída, modelo, duração, erro e estado de cada agente.

## Pipeline dos agentes

1. **Research** usa `web_search`, exige URLs reais e monta o dossiê.
2. **Brand** cruza convenções da categoria, conflito do público e códigos distintivos para definir a tese.
3. **Storytelling** transforma a tese em beats usando ABT e Sparkline.
4. **Copy** calibra consciência, clareza, gancho e densidade sem alterar fatos ou fontes.
5. **Image** reutiliza `og:image` quando a matéria é a prova visual e gera uma imagem original somente quando o roteiro pede uma metáfora editorial.

Cada etapa cria um registro em `agent_runs`. Uma falha interrompe o fluxo e fica visível no painel Agentes.

## Configuração

```bash
cp .env.example .env.local
npm install
npm run db:migrate
npm run dev
```

Variáveis obrigatórias para o fluxo completo:

```env
DATABASE_URL=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
OPENAI_API_KEY=
S3_ENDPOINT=
S3_BUCKET=
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_PUBLIC_BASE_URL=
```

Use `AUTH_REQUIRED=true` para proteger o estúdio. Novos usuários entram por `/sign-up`; usuários existentes entram por `/sign-in`. Em desenvolvimento, omitir essa variável mantém o preview acessível e ativa um usuário local persistido no Postgres quando não há sessão Clerk.

## Comandos

```bash
npm run dev          # servidor Next.js
npm run build        # build de produção
npm run db:generate  # gera migrations após alterar schema
npm run db:migrate   # aplica migrations no PostgreSQL
npm run db:push      # sincronização direta apenas em desenvolvimento
```

## Fontes e imagens editoriais

O sistema nunca trata uma imagem de matéria como imagem gerada. Ela mantém `sourceUrl`, publisher e atribuição. O servidor valida URLs externas, bloqueia hosts locais e lê apenas metadados públicos. Antes de republicar uma fotografia dentro de um carrossel comercial, confirme a licença ou use a imagem somente como preview editorial com link para a fonte.
