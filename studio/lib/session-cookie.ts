/**
 * Leitura do cookie de sessão sem depender de APIs do Node.
 *
 * O middleware roda no Edge runtime, onde `node:crypto` e `next/headers` não
 * existem — importá-los ali derruba toda requisição. Aqui só decodificamos o
 * payload para uma checagem barata de presença e validade.
 *
 * A verificação da ASSINATURA continua em `lib/auth.ts`, usada pelas páginas e
 * rotas (runtime Node). Um cookie forjado passa por este filtro, mas é
 * rejeitado logo em seguida por quem realmente autoriza.
 */
export const SESSION_COOKIE = "hagios_session";

export function looksLikeValidSession(token: string | undefined) {
  if (!token) return false;
  const [body, signature] = token.split(".");
  if (!body || !signature) return false;

  try {
    const json = atob(body.replace(/-/g, "+").replace(/_/g, "/"));
    const payload = JSON.parse(json) as { exp?: number };
    return typeof payload.exp === "number" && payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}
