/**
 * Cria (ou atualiza) o usuário administrador do workspace.
 *
 * Credenciais vêm do ambiente — nunca ficam no código nem no repositório:
 *   ADMIN_EMAIL=... ADMIN_PASSWORD=... node scripts/seed-admin.mjs
 */
import { createHash, randomBytes, scrypt as scryptCb } from "node:crypto";
import { promisify } from "node:util";
import { readFileSync } from "node:fs";
import postgres from "postgres";

const scrypt = promisify(scryptCb);

function envFromFile(file) {
  try {
    return Object.fromEntries(
      readFileSync(file, "utf8")
        .split("\n")
        .filter((line) => line.trim() && !line.trim().startsWith("#") && line.includes("="))
        .map((line) => {
          const index = line.indexOf("=");
          return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^["']|["']$/g, "")];
        }),
    );
  } catch {
    return {};
  }
}

const fileEnv = envFromFile(new URL("../.env.local", import.meta.url).pathname);
const DATABASE_URL = process.env.DATABASE_URL ?? fileEnv.DATABASE_URL;
const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD ?? "";
const name = process.env.ADMIN_NAME ?? "Administrador";

if (!DATABASE_URL) throw new Error("DATABASE_URL não encontrada.");
if (!email || !password) throw new Error("Defina ADMIN_EMAIL e ADMIN_PASSWORD.");
if (password.length < 8) throw new Error("A senha precisa de ao menos 8 caracteres.");

const salt = randomBytes(16).toString("hex");
const derived = await scrypt(password, salt, 64);
const passwordHash = `scrypt:${salt}:${derived.toString("hex")}`;

// id estável a partir do e-mail: rodar de novo atualiza em vez de duplicar
const id = createHash("sha1").update(`admin:${email}`).digest("hex").slice(0, 32);

const sql = postgres(DATABASE_URL, { ssl: "require" });
await sql`
  insert into users (id, name, email, password_hash)
  values (${id}, ${name}, ${email}, ${passwordHash})
  on conflict (email) do update set name = excluded.name, password_hash = excluded.password_hash
`;
const [row] = await sql`select id, name, email from users where email = ${email}`;
await sql.end();

console.log("Administrador pronto:", row);
