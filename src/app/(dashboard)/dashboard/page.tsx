import { createClient } from "@/lib/supabase/server";
import { getResumoFinanceiro } from "@/features/encontristas/queries";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil } = await supabase
    .from("profiles")
    .select("nome, role")
    .eq("id", user!.id)
    .single();

  const resumo = await getResumoFinanceiro();

  const cards = [
    { label: "Total de encontristas", valor: resumo.total_geral },
    { label: "Pagos", valor: resumo.qtd_pagos },
    { label: "Pendentes", valor: resumo.qtd_pendentes },
    { label: "Pagar depois", valor: resumo.qtd_pagar_depois },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <header>
        <h1 className="font-display text-2xl font-extrabold text-profundo">
          Olá, {perfil?.nome?.split(" ")[0] ?? "servo"}
        </h1>
        <p className="text-sm text-corrente">Painel do evento Submergidos</p>
      </header>

      <div className="grid grid-cols-2 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-card bg-white p-4 ring-1 ring-[#E1ECF3]">
            <p className="text-xs text-corrente">{c.label}</p>
            <p className="font-display text-3xl font-extrabold text-profundo">{c.valor}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
