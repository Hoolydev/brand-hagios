import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, isDatabaseConfigured } from "@/db";
import { agentRuns, carousels, slides, sources } from "@/db/schema";
import { requireUserId } from "@/lib/current-user";

const updateSchema = z.object({
  title: z.string().min(3).max(180).optional(),
  topic: z.string().min(3).max(1000).optional(),
  audience: z.string().min(3).max(500).optional(),
  interests: z.array(z.string().min(1).max(60)).max(20).optional(),
  slideCount: z.number().int().min(5).max(10).optional(),
  brandSnapshot: z.record(z.string(), z.unknown()).optional(),
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured()) return Response.json({ error: "DATABASE_NOT_CONFIGURED" }, { status: 503 });
  try {
    const { id } = await context.params;
    const userId = await requireUserId();
    const [carousel] = await getDb().select().from(carousels).where(and(eq(carousels.id, id), eq(carousels.userId, userId))).limit(1);
    if (!carousel) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
    const [carouselSlides, carouselSources, runs] = await Promise.all([
      getDb().select().from(slides).where(eq(slides.carouselId, id)).orderBy(asc(slides.order)),
      getDb().select().from(sources).where(eq(sources.carouselId, id)),
      getDb().select().from(agentRuns).where(eq(agentRuns.carouselId, id)).orderBy(asc(agentRuns.createdAt)),
    ]);
    return Response.json({ ...carousel, slides: carouselSlides, sources: carouselSources, agentRuns: runs });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
    return Response.json({ error: error instanceof Error ? error.message : "Falha ao abrir projeto" }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured()) return Response.json({ error: "DATABASE_NOT_CONFIGURED", message: "Conecte DATABASE_URL para salvar." }, { status: 503 });
  try {
    const { id } = await context.params;
    const userId = await requireUserId();
    const payload = updateSchema.parse(await request.json());
    const [updated] = await getDb().update(carousels).set({ ...payload, updatedAt: new Date() }).where(and(eq(carousels.id, id), eq(carousels.userId, userId))).returning();
    if (!updated) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
    return Response.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (error instanceof z.ZodError) return Response.json({ error: "INVALID_INPUT", issues: error.issues }, { status: 400 });
    return Response.json({ error: error instanceof Error ? error.message : "Falha ao salvar" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  if (!isDatabaseConfigured()) return Response.json({ error: "DATABASE_NOT_CONFIGURED" }, { status: 503 });
  try {
    const { id } = await context.params;
    const userId = await requireUserId();
    const [removed] = await getDb().delete(carousels).where(and(eq(carousels.id, id), eq(carousels.userId, userId))).returning({ id: carousels.id });
    if (!removed) return Response.json({ error: "NOT_FOUND" }, { status: 404 });
    return Response.json({ id: removed.id });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
    return Response.json({ error: error instanceof Error ? error.message : "Falha ao remover" }, { status: 500 });
  }
}
