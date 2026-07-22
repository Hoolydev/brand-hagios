"use client";

import { LogOut, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Account = { id: string; name: string | null; email: string | null };

/** Identidade do workspace no cabeçalho + saída da sessão. */
export function AccountControls() {
  const router = useRouter();
  const [user, setUser] = useState<Account | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void fetch("/api/auth/me")
      .then((response) => response.json())
      .then((payload: { user: Account | null }) => setUser(payload.user))
      .catch(() => setUser(null))
      .finally(() => setLoaded(true));
  }, []);

  if (!loaded) return <div className="account-controls" aria-hidden="true" />;

  if (!user) {
    return (
      <div className="account-controls">
        <button className="account-button primary" type="button" onClick={() => router.push("/login")}>Entrar</button>
      </div>
    );
  }

  const label = user.name || user.email || "Workspace";

  return (
    <div className="account-controls" aria-label="Conta">
      <span className="account-chip" title={user.email ?? undefined}>
        <UserRound size={13} /> {label}
      </span>
      <button
        className="account-button"
        type="button"
        title="Sair"
        onClick={async () => {
          await fetch("/api/auth/logout", { method: "POST" });
          router.replace("/login");
          router.refresh();
        }}
      >
        <LogOut size={13} /> Sair
      </button>
    </div>
  );
}
