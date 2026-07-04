import { getEncontristas, getResumoFinanceiro } from "@/features/encontristas/queries";
import { EncontristasStats } from "@/features/encontristas/components/encontristas-stats";
import { EncontristaCard } from "@/features/encontristas/components/encontrista-card";

// Server Component: busca no servidor (RLS aplicado), passa pros componentes.
export default async function EncontristasPage() {
  const [encontristas, resumo] = await Promise.all([
    getEncontristas(),
    getResumoFinanceiro(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-5 p-4">
      <header>
        <h1 className="text-xl font-semibold text-slate-900">Encontristas</h1>
        <p className="text-sm text-slate-500">{encontristas.length} no total</p>
      </header>

      <EncontristasStats resumo={resumo} />

      <div className="space-y-2">
        {encontristas.map((enc) => (
          <EncontristaCard key={enc.id} enc={enc} />
        ))}
      </div>
    </div>
  );
}
