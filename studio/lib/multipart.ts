/**
 * Parser mínimo de multipart/form-data a partir do corpo bruto.
 *
 * O `request.formData()` do Next 16 com Turbopack falha ao parsear uploads
 * ("Failed to parse body as FormData"). Aqui lemos o arrayBuffer e extraímos
 * o primeiro arquivo manualmente — suficiente para o upload de um PDF.
 */
export type UploadedFile = { filename: string; contentType: string; bytes: Buffer };

export async function readFirstFile(request: Request): Promise<UploadedFile | null> {
  const contentType = request.headers.get("content-type") ?? "";
  const match = contentType.match(/boundary=(.+)$/);
  if (!match) return null;

  const boundary = `--${match[1].trim()}`;
  const body = Buffer.from(await request.arrayBuffer());
  const boundaryBuf = Buffer.from(boundary);

  let start = body.indexOf(boundaryBuf);
  while (start !== -1) {
    const partStart = start + boundaryBuf.length + 2; // pula boundary + CRLF
    const next = body.indexOf(boundaryBuf, partStart);
    if (next === -1) break;

    const part = body.subarray(partStart, next);
    const headerEnd = part.indexOf("\r\n\r\n");
    if (headerEnd !== -1) {
      const headers = part.subarray(0, headerEnd).toString("utf8");
      const nameMatch = headers.match(/name="([^"]*)"/i);
      const fileMatch = headers.match(/filename="([^"]*)"/i);
      if (fileMatch && nameMatch?.[1] === "file") {
        // conteúdo entre o cabeçalho e o CRLF que precede o próximo boundary
        const content = part.subarray(headerEnd + 4, part.length - 2);
        const ctMatch = headers.match(/content-type:\s*([^\r\n]+)/i);
        return {
          filename: fileMatch[1],
          contentType: ctMatch?.[1]?.trim() ?? "application/octet-stream",
          bytes: Buffer.from(content),
        };
      }
    }
    start = next;
  }
  return null;
}
