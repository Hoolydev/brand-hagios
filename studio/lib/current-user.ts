import { eq } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "@/db";
import { users } from "@/db/schema";
import { getSession } from "@/lib/auth";

/**
 * Id do usuário da requisição.
 *
 * Com AUTH_REQUIRED=true exige sessão. Em desenvolvimento sem sessão, cai num
 * usuário local persistido — assim o studio roda sem login enquanto se testa.
 */
export async function requireUserId() {
  const session = await getSession();
  if (session) return session.userId;

  if (process.env.AUTH_REQUIRED === "true") throw new Error("UNAUTHORIZED");

  if (!isDatabaseConfigured()) return "local-development-user";
  const devUserId = "local-development-user";
  await getDb()
    .insert(users)
    .values({ id: devUserId, name: "Local Development", email: "local@hagios.dev" })
    .onConflictDoNothing();
  return devUserId;
}

/** Perfil completo, quando houver sessão. */
export async function getCurrentUser() {
  const session = await getSession();
  if (!session || !isDatabaseConfigured()) return null;
  const [user] = await getDb().select().from(users).where(eq(users.id, session.userId)).limit(1);
  return user ?? null;
}
