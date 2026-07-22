import { z } from "zod";
import { completeText, completeJson, generateImageBytes, getOpenAI, isResearchConfigured, parseJsonOutput, activeModels } from "@/lib/ai";
import { readSourceMetadata } from "@/lib/source-metadata";
import { saveAsset } from "@/lib/storage";
import { ARCO, IMAGEM, MANCHETE, REGRAS, VOZ } from "@/lib/agents/editorial";

const researchSchema = z.object({
  culturalTension: z.string(),
  sources: z.array(z.object({ url: z.string().url(), title: z.string(), publisher: z.string(), summary: z.string(), relevanceScore: z.number().min(0).max(100) })).min(3).max(6),
});

const brandSchema = z.object({
  categoryConvention: z.string(),
  distinctiveAngle: z.string(),
  audienceConflict: z.string(),
  brandRole: z.string(),
  thesis: z.string(),
});

const slideSchema = z.object({
  order: z.number().int(),
  role: z.string(),
  title: z.string(),
  body: z.string(),
  kind: z.enum(["cover", "dark", "signal", "paper", "mint"]),
  imageStrategy: z.enum(["generated", "source", "none", "hero"]),
  sourceUrl: z.string().url().nullable(),
  imagePrompt: z.string().nullable(),
  heroBrand: z.string().nullable().optional(),
});

const storySchema = z.object({ slides: z.array(slideSchema) });

type ResearchSource = z.infer<typeof researchSchema>["sources"][number];
export type ResearchResult = Omit<z.infer<typeof researchSchema>, "sources"> & { sources: Array<ResearchSource & Awaited<ReturnType<typeof readSourceMetadata>>> };
export type BrandResult = z.infer<typeof brandSchema>;
export type StoryResult = z.infer<typeof storySchema>;
export type SlideResult = z.infer<typeof slideSchema>;

const textModel = () => activeModels().text;

export async function runResearch(input: { topic: string; audience: string; interests: string[] }) {
  if (!isResearchConfigured()) {
    throw new Error("O Research Agent precisa de OPENAI_API_KEY: a busca na web (web_search) não existe na fal, e gerar dossiê sem busca faria o modelo inventar fontes.");
  }
  const response = await getOpenAI().responses.create({
    model: process.env.OPENAI_TEXT_MODEL ?? "gpt-5.4-mini",
    tools: [{ type: "web_search" }],
    input: `Você é o Research Agent do Hagios Culture Engine. Pesquise a web agora sobre o tema abaixo. Selecione apenas matérias ou relatórios reais, específicos e diretamente relevantes. Não invente URLs. Prefira fontes editoriais e pesquisas primárias.\n\nTema: ${input.topic}\nPúblico: ${input.audience}\nInteresses conectados: ${input.interests.join(", ")}\n\nRetorne SOMENTE JSON válido com: {"culturalTension":"...","sources":[{"url":"https://...","title":"...","publisher":"...","summary":"...","relevanceScore":90}]}. Inclua de 3 a 6 fontes.`,
  });
  const parsed = researchSchema.parse(parseJsonOutput<unknown>(response.output_text));
  const enriched = await Promise.all(parsed.sources.map(async (source) => {
    try {
      const metadata = await readSourceMetadata(source.url);
      return { ...source, ...metadata };
    } catch {
      return { ...source, canonicalUrl: null, imageUrl: null, url: source.url };
    }
  }));
  return { ...parsed, sources: enriched } as ResearchResult;
}


/**
 * Dossiê a partir de URLs reais fornecidas pelo usuário.
 *
 * Não existe busca na web sem OpenAI, e inventar fonte é inaceitável neste
 * produto. Então o caminho honesto é: o usuário cola os links, o servidor
 * BUSCA cada página de verdade, extrai título/publisher/og:image do HTML real,
 * e só então o modelo lê esse material para escrever a tensão cultural e
 * pontuar relevância. A URL nunca sai do modelo — sai do que foi baixado.
 */
