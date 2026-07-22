import { saveAsset } from "@/lib/storage";

// Cliente do serviço Python (agents/api.py). Quando HERO_AGENT_URL não está
// definido, o pipeline cai no fallback de imagem gerada (ver generate/route.ts).

export function isHeroAgentConfigured() {
  return Boolean(process.env.HERO_AGENT_URL);
}

function baseUrl() {
  const url = process.env.HERO_AGENT_URL;
  if (!url) throw new Error("HERO_AGENT_URL não configurada. Serviço de agentes indisponível.");
  return url.replace(/\/$/, "");
}

export type HeroSource = {
  pin_url?: string;
  image_url?: string;
  description?: string;
  score?: number;
  reason?: string;
};

export type HeroResult = Awaited<ReturnType<typeof saveAsset>> & {
  brand: string;
  source: HeroSource | null;
  queries: string[];
};

export async function generateHeroImage(input: {
  theme: string;
  brand: string;
  audience?: string;
  carouselId: string;
}): Promise<HeroResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180_000); // pipeline pode levar ~1-2min
  try {
    const response = await fetch(`${baseUrl()}/hero`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ theme: input.theme, brand: input.brand, audience: input.audience }),
      signal: controller.signal,
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Hero Agent falhou (${response.status}): ${detail}`);
    }
    const data = (await response.json()) as {
      image_base64: string;
      brand?: string;
      source?: HeroSource;
      queries?: string[];
    };
    if (!data.image_base64) throw new Error("Hero Agent não devolveu imagem.");
    const bytes = Buffer.from(data.image_base64, "base64");
    const stored = await saveAsset(bytes, `${input.carouselId}/hero-${Date.now()}.png`, "image/png");
    return {
      ...stored,
      brand: data.brand ?? input.brand,
      source: data.source ?? null,
      queries: data.queries ?? [],
    };
  } finally {
    clearTimeout(timeout);
  }
}
