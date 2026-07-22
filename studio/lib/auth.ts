/**
 * Autenticação própria do studio — e-mail + senha, sem serviço externo.
 *
 * Usa só a biblioteca padrão do Node: `scrypt` para a senha e um cookie
 * assinado com HMAC para a sessão. O schema já previa `users.passwordHash`.
 */
import { createHmac, randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";

const scrypt = promisify(scryptCb) as (secret: string, salt: string, keylen: number) => Promise<Buffer>;

export const SESSION_COOKIE = "hagios_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 dias

function secret() {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error("AUTH_SECRET não configurada — a sessão não pode ser assinada.");
  return value;
}

// --- senha ------------------------------------------------------------------
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, 64);
  return `scrypt:${salt}:${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string | null) {
  if (!stored?.startsWith("scrypt:")) return false;
  const [, salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const derived = await scrypt(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  // comparação em tempo constante evita vazar o hash por timing
  return expected.length === derived.length && timingSafeEqual(expected, derived);
}

// --- sessão -----------------------------------------------------------------
type SessionPayload = { userId: string; email: string; exp: number };

function sign(data: string) {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

export function createSessionToken(userId: string, email: string) {
  const payload: SessionPayload = {
    userId,
    email,
    exp: Math.floor(Date.now() / 1000) + MAX_AGE_SECONDS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function readSessionToken(token: string | undefined): SessionPayload | null {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = sign(body);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as SessionPayload;
    if (payload.exp * 1000 < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Sessão da requisição atual, ou null. */
export async function getSession() {
  return readSessionToken((await cookies()).get(SESSION_COOKIE)?.value);
}