export async function runResearchFromUrls(input: {
  topic: string; audience: string; interests: string[]; urls: string[];
}): Promise<ResearchResult> {
  const unique = [...new Set(input.urls.map((u) => u.trim()).filter(Boolean))];
  if (unique.length < 2) {
    throw new Error("Informe ao menos 2 URLs de matérias para montar o dossiê.");
  }

  const fetched: Array<Awaited<ReturnType<typeof readSourceMetadata>>> = [];
  const failures: string[] = [];
  for (const url of unique) {
    try {
      fetched.push(await readSourceMetadata(url));
    } catch (error) {
      failures.push(`${url} (${error instanceof Error ? error.message : "falhou"})`);
    }
  }
  if (fetched.length < 2) {
    throw new Error(`Não consegui ler páginas suficientes. Falhas: ${failures.join("; ")}`);
  }

  const dossie = fetched.map((item, index) => ({
    indice: index,
    url: item.url,
    titulo: item.title,
    publisher: item.publisher,
    resumo: item.summary,
  }));

  const parsed = await completeJson<{
    culturalTension: string;
    sources: Array<{ indice: number; summary: string; relevanceScore: number }>;
  }>(
    `Você é o Research Agent do Hágios. Abaixo estão matérias REAIS já baixadas — o título, o publisher e o resumo vieram do HTML de cada página.\n\n` +
    `Tema: ${input.topic}\nPúblico: ${input.audience}\nInteresses: ${input.interests.join(", ")}\n\n` +
    `Matérias:\n${JSON.stringify(dossie, null, 1)}\n\n` +
    `Escreva a tensão cultural do tema e, para cada matéria, um resumo de 1-2 frases do que ela prova e uma nota de relevância de 0 a 100. ` +
    `NÃO invente URLs nem matérias: use somente os índices existentes.\n\n` +
    `Retorne SOMENTE JSON: {"culturalTension":"...","sources":[{"indice":0,"summary":"...","relevanceScore":90}]}`,
  );

  const byIndex = new Map(parsed.sources.map((item) => [item.indice, item]));
  return {
    culturalTension: parsed.culturalTension,
    sources: fetched.map((item, index) => ({
      ...item,
      publisher: item.publisher ?? new URL(item.url).hostname,
      summary: byIndex.get(index)?.summary ?? item.summary,
      relevanceScore: byIndex.get(index)?.relevanceScore ?? 70,
    })),
  } as ResearchResult;
}

export async function runBrandAgent(input: { topic: string; audience: string; interests: string[]; research: ResearchResult; brand: Record<string, unknown> }) {
  const output = await completeText(
    `Você é o Brand Squad do Hágios. A partir do dossiê real abaixo, encontre a TESE do carrossel.\n\n` +
    `${VOZ}\n\n` +
    `MÉTODO\n` +
    `1. categoryConvention: o lugar-comum que todo conteúdo sobre esse tema repete. É o que vamos EVITAR.\n` +
    `2. audienceConflict: a contradição que o público vive na pele, não a que ele declara.\n` +
    `3. distinctiveAngle: a virada que só este carrossel faz — precisa nascer de um dado do dossiê,\n` +
    `   não de opinião. Se o dado contraria o senso comum, esse é o ângulo.\n` +
    `4. brandRole: o papel da marca nessa conversa, sem se colocar como herói.\n` +
    `5. thesis: UMA frase. Densa, específica, verificável pelo dossiê. Se ela caberia em outro tema, refaça.\n\n` +
    `${JSON.stringify(input)}\n\n` +
    `Retorne SOMENTE JSON válido: {"categoryConvention":"...","distinctiveAngle":"...","audienceConflict":"...","brandRole":"...","thesis":"..."}.`,
  );
  return brandSchema.parse(parseJsonOutput<unknown>(output));
}

