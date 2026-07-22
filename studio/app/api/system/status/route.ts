import { isDatabaseConfigured } from "@/db";
import { activeModels, isOpenAIConfigured, isResearchConfigured, isTextConfigured, textProvider } from "@/lib/ai";

export async function GET() {
  const ai = isTextConfigured();
  return Response.json({
    database: isDatabaseConfigured(),
    // `ai` destrava tese, roteiro, copy e imagem — via fal OU OpenAI.
    ai,
    provider: ai ? textProvider() : null,
    models: ai ? activeModels() : null,
    // Busca real na web só existe na OpenAI; sem ela o dossiê não pode ser gerado.
    research: isResearchConfigured(),
    openai: isOpenAIConfigured(),
    session: Boolean(process.env.AUTH_SECRET),
    authRequired: process.env.AUTH_REQUIRED === "true",
    storage: Boolean(process.env.S3_ENDPOINT && process.env.S3_BUCKET && process.env.S3_PUBLIC_BASE_URL),
  });
}
