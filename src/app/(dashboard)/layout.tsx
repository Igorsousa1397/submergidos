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
    .select("nome, role, primeiro, aprovado, telas_extra, roles(telas)")
    .eq("id", user.id)
    .single();

  // auto-cadastro ainda não aprovado pelo admin: fica na sala de espera
  if (perfil && !perfil.aprovado) redirect("/aguardando-aprovacao");
  // servo criado pelo admin com senha temporária: força a troca antes de entrar
  if (perfil?.primeiro) redirect("/primeiro-acesso");

  const nome = perfil?.nome?.split(" ")[0] ?? "servo";
  const role = perfil?.role ?? "servo";

  // telas de gestão concedidas no Back Office (perfil + extras individuais);
  // entram no menu do servo como itens adicionais
  const telasRole = (perfil?.roles as unknown as { telas: string[] } | null)?.telas ?? [];
  const telasLiberadas = [...new Set([...telasRole, ...(perfil?.telas_extra ?? [])])];

  return (
    <DashboardShell nome={nome} role={role} telasLiberadas={telasLiberadas} sair={sair}>
      {children}
    </DashboardShell>
  );
}
