import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, isDatabaseConfigured } from "@/db";
import { brandProfiles } from "@/db/schema";
import { requireUserId } from "@/lib/current-user";

export const runtime = "nodejs";

/** Perfil usado quando o workspace ainda não salvou uma marca. */
const FALLBACK = {
  name: "HÁGIOS",
  instagram: "@hagios.ai",
  audience: "",
  positioning: "",
  voice: [] as string[],
  palette: ["#F4F1EA", "#0E0E0F", "#D97757", "#F2B711"],
  logoUrl: "/brand/hagios-logo-transparent.png",
  ctaKeyword: "IA",
  ctaDelivery: "e eu te mando o primeiro passo para adaptar seu negócio à nova era da IA.",
};

/** `voice` guarda também os campos de CTA, que não têm coluna própria. */
function unpack(voice: string[]) {
  const tags: string[] = [];
  let ctaKeyword = FALLBACK.ctaKeyword;
  let ctaDelivery = FALLBACK.ctaDelivery;
  for (const entry of voice) {
    if (entry.startsWith("cta:keyword=")) ctaKeyword = entry.slice("cta:keyword=".length);
    else if (entry.startsWith("cta:delivery=")) ctaDelivery = entry.slice("cta:delivery=".length);
    else tags.push(entry);
  }
  return { voice: tags, ctaKeyword, ctaDelivery };
}

function pack(voice: string[], ctaKeyword: string, ctaDelivery: string) {
  return [...voice, `cta:keyword=${ctaKeyword}`, `cta:delivery=${ctaDelivery}`];
}

export async function GET() {
  if (!isDatabaseConfigured()) return NextResponse.json({ ...FALLBACK, persisted: false });

  const userId = await requireUserId();
  const db = getDb();
  const [row] = await db.select().from(brandProfiles).where(eq(brandProfiles.userId, userId)).limit(1);
  if (!row) return NextResponse.json({ ...FALLBACK, persisted: false });

  const { voice, ctaKeyword, ctaDelivery } = unpack(row.voice ?? []);
  return NextResponse.json({
    id: row.id,
    name: row.name,
    instagram: row.instagram ?? FALLBACK.instagram,
    audience: row.audience ?? "",
    positioning: row.positioning ?? "",
    voice,
    palette: row.palette?.length ? row.palette : FALLBACK.palette,
    logoUrl: row.logoUrl ?? FALLBACK.logoUrl,
    ctaKeyword,
    ctaDelivery,
    persisted: true,
  });
}

export async function PUT(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_NOT_CONFIGURED", message: "Conecte DATABASE_URL para salvar a marca." }, { status: 503 });
  }

  const body = await request.json().catch(() => null) as Partial<typeof FALLBACK> | null;
  if (!body) return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });

  const name = (body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ error: "NAME_REQUIRED", message: "O nome da marca é obrigatório." }, { status: 400 });
  }

  // normaliza o @ para o handle nunca ser gravado de dois jeitos diferentes
  let instagram = (body.instagram ?? "").trim();
  if (instagram && !instagram.startsWith("@")) instagram = `@${instagram}`;

  const userId = await requireUserId();
  const db = getDb();
  const values = {
    userId,
    name,
    instagram: instagram || null,
    audience: (body.audience ?? "").trim() || null,
    positioning: (body.positioning ?? "").trim() || null,
    voice: pack(
      body.voice ?? [],
      (body.ctaKeyword ?? FALLBACK.ctaKeyword).trim() || FALLBACK.ctaKeyword,
      (body.ctaDelivery ?? FALLBACK.ctaDelivery).trim() || FALLBACK.ctaDelivery,
    ),
    palette: body.palette?.length ? body.palette : FALLBACK.palette,
    logoUrl: (body.logoUrl ?? "").trim() || null,
    updatedAt: new Date(),
  };

  const [row] = await db
    .insert(brandProfiles)
    .values(values)
    .onConflictDoUpdate({ target: brandProfiles.userId, set: values })
    .returning();

  const { voice, ctaKeyword, ctaDelivery } = unpack(row.voice ?? []);
  return NextResponse.json({
    id: row.id,
    name: row.name,
    instagram: row.instagram ?? "",
    audience: row.audience ?? "",
    positioning: row.positioning ?? "",
    voice,
    palette: row.palette,
    logoUrl: row.logoUrl ?? "",
    ctaKeyword,
    ctaDelivery,
    persisted: true,
  });
}
