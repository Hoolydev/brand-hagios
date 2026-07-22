import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { getDb, isDatabaseConfigured } from "@/db";
import { carousels } from "@/db/schema";
import { requireUserId } from "@/lib/current-user";

const createCarouselSchema = z.object({
  title: z.string().min(3).max(180),
  topic: z.string().min(3).max(1000),
  audience: z.string().min(3).max(500),
  interests: z.array(z.string().min(1).max(60)).max(20),
  slideCount: z.number().int().min(5).max(10),
  brandSnapshot: z.record(z.string(), z.unknown()).optional(),
});

export async function GET() {
  if (!isDatabaseConfigured()) return Response.json({ error: "DATABASE_NOT_CONFIGURED" }, { status: 503 });
  try {
    const userId = await requireUserId();
    const items = await getDb().select().from(carousels).where(eq(carousels.userId, userId)).orderBy(desc(carousels.updatedAt));
    return Response.json({ items });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
    return Response.json({ error: error instanceof Error ? error.message : "Falha ao listar projetos" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) return Response.json({ error: "DATABASE_NOT_CONFIGURED", message: "Conecte DATABASE_URL para criar e salvar carrosséis." }, { status: 503 });
  try {
    const payload = createCarouselSchema.parse(await request.json());
    const userId = await requireUserId();
    const [created] = await getDb().insert(carousels).values({ ...payload, userId, status: "draft", currentStage: "brief" }).returning();
    return Response.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
    if (error instanceof z.ZodError) return Response.json({ error: "INVALID_INPUT", issues: error.issues }, { status: 400 });
    return Response.json({ error: error instanceof Error ? error.message : "Falha ao criar projeto" }, { status: 500 });
  }
}