export async function runStoryAgent(input: { count: number; research: ResearchResult; brand?: BrandResult }) {
  const output = await completeText(
    `Você é o Storytelling Squad do Hágios. Estruture EXATAMENTE ${input.count} telas a partir do dossiê real.\n\n` +
    `${REGRAS}\n\n` +
    `REGRAS DESTA ETAPA\n` +
    `- Use apenas fatos e números presentes no dossiê. Copie a URL EXATA da fonte em sourceUrl quando a tela citar um dado dela.\n` +
    `- title: a manchete no formato acima, com um trecho entre **asteriscos** para a arte destacar.\n` +
    `- body: 2 a 3 frases, até 45 palavras, densas e factuais, com o número e a atribuição embutidos.\n` +
    `- kind: "cover" só na tela 1. Depois alterne entre "dark", "paper" e "signal" para dar ritmo.\n\n` +
    `${JSON.stringify(input)}\n\n` +
    `Retorne SOMENTE JSON válido: {"slides":[{"order":1,"role":"GANCHO","title":"...","body":"...","kind":"cover","imageStrategy":"source","sourceUrl":"https://...","imagePrompt":null}]}. ` +
    `kind: cover, dark, signal, paper ou mint. imageStrategy: generated, source ou none.`,
  );
  const story = storySchema.parse(parseJsonOutput<unknown>(output));
  if (story.slides.length !== input.count) throw new Error(`Story Agent devolveu ${story.slides.length} telas; esperado: ${input.count}`);
  return story;
}

export async function runSlideEditor(input: {
  carousel: { topic: string; audience: string; interests: string[]; thesis?: string | null };
  slide: SlideResult;
  source?: { title: string; publisher?: string | null; summary?: string | null; url: string } | null;
  instruction: string;
}) {
  const output = await completeText(`${VOZ}\n\n${MANCHETE}\n\nVocê é o Copy + Storytelling editor do Hágios. Edite somente a tela indicada conforme a instrução. Preserve a função narrativa, os fatos e a fonte. Seja preciso: não invente dados, não troque imageStrategy/sourceUrl/imagePrompt sem pedido explícito e não refaça o restante do carrossel. Entregue texto curto para Instagram em português brasileiro.\n\nContexto: ${JSON.stringify(input.carousel)}\nTela atual: ${JSON.stringify(input.slide)}\nFonte vinculada: ${JSON.stringify(input.source ?? null)}\nInstrução do usuário: ${input.instruction}\n\nRetorne SOMENTE JSON válido com exatamente esta tela: {"order":${input.slide.order},"role":"...","title":"...","body":"...","kind":"${input.slide.kind}","imageStrategy":"${input.slide.imageStrategy}","sourceUrl":${JSON.stringify(input.slide.sourceUrl)},"imagePrompt":${JSON.stringify(input.slide.imagePrompt)}}.`);
  return slideSchema.parse(parseJsonOutput<unknown>(output));
}

export async function runCopyAgent(input: { audience: string; thesis: string; story: StoryResult }) {
  const output = await completeText(
    `Você é o Copy Squad do Hágios. Refine as telas abaixo. Preserve fatos, números, fontes e a função de cada tela.\n\n` +
    `${VOZ}\n\n${MANCHETE}\n\n` +
    `O QUE FAZER\n` +
    `- Corte clichê e adjetivo vazio. Onde houver "revolução", "transformação", "nova era", reescreva com o fato concreto.\n` +
    `- Garanta que todo número tenha a fonte citada no próprio texto.\n` +
    `- Confira o destaque **entre asteriscos**: precisa estar na virada da frase, não no óbvio.\n` +
    `- Não altere order, kind, imageStrategy, sourceUrl nem imagePrompt. Só title e body.\n\n` +
    `Público: ${input.audience}\nTese: ${input.thesis}\n${JSON.stringify(input.story)}\n\n` +
    `Retorne SOMENTE o mesmo JSON de slides.`,
  );
  return storySchema.parse(parseJsonOutput<unknown>(output));
}

export async function generateEditorialImage(prompt: string, carouselId: string) {
  const bytes = await generateImageBytes(prompt);
  return saveAsset(bytes, `${carouselId}/cover-${Date.now()}.png`, "image/png");
}
