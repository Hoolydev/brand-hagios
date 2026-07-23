/**
 * Extrai texto de PDF no servidor.
 *
 * Usa `unpdf` — um build do pdf.js empacotado para runtimes serverless, sem
 * dependência de APIs de browser (DOMMatrix etc.) que quebram no Node.
 */
import { extractText, getDocumentProxy } from "unpdf";

export async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return text.replace(/[ \t]+/g, " ").trim();
}
