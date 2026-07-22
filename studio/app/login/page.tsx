"use client";

import { LoaderCircle, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as { message?: string };
        setError(payload.message ?? "Não foi possível entrar.");
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError("Falha de conexão com o servidor.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-brand">
        <img src="/brand/hagios-wordmark-gold.png" alt="HÁGIOS" />
        <p>HÁGIOS / CULTURE ENGINE</p>
        <h1>Pesquise sinais.<br />Construa uma tese.<br />Publique com prova.</h1>
        <span>Carrosséis editoriais com fonte rastreável — pesquisa, roteiro, copy e arte no mesmo lugar.</span>
      </section>

      <section className="login-card">
        <form onSubmit={submit}>
          <h2>Entrar no estúdio</h2>
          <label>
            E-mail
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required placeholder="voce@empresa.com" />
          </label>
          <label>
            Senha
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required placeholder="••••••••" />
          </label>
          {error && <p className="login-error">{error}</p>}
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? <LoaderCircle className="spin" size={16} /> : <LogIn size={16} />}
            {isSubmitting ? "Entrando" : "Entrar"}
          </button>
          <small>Acesso restrito. Fale com o administrador do workspace para receber suas credenciais.</small>
        </form>
      </section>
    </main>
  );
}
