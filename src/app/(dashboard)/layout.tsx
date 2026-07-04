import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sair } from "./actions";

// Shell do dashboard. Carrega o perfil 1x e protege as rotas internas.
// Só listamos telas que já existem — as demais do Encontro serão portadas depois.
const NAV = [
  { href: "/dashboard", label: "Início" },
  { href: "/encontristas", label: "Encontristas" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div data-zone="deep" className="min-h-screen">
      <nav className="sticky top-0 z-10 flex items-center gap-1 overflow-x-auto border-b border-[rgba(164,214,232,0.12)] bg-[rgba(0,14,33,0.6)] px-3 py-2 backdrop-blur-sm">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-raso transition hover:bg-white/10 hover:text-luz"
          >
            {item.label}
          </Link>
        ))}
        <form action={sair} className="ml-auto">
          <button className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-alerta transition hover:bg-[rgba(229,86,78,0.12)]">
            Sair
          </button>
        </form>
      </nav>
      <main>{children}</main>
    </div>
  );
}
