import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin", label: "Visão geral" },
  { href: "/admin/today", label: "Hoje" },
  { href: "/admin/crm", label: "CRM" },
  { href: "/admin/inbox", label: "Social Inbox" },
  { href: "/admin/calendar", label: "Agenda" },
  { href: "/admin/finance", label: "Financeiro" },
  { href: "/admin/services", label: "Atendimentos" },
  { href: "/admin/content", label: "Conteúdo" },
  { href: "/admin/settings", label: "Configurações" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  // The sidebar is only chrome — real access control happens per-page via
  // requireAdmin() (role check) and per server action via assertAdmin().
  // Signed-out visitors (login page) render without the sidebar.
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen bg-offwhite font-body text-navy-deep">
      {user ? (
        <div className="flex min-h-screen">
          <aside className="hidden w-60 shrink-0 flex-col border-r border-navy-deep/10 bg-navy-deep p-6 text-offwhite md:flex">
            <p className="font-display text-xl">Taropeuta<span className="text-gold">.</span> <span className="text-xs text-beige/60">admin</span></p>
            <nav className="mt-8 flex flex-col gap-1 text-sm">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="rounded-lg px-3 py-2 text-beige/90 transition hover:bg-navy-dark hover:text-offwhite">{n.label}</Link>
              ))}
            </nav>
            <form action="/admin/login/signout" method="post" className="mt-auto">
              <button className="text-xs text-beige/60 hover:text-offwhite">Sair</button>
            </form>
          </aside>
          <div className="flex-1 p-6 md:p-10">{children}</div>
        </div>
      ) : (
        children
      )}
    </div>
  );
}
