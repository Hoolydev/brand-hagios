/**
 * Camada de provider de IA do studio.
 *
 * Espelha o que `agents/config.py` já fazia no lado Python: a mesma FAL_KEY
 * cobre texto (any-llm) e imagem (FLUX), sem exigir conta na OpenAI. Quando
 * há OPENAI_API_KEY, ela continua sendo usada.
 *
 * Limite conhecido: `web_search` só existe na Responses API da OpenAI. O
 * Research Agent depende disso para trazer URLs reais, então ele exige OpenAI —
 * gerar dossiê sem busca faria o modelo inventar fontes, que é justamente o que
 * este produto não pode fazer.
 */
import OpenAI from "openai";

const FAL_BASE = "https://fal.run";

export type TextProvider = "fal" | "openai";

export function falKey() {
  return process.env.FAL_KEY || null;
}

export function isOpenAIConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

/** Há como gerar texto (tese, roteiro, copy)? */
export function isTextConfigured() {
  return Boolean(falKey()) || isOpenAIConfigured();
}

/** Há como gerar imagem editorial? */
export function isImageConfigured() {
  return Boolean(falKey()) || isOpenAIConfigured();
}

/** Pesquisa com busca real na web — só a OpenAI oferece hoje. */
export function isResearchConfigured() {
  return isOpenAIConfigured();
}

export function textProvider(): TextProvider {
  return falKey() ? "fal" : "openai";
}

export function activeModels() {
  return {
    text: falKey()
      ? process.env.FAL_LLM_MODEL ?? "openai/gpt-4o-mini"
      : process.env.OPENAI_TEXT_MODEL ?? "gpt-5.4-mini",
    image: falKey()
      ? process.env.FAL_IMAGE_MODEL ?? "fal-ai/flux-pro/v1.1-ultra"
      : process.env.OPENAI_IMAGE_MODEL ?? "gpt-image-2",
  };
}

let openaiClient: OpenAI | null = null;

export function getOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY não configurada.");
  }
  if (!openaiClient) openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return openaiClient;
}

async function callFal<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
  const key = falKey();
  if (!key) throw new Error("FAL_KEY não configurada.");

  const response = await fetch(`${FAL_BASE}/${endpoint}`, {
    method: "POST",
    headers: { Authorization: `Key ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`fal ${endpoint} falhou (${response.status}): ${detail.slice(0, 300)}`);
  }
  return await response.json() as T;
}

/** Remove cercas ```json que os modelos costumam devolver. */
export function parseJsonOutput<T>(value: string): T {
  let clean = value.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/, "").trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start >= 0 && end > start) clean = clean.slice(start, end + 1);

  try {
    return JSON.parse(clean) as T;
  } catch (first) {
    // tentativa de reparo: aspas retas “inteligentes” e vírgula sobrando antes de } ]
    const reparado = clean
      .replace(/[\u201C\u201D]/g, '\"')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/,\s*([}\]])/g, "$1");
    try {
      return JSON.parse(reparado) as T;
    } catch {
      throw first instanceof Error ? first : new Error("Resposta não é JSON válido");
    }
  }
}

/** Texto puro, sem ferramentas. Usa fal quando disponível. */
export async function completeText(prompt: string): Promise<string> {
  const models = activeModels();
  if (falKey()) {
    const result = await callFal<{ output?: string; error?: string }>("fal-ai/any-llm", {
      model: models.text,
      prompt,
    });
    if (result.error) throw new Error(`fal any-llm: ${result.error}`);
    if (!result.output) throw new Error("fal any-llm não devolveu texto.");
    return result.output;
  }
  const response = await getOpenAI().responses.create({ model: models.text, input: prompt });
  return response.output_text;
}

export async function completeJson<T>(prompt: string): Promise<T> {
  const first = await completeText(prompt);
  try {
    return parseJsonOutput<T>(first);
  } catch (error) {
    // o modelo às vezes quebra o JSON (aspas internas etc.): pede de novo, estrito
    const retry = await completeText(
      `${prompt}\n\nATENÇÃO: a resposta anterior não era JSON válido. Responda SOMENTE com JSON válido, ` +
      `sem texto fora do objeto, e escape aspas dentro de strings com \\". Erro: ${error instanceof Error ? error.message : "parse"}`,
    );
    return parseJsonOutput<T>(retry);
  }
}

/** Imagem editorial 4:5. Devolve os bytes do PNG. */
export async function generateImageBytes(prompt: string): Promise<Buffer> {
  const models = activeModels();
  const framing =
    "\nVertical 4:5 editorial photograph for an Instagram carousel. No text, no letters, " +
    "no logos, no watermark. Natural unretouched skin texture, real imperfect lighting. " +
    "Leave negative space for typography.";

  if (falKey()) {
    const result = await callFal<{ images?: Array<{ url: string }> }>(models.image, {
      prompt: `${prompt}${framing}`,
      aspect_ratio: "3:4",
      num_images: 1,
      output_format: "png",
    });
    const url = result.images?.[0]?.url;
    if (!url) throw new Error("fal não devolveu imagem.");
    const file = await fetch(url);
    if (!file.ok) throw new Error(`Download da imagem falhou (${file.status}).`);
    return Buffer.from(await file.arrayBuffer());
  }

  const result = await getOpenAI().images.generate({
    model: models.image,
    prompt: `${prompt}${framing}`,
    size: "1024x1536",
    quality: "medium",
  });
  const base64 = result.data?.[0]?.b64_json;
  if (!base64) throw new Error("OpenAI não devolveu dados de imagem.");
  return Buffer.from(base64, "base64");
}
