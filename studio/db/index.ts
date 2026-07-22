import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

let client: ReturnType<typeof postgres> | null = null;
let database: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}

export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL não configurada. Conecte um PostgreSQL antes de salvar projetos.");
  }

  if (!client) client = postgres(process.env.DATABASE_URL, { prepare: false, max: 5 });
  if (!database) database = drizzle(client, { schema });
  return database;
}
