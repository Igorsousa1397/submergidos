import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sair } from "./actions";

// Shell do dashboard. Carrega o perfil 1x e protege as rotas internas.
const NAV = [
  { href: "/dashboard", label: "Início" },
  { href: "/encontristas", label: "Encontristas" },
  { href: "/check-in", label: "Check-in" },
  { href: "/quartos", label: "Quartos" },
  { href: "/escalas", label: "Escalas" },
  { href: "/servos", label: "Servos" },
  { href: "/cartas", label: "Cartas" },
  { href: "/ocorrencias", label: "Ocorrências" },
  { href: "/onibus", label: "Ônibus" },
  { href: "/avisos", label: "Avisos" },
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
    <div className="min-h-screen bg-slate-50">
      <nav className="sticky top-0 z-10 flex gap-1 overflow-x-auto border-b border-[#E1ECF3] bg-white px-3 py-2">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-corrente hover:bg-bruma"
          >
            {item.label}
          </Link>
        ))}
        <form action={sair} className="ml-auto">
          <button className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-alerta hover:bg-alerta-bg">
            Sair
          </button>
        </form>
      </nav>
      <main>{children}</main>
    </div>
  );
}
