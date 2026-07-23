import { and, eq } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "@/db";
import { agentRuns, assets, carousels, slides, sources } from "@/db/schema";
import { runBrandAgent, runCopyAgent, runResearch, runResearchFromUrls, runStoryAgent, generateEditorialImage } from "@/lib/agents/pipeline";
import { generateHeroImage, isHeroAgentConfigured } from "@/lib/agents/hero";
import { requireUserId } from "@/lib/current-user";
import { activeModels, isResearchConfigured, isTextConfigured } from "@/lib/ai";

async function tracked<T>(carouselId: string, agent: string, input: Record<string, unknown>, task: () => Promise<T>) {
  const db = getDb();
  const [run] = await db.insert(agentRuns).values({ carouselId, agent, status: "running", model: agent === "image" ? activeModels().image : activeModels().text, input, startedAt: new Date() }).returning();
  try {
    const output = await task();
    await db.update(agentRuns).set({ status: "completed", output: output as Record<string, unknown>, completedAt: new Date() }).where(eq(agentRuns.id, run.id));
    return output;
  } catch (error) {
    await db.update(agentRuns).set({ status: "failed", error: error instanceof Error ? error.message : "Erro desconhecido", completedAt: new Date() }).where(eq(agentRuns.id, run.id));
    throw error;
  }
}

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured()) return Response.json({ error: "DATABASE_NOT_CONFIGURED", message: "Configure DATABASE_URL antes de gerar." }, { status: 503 });
  if (!isTextConfigured()) return Response.json({ error: "AI_NOT_CONFIGURED", message: "Configure FAL_KEY ou OPENAI_API_KEY antes de gerar." }, { status: 503 });
  const body = await _request.json().catch(() => ({})) as { sourceUrls?: string[] };
  const sourceUrls = (body.sourceUrls ?? []).map((u) => String(u).trim()).filter(Boolean);

  // Sem busca automática (só a OpenAI tem web_search), o dossiê vem de URLs reais
  // coladas pelo usuário. O servidor baixa cada página; nada é inventado.
  if (!isResearchConfigured() && sourceUrls.length < 2) {
    return Response.json({
      error: "SOURCES_REQUIRED",
      message: "Cole ao menos 2 links de matérias. Sem OpenAI não há busca automática, e o dossiê é montado a partir das páginas que você indicar.",
    }, { status: 422 });
  }

  const db = getDb();
  const { id } = await context.params;
  try {
    const userId = await requireUserId();
    const [carousel] = await db.select().from(carousels).where(and(eq(carousels.id, id), eq(carousels.userId, userId))).limit(1);
    if (!carousel) return Response.json({ error: "NOT_FOUND" }, { status: 404 });

    await db.update(carousels).set({ status: "generating", currentStage: "research", updatedAt: new Date() }).where(eq(carousels.id, id));
    await db.delete(assets).where(eq(assets.carouselId, id));
    await db.delete(slides).where(eq(slides.carouselId, id));
    await db.delete(sources).where(eq(sources.carouselId, id));

    const researchInput = { topic: carousel.topic, audience: carousel.audience, interests: carousel.interests, urls: sourceUrls };
    const research = await tracked(id, "research", researchInput, () =>
      sourceUrls.length >= 2 ? runResearchFromUrls(researchInput) : runResearch(researchInput));
    await db.update(carousels).set({ currentStage: "brand" }).where(eq(carousels.id, id));

    const insertedSources = await db.insert(sources).values(research.sources.map((source) => ({
      carouselId: id,
      url: source.url,
      canonicalUrl: source.canonicalUrl,
      title: source.title,
      publisher: source.publisher,
      summary: source.summary,
      imageUrl: source.imageUrl,
      relevanceScore: source.relevanceScore,
    }))).returning();

    const sourceAssets = insertedSources.filter((source) => source.imageUrl).map((source) => ({
      carouselId: id,
      storageProvider: "external",
      storageKey: source.imageUrl!,
      url: source.imageUrl!,
      mimeType: "image/*",
      sourceUrl: source.url,
      attribution: `${source.publisher ?? "Fonte editorial"} · imagem original atribuída`,
      isGenerated: false,
    }));
    if (sourceAssets.length) await db.insert(assets).values(sourceAssets);

    await db.update(carousels).set({ currentStage: "brand+story" }).where(eq(carousels.id, id));
    const [brand, story] = await Promise.all([
      tracked(id, "brand", { topic: carousel.topic, research }, () => runBrandAgent({ topic: carousel.topic, audience: carousel.audience, interests: carousel.interests, research, brand: carousel.brandSnapshot ?? {} })),
      tracked(id, "storytelling", { count: carousel.slideCount, research }, () => runStoryAgent({ count: carousel.slideCount, research })),
    ]);
    await db.update(carousels).set({ currentStage: "story", thesis: brand.thesis }).where(eq(carousels.id, id));
    await db.update(carousels).set({ currentStage: "copy" }).where(eq(carousels.id, id));
    const copy = await tracked(id, "copy", { audience: carousel.audience, thesis: brand.thesis }, () => runCopyAgent({ audience: carousel.audience, thesis: brand.thesis, story }));

    await db.update(carousels).set({ currentStage: "image" }).where(eq(carousels.id, id));
    const normalizeUrl = (value: string | null | undefined) => {
      if (!value) return null;
      try {
        const url = new URL(value);
        url.hash = "";
        url.pathname = url.pathname.replace(/\/$/, "");
        return url.toString();
      } catch {
        return value;
      }
    };
    const sourceByUrl = new Map<string, typeof insertedSources[number]>();
    for (const source of insertedSources) {
      for (const key of [normalizeUrl(source.url), normalizeUrl(source.canonicalUrl)]) {
        if (key) sourceByUrl.set(key, source);
      }
    }
    const preparedSlides = await Promise.all(copy.slides.map(async (item) => {
      const matchedSource = (item.sourceUrl ? sourceByUrl.get(normalizeUrl(item.sourceUrl) ?? "") : undefined) ?? (item.imageStrategy === "source" ? insertedSources.find((source) => source.imageUrl) : undefined);
      let imageUrl = item.imageStrategy === "source" ? matchedSource?.imageUrl ?? null : null;
      let stored: Awaited<ReturnType<typeof generateEditorialImage>> | null = null;
      // Falha de imagem em uma tela não pode derrubar o carrossel inteiro:
      // a tela fica sem imagem e o texto (que é o que importa) é preservado.
      try {
        if (item.imageStrategy === "generated" && item.imagePrompt) {
          stored = await tracked(id, "image", { slide: item.order, prompt: item.imagePrompt }, () => generateEditorialImage(item.imagePrompt!, id));
          imageUrl = stored.url;
        }
        if (item.imageStrategy === "hero") {
          const heroBrand = item.heroBrand ?? "paz";
          if (isHeroAgentConfigured()) {
            stored = await tracked(id, "hero", { slide: item.order, brand: heroBrand }, () => generateHeroImage({ theme: carousel.topic, brand: heroBrand, audience: carousel.audience, carouselId: id }));
          } else {
            const prompt = `Retrato fotográfico realista de uma pessoa jovem segurando de frente para a câmera uma lata de energético da marca ${heroBrand}, luz de estúdio limpa, fundo sólido, estilo editorial de rede social`;
            stored = await tracked(id, "image", { slide: item.order, prompt }, () => generateEditorialImage(prompt, id));
          }
          imageUrl = stored.url;
        }
      } catch (imageError) {
        console.error(`imagem da tela ${item.order} falhou:`, imageError);
      }
      return { item, matchedSource, imageUrl, stored };
    }));
    for (const { item, matchedSource, imageUrl, stored } of preparedSlides) {
      const [createdSlide] = await db.insert(slides).values({
        carouselId: id,
        sourceId: matchedSource?.id,
        order: item.order,
        role: item.role,
        title: item.title,
        body: item.body,
        kind: item.kind,
        imageStrategy: item.imageStrategy,
        imageUrl,
        imagePrompt: item.imagePrompt,
        status: "ready",
      }).returning();

      if (stored) await db.insert(assets).values({ carouselId: id, slideId: createdSlide.id, storageProvider: stored.provider, storageKey: stored.key, url: stored.url, mimeType: "image/png", isGenerated: true });
    }

    await db.update(carousels).set({ status: "ready", currentStage: "complete", updatedAt: new Date() }).where(eq(carousels.id, id));
    return Response.json({ id, status: "ready", slideCount: copy.slides.length, sourceCount: insertedSources.length });
  } catch (error) {
    await db.update(carousels).set({ status: "failed", updatedAt: new Date() }).where(eq(carousels.id, id));
    if (error instanceof Error && error.message === "UNAUTHORIZED") return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
    return Response.json({ error: "GENERATION_FAILED", message: error instanceof Error ? error.message : "Falha na geração" }, { status: 500 });
  }
}
