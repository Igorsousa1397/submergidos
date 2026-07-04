import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/features/dashboard/dashboard-shell";
import { sair } from "./actions";

// Shell do dashboard. Protege as rotas internas e carrega o perfil 1x.
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

  const { data: perfil } = await supabase
    .from("profiles")
    .select("nome, role")
    .eq("id", user.id)
    .single();

  const nome = perfil?.nome?.split(" ")[0] ?? "servo";
  const role = perfil?.role ?? "servo";

  return (
    <DashboardShell nome={nome} role={role} sair={sair}>
      {children}
    </DashboardShell>
  );
}
