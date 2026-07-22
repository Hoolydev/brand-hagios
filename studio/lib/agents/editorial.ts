/**
 * Padrão editorial HÁGIOS.
 *
 * Regras extraídas dos carrosséis já publicados (ver kit/README.md e os
 * ROTEIRO.md de cada projeto). Ficam num arquivo só para que os prompts do
 * pipeline não repitam — e não divirjam — o que a marca já decidiu.
 */

/** Como a Hágios escreve. Vale para toda tela de todo carrossel. */
export const VOZ = `
PADRÃO EDITORIAL HÁGIOS — obrigatório

TOM
- Editorial, seco, inteligente. Nunca motivacional, nunca coach, nunca "a verdade que ninguém te conta".
- O leitor é adulto e esperto: empreendedores, publicitários, criadores. Não explique o óbvio.
- Português brasileiro. Frases curtas. Verbo forte. Zero jargão de LinkedIn.

RIGOR — o que mais importa
- TODO número citado vem com atribuição legível no próprio texto: "segundo a WARC", "a YouPix aponta".
- NUNCA invente número, data, nome ou fonte. Se o dossiê não traz, não escreva.
- Não confunda VENDAS (GMV) com RENDA/ganho. "A loja vendeu R$ 17 mi" ≠ "a loja ganhou R$ 17 mi".
- Multiplicador sem base ("cresceu 102x") é retoricamente enorme e analiticamente vazio: use a data e o
  fato, não o múltiplo, a não ser que o valor absoluto também esteja no dossiê.
- Se a fonte é a própria empresa citada, diga isso ("divulgado pelo próprio TikTok").
- Sem clickbait que o conteúdo não entrega.

ANTI-CLICHÊ
- Antes de escrever, identifique o lugar-comum que TODO mundo diz sobre o tema — e não diga.
- Corte qualquer frase que caberia em qualquer outro carrossel. Se serve para tudo, não serve.
`.trim();

/** Como a manchete é composta na arte. */
export const MANCHETE = `
FORMATO DA MANCHETE (title)
- Caixa alta, condensada, curta e densa. De 4 a 14 palavras.
- DUAS CORES: a arte pinta em terracota o trecho marcado entre **asteriscos duplos**; o resto fica
  preto (fundo claro) ou branco (fundo escuro).
- Marque como destaque a VIRADA da frase — o que surpreende — nunca a parte óbvia.
  Bom:  "QUASE NINGUÉM LARGOU O EMPREGO. **TODO MUNDO EMPILHOU MAIS UM.**"
  Bom:  "BUSQUE 'UGC CREATOR' NA BASE OFICIAL DO GOVERNO. **NÃO ESTÁ LÁ.**"
  Ruim: "**TIKTOK SHOP:** A NOVA FRONTEIRA DO E-COMMERCE" (destaque no óbvio, e é release)
- Exatamente um trecho destacado por tela.
`.trim();

/** Regra de imagem, incluindo a capa. */
export const IMAGEM = `
LAYOUT — A REGRA DA MOLDURA
- Só a CAPA (order 1) sangra: foto ocupando a tela inteira, manchete por cima.
- Toda tela interna é moldura de cor sólida: manchete e corpo sobre a COR, e a imagem entra
  como card na faixa inferior. Texto NUNCA é sobreposto à foto fora da capa.
- Por isso o body das telas internas precisa caber em 2 ou 3 frases: o espaço é a metade de cima.

IMAGEM
- CAPA (order 1, kind "cover"): foto REAL do fato — o evento, a pessoa, a tela do produto.
  Se o dossiê tiver uma matéria com imagem editorial, use imageStrategy "source" e copie a URL exata.
  Só use "generated" quando não existir registro real do fato.
- Telas de prova: imageStrategy "source" apontando para a matéria que sustenta o número.
- "generated" só quando a tela exige uma metáfora que não existe fotografada. Nesse caso o imagePrompt
  descreve fotografia documental: pessoas de idades e etnias explicitamente variadas, textura de pele
  sem retoque, luz imperfeita, ninguém encarando a lente. Nunca "cinematic", nunca stock genérico.
`.trim();

/** Arco narrativo padrão. */
export const ARCO = `
ARCO (ABT — And / But / Therefore)
- Tela 1 GANCHO: nomeia o fenômeno com os termos que o público usa e planta a contradição.
- Telas do meio: o que mudou → a virada (o dado que contraria o senso comum) → a prova mais dura.
- Última tela: FECHAMENTO que reposiciona o tema. Nunca "salve esse post", nunca pergunta vazia.
- Cada tela cumpre UMA função distinta e nomeada em role (GANCHO, VIRADA, PROVA, TENSÃO, FECHAMENTO...).
- Tensão crescente: a tela mais forte é a penúltima, não a primeira.
`.trim();

export const REGRAS = `${VOZ}\n\n${MANCHETE}\n\n${IMAGEM}\n\n${ARCO}`;
