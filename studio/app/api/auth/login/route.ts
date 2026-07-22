import { eq } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "@/db";
import { users } from "@/db/schema";
import { createSessionToken, setSessionCookie, verifyPassword } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return Response.json({ error: "DATABASE_NOT_CONFIGURED", message: "Banco de dados não conectado." }, { status: 503 });
  }

  const body = await request.json().catch(() => null) as { email?: string; password?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  const password = body?.password ?? "";
  if (!email || !password) {
    return Response.json({ error: "MISSING_CREDENTIALS", message: "Informe e-mail e senha." }, { status: 400 });
  }

  if (!process.env.AUTH_SECRET) {
    return Response.json({
      error: "AUTH_SECRET_MISSING",
      message: "AUTH_SECRET não configurada no ambiente — a sessão não pode ser assinada.",
    }, { status: 503 });
  }

  try {
    const [user] = await getDb().select().from(users).where(eq(users.email, email)).limit(1);
    // mesma resposta para usuário inexistente e senha errada: não revela quem tem conta
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return Response.json({ error: "INVALID_CREDENTIALS", message: "E-mail ou senha incorretos." }, { status: 401 });
    }

    await setSessionCookie(createSessionToken(user.id, user.email ?? email));
    return Response.json({ id: user.id, name: user.name, email: user.email });
  } catch (error) {
    // sem isto o Next devolve HTML e a tela mostra "não foi possível entrar"
    const detail = error instanceof Error ? error.message : "erro desconhecido";
    return Response.json({ error: "LOGIN_FAILED", message: `Falha ao autenticar: ${detail}` }, { status: 500 });
  }
}
