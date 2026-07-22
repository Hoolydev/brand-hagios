import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getDb, isDatabaseConfigured } from "@/db";
import { assets, carousels, slides, sources } from "@/db/schema";
import { requireUserId } from "@/lib/current-user";

export const runtime = "nodejs";

/** Raiz do acervo: as pastas `Carrossel N` ficam ao lado do studio. */
const VAULT = path.resolve(process.cwd(), "..");
const PUBLIC_DIR = path.join(process.cwd(), "public", "carousels");

type ManifestSlide = {
  order: number;
  role: string;
  kind: string;
  title: string;
  body?: string;
  imageStrategy?: string;
  file?: string;
  sourceUrl?: string;
  fixedCard?: boolean;
};

type ManifestSource = {
  url: string;
  title: string;
  publisher?: string;
  summary?: string;
  relevanceScore?: number;
};

type Manifest = {
  slug: string;
  title: string;
  topic: string;
  audience: string;
  interests?: string[];
  status?: string;
  currentStage?: string;
  thesis?: string;
  artDir: string;
  filePattern?: string;
  slides: ManifestSlide[];
  sources?: ManifestSource[];
};

/** Resolve o nome do arquivo da arte: explícito ou via padrão numerado. */
function artFileName(slide: ManifestSlide, manifest: Manifest) {
  if (slide.file) return slide.file;
  if (manifest.filePattern) {
    return manifest.filePattern.replace("{n:02d}", String(slide.order).padStart(2, "0"));
  }
  return null;
}

async function findManifests() {
  const entries = await readdir(VAULT, { withFileTypes: true });
  const found: Array<{ dir: string; manifest: Manifest }> = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dir = path.join(VAULT, entry.name);
    try {
      const raw = await readFile(path.join(dir, "manifest.json"), "utf8");
      found.push({ dir, manifest: JSON.parse(raw) as Manifest });
    } catch {
      // pasta sem manifest: ignora
    }
  }
  return found;
}

export async function POST() {
  // O importador lê as pastas do acervo e copia artes para public/: só faz
  // sentido rodando local. Em serverless o filesystem é somente leitura.
  if (process.env.VERCEL) {
    return NextResponse.json({
      error: "LOCAL_ONLY",
      message: "A importação lê as pastas do acervo em disco e só roda no ambiente local.",
    }, { status: 501 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL não configurada" }, { status: 503 });
  }

  const userId = await requireUserId();
  const db = getDb();
  const manifests = await findManifests();
  if (!manifests.length) {
    return NextResponse.json({ error: `Nenhum manifest.json encontrado em ${VAULT}` }, { status: 404 });
  }

  const report: Array<Record<string, unknown>> = [];

  for (const { dir, manifest } of manifests) {
    // idempotência: o slug do manifest vira um id estável (UUID v5-like via sha1)
    const hash = createHash("sha1").update(manifest.slug).digest("hex");
    const carouselId = [
      hash.slice(0, 8), hash.slice(8, 12), `5${hash.slice(13, 16)}`,
      ((parseInt(hash.slice(16, 18), 16) & 0x3f) | 0x80).toString(16) + hash.slice(18, 20),
      hash.slice(20, 32),
    ].join("-");

    const values = {
      id: carouselId,
      userId,
      title: manifest.title,
      topic: manifest.topic,
      audience: manifest.audience,
      interests: manifest.interests ?? [],
      slideCount: manifest.slides.length,
      status: manifest.status ?? "ready",
      currentStage: manifest.currentStage ?? "publish",
      thesis: manifest.thesis ?? null,
      updatedAt: new Date(),
    };
    await db.insert(carousels).values(values).onConflictDoUpdate({ target: carousels.id, set: values });

    // reimporta do zero: filhos são apagados e reescritos
    await db.delete(slides).where(eq(slides.carouselId, carouselId));
    await db.delete(assets).where(eq(assets.carouselId, carouselId));
    await db.delete(sources).where(eq(sources.carouselId, carouselId));

    const urlToSourceId = new Map<string, string>();
    for (const source of manifest.sources ?? []) {
      const [row] = await db.insert(sources).values({
        carouselId,
        url: source.url,
        title: source.title,
        publisher: source.publisher ?? null,
        summary: source.summary ?? null,
        relevanceScore: source.relevanceScore ?? null,
      }).returning({ id: sources.id });
      urlToSourceId.set(source.url, row.id);
    }

    const destDir = path.join(PUBLIC_DIR, manifest.slug);
    await mkdir(destDir, { recursive: true });

    let copied = 0;
    for (const slide of manifest.slides) {
      const fileName = artFileName(slide, manifest);
      let publicUrl: string | null = null;

      if (fileName) {
        const from = path.join(dir, manifest.artDir, fileName);
        try {
          await copyFile(from, path.join(destDir, fileName));
          publicUrl = `/carousels/${manifest.slug}/${fileName}`;
          copied += 1;
        } catch {
          publicUrl = null; // arte ausente não impede o import do texto
        }
      }

      const [slideRow] = await db.insert(slides).values({
        carouselId,
        sourceId: slide.sourceUrl ? urlToSourceId.get(slide.sourceUrl) ?? null : null,
        order: slide.order,
        role: slide.role,
        title: slide.title,
        body: slide.body ?? null,
        kind: slide.kind,
        imageStrategy: slide.imageStrategy ?? "none",
        imageUrl: publicUrl,
        status: "ready",
      }).returning({ id: slides.id });

      if (publicUrl) {
        await db.insert(assets).values({
          carouselId,
          slideId: slideRow.id,
          storageProvider: "local-public",
          storageKey: `carousels/${manifest.slug}/${fileName}`,
          url: publicUrl,
          mimeType: "image/png",
          width: 1080,
          height: 1350,
          sourceUrl: slide.sourceUrl ?? null,
          attribution: slide.fixedCard ? "Card final fixo HÁGIOS" : null,
        });
      }
    }

    report.push({
      slug: manifest.slug,
      title: manifest.title,
      carouselId,
      slides: manifest.slides.length,
      sources: (manifest.sources ?? []).length,
      artesCopiadas: copied,
    });
  }

  return NextResponse.json({ imported: report.length, projects: report });
}

export async function GET() {
  if (process.env.VERCEL) {
    return NextResponse.json({ vault: null, encontrados: [], localOnly: true });
  }
  const manifests = await findManifests();
  return NextResponse.json({
    vault: VAULT,
    encontrados: manifests.map(({ dir, manifest }) => ({
      pasta: path.basename(dir),
      slug: manifest.slug,
      title: manifest.title,
      slides: manifest.slides.length,
    })),
  });
}
