import { completeJson, isTextConfigured } from "@/lib/ai";
import { extractPdfText } from "@/lib/pdf-text";
import { readFirstFile } from "@/lib/multipart";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Recebe o PDF/manual da marca e devolve os campos preenchidos pela IA. */
export async function POST(request: Request) {
  if (process.env.AUTH_REQUIRED === "true" && !(await getSession())) {
    return Response.json({ error: "UNAUTHORIZED", message: "Faça login para continuar." }, { status: 401 });
  }
  if (!isTextConfigured()) {
    return Response.json({ error: "AI_NOT_CONFIGURED", message: "Configure a FAL_KEY para ler o documento." }, { status: 503 });
  }

  const file = await readFirstFile(request).catch(() => null);
  if (!file) {
    return Response.json({ error: "NO_FILE", message: "Nenhum arquivo recebido." }, { status: 400 });
  }
  if (file.bytes.length > 20 * 1024 * 1024) {
    return Response.json({ error: "TOO_LARGE", message: "Arquivo acima de 20 MB." }, { status: 413 });
  }

  const buffer = file.bytes;
  const isPdf = file.contentType === "application/pdf" || file.filename.toLowerCase().endsWith(".pdf");
  if (!isPdf) {
    return Response.json({ error: "PDF_ONLY", message: "Envie o manual da marca em PDF. Logos em PNG/SVG entram no campo de logo." }, { status: 415 });
  }

  let texto = "";
  try {
    texto = await extractPdfText(buffer);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "erro desconhecido";
    return Response.json({ error: "PDF_READ_FAILED", message: `Não consegui ler o PDF: ${detail}` }, { status: 422 });
  }
  if (texto.length < 40) {
    return Response.json({ error: "PDF_EMPTY", message: "O PDF não tem texto legível (pode ser um PDF só de imagem/escaneado)." }, { status: 422 });
  }

  const recorte = texto.slice(0, 12000);
  const extraido = await completeJson<{
    name: string; instagram: string; audience: string; positioning: string; voice: string[];
  }>(
    `Você recebeu o texto do manual/apresentação de uma marca. Extraia os campos abaixo em português brasileiro. ` +
    `Use SOMENTE o que o documento diz — não invente. Se algum campo não estiver no texto, devolva string vazia (ou lista vazia para voice).\n\n` +
    `- name: o nome da marca.\n` +
    `- instagram: o @ do Instagram, se aparecer.\n` +
    `- audience: para quem a marca fala (público-alvo), em uma frase curta.\n` +
    `- positioning: o que a marca defende/promete, em uma frase.\n` +
    `- voice: 3 a 5 adjetivos do tom de voz (ex: incisiva, técnica, calorosa).\n\n` +
    `TEXTO DO DOCUMENTO:\n"""${recorte}"""\n\n` +
    `Retorne SOMENTE JSON: {"name":"...","instagram":"...","audience":"...","positioning":"...","voice":["..."]}`,
  );

  return Response.json({
    ...extraido,
    instagram: extraido.instagram && !extraido.instagram.startsWith("@") ? `@${extraido.instagram}` : extraido.instagram,
    chars: texto.length,
  });
}
