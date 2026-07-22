import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, isDatabaseConfigured } from "@/db";
import { agentRuns, carousels, slides, sources } from "@/db/schema";
import { runSlideEditor } from "@/lib/agents/pipeline";
import { requireUserId } from "@/lib/current-user";
import { isTextConfigured } from "@/lib/ai";

const editSchema = z.object({
  instruction: z.string().min(3).max(1200),
});

export async function POST(request: Request, context: { params: Promise<{ id: string; slideId: string }> }) {
  if (!isDatabaseConfigured()) return Response.json({ error: "DATABASE_NOT_CONFIGURED", message: "Conecte o PostgreSQL para editar um card salvo." }, { status: 503 });
  if (!isTextConfigured()) return Response.json({ error: "AI_NOT_CONFIGURED", message: "Configure FAL_KEY ou OPENAI_API_KEY para usar o assistente de edição." }, { status: 503 });

  try {
    const { id, slideId } = await context.params;
    const { instruction } = editSchema.parse(await request.json());
    const userId = await requireUserId();
    const db = getDb();
    const [carousel] = await db.select().from(carousels).where(and(eq(carousels.id, id), eq(carousels.userId, userId))).limit(1);
    if (!carousel) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
    const [slide] = await db.select().from(slides).where(and(eq(slides.id, slideId), eq(slides.carouselId, id))).limit(1);
    if (!slide) return Response.json({ error: "SLIDE_NOT_FOUND" }, { status: 404 });
    const [source] = slide.sourceId ? await db.select().from(sources).where(eq(sources.id, slide.sourceId)).limit(1) : [];

    const [run] = await db.insert(agentRuns).values({
      carouselId: id,
      agent: "slide-editor",
      status: "running",
      model: process.env.OPENAI_TEXT_MODEL,
      input: { slideId, instruction },
      startedAt: new Date(),
    }).returning();

    try {
      const edited = await runSlideEditor({
        carousel: { topic: carousel.topic, audience: carousel.audience, interests: carousel.interests, thesis: carousel.thesis },
        slide: {
          order: slide.order,
          role: slide.role,
          title: slide.title,
          body: slide.body ?? "",
          kind: slide.kind as "cover" | "dark" | "signal" | "paper" | "mint",
          imageStrategy: slide.imageStrategy as "generated" | "source" | "none",
          sourceUrl: source?.url ?? null,
          imagePrompt: slide.imagePrompt,
        },
        source: source ? { title: source.title, publisher: source.publisher, summary: source.summary, url: source.url } : null,
        instruction,
      });
      const [updated] = await db.update(slides).set({ role: edited.role, title: edited.title, body: edited.body, kind: edited.kind, imageStrategy: edited.imageStrategy, imagePrompt: edited.imagePrompt, status: "ready" }).where(eq(slides.id, slideId)).returning();
      await db.update(agentRuns).set({ status: "completed", output: edited, completedAt: new Date() }).where(eq(agentRuns.id, run.id));
      await db.update(carousels).set({ updatedAt: new Date() }).where(eq(carousels.id, id));
      return Response.json({ slide: updated, agentRunId: run.id });
    } catch (error) {
      await db.update(agentRuns).set({ status: "failed", error: error instanceof Error ? error.message : "Falha na edição", completedAt: new Date() }).where(eq(agentRuns.id, run.id));
      throw error;
    }
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (error instanceof z.ZodError) return Response.json({ error: "INVALID_INPUT", issues: error.issues }, { status: 400 });
    return Response.json({ error: "SLIDE_EDIT_FAILED", message: error instanceof Error ? error.message : "Falha ao editar o card" }, { status: 500 });
  }
}
