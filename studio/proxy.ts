import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, looksLikeValidSession } from "@/lib/session-cookie";

const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/me",
  "/api/system/status",
];

export default function middleware(request: NextRequest) {
  // O middleware trunca o corpo em 10MB; o upload de PDF precisa passar direto.
  // A própria rota valida a sessão.
  if (request.nextUrl.pathname.startsWith("/api/brand-profile/extract")) return NextResponse.next();

  if (process.env.AUTH_REQUIRED !== "true") return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) return NextResponse.next();

  if (looksLikeValidSession(request.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();

  // API responde 401; navegação vai para a tela de login
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "UNAUTHORIZED", message: "Faça login para continuar." }, { status: 401 });
  }
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next|brand|carousels|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico)).*)",
    "/(api|trpc)(.*)",
  ],
};
