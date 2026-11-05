"use client";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";

function AdminLoginInner() {
  const router = useRouter();
  const forbidden = useSearchParams().get("error") === "forbidden";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const signIn = async () => {
    setLoading(true); setError(null);
    const { error } = await supabaseBrowser().auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) setError("E-mail ou senha inválidos.");
    else { router.push("/admin"); router.refresh(); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-navy-deep px-6">
      <div className="w-full max-w-sm rounded-2xl border border-gold/30 bg-navy-dark p-8 text-offwhite">
        <p className="font-display text-2xl">Taropeuta<span className="text-gold">.</span></p>
        <p className="mt-1 text-xs text-beige/70">Painel administrativo</p>
        {forbidden && (
          <p className="mt-4 rounded-lg border border-terracotta/40 bg-terracotta/10 px-3 py-2 text-xs text-terracotta">
            403 — Acesso negado. Esta conta não possui o papel de administradora.
          </p>
        )}
        <label className="label mt-6">E-mail</label>
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <label className="label mt-4">Senha</label>
        <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && signIn()} />
        {error && <p className="mt-3 text-xs text-terracotta">{error}</p>}
        <button className="btn-gold mt-6 w-full disabled:opacity-50" disabled={loading} onClick={signIn}>
          {loading ? "…" : "Entrar"}
        </button>
        <p className="mt-4 text-[11px] leading-relaxed text-beige/50">
          Crie o usuário administrador em Supabase → Authentication → Users. Veja docs/SETUP.md.
        </p>
      </div>
    </div>
  );
}

export default function AdminLogin() {
  return (
    <Suspense>
      <AdminLoginInner />
    </Suspense>
  );
}
