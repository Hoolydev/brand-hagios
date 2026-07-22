import { eq } from "drizzle-orm";
import { getDb, isDatabaseConfigured } from "@/db";
import { users } from "@/db/schema";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ user: null });
  if (!isDatabaseConfigured()) return Response.json({ user: { id: session.userId, email: session.email } });

  const [user] = await getDb().select().from(users).where(eq(users.id, session.userId)).limit(1);
  if (!user) return Response.json({ user: null });
  return Response.json({ user: { id: user.id, name: user.name, email: user.email } });
}
