import { STATUS_ENCONTRISTA } from "@/lib/constants";

interface Props {
  resumo: {
    qtd_pagos: number;
    qtd_pagar_depois: number;
    qtd_pendentes: number;
    qtd_desistencias: number;
    total_geral: number;
  };
}

// Card "Total Geral" full-width + grid 2x2 (igual ao original).
export function EncontristasStats({ resumo }: Props) {
  const grid = [
    { label: STATUS_ENCONTRISTA.pago.label, valor: resumo.qtd_pagos, bg: STATUS_ENCONTRISTA.pago.bg },
    { label: STATUS_ENCONTRISTA.pendente.label, valor: resumo.qtd_pendentes, bg: STATUS_ENCONTRISTA.pendente.bg },
    { label: STATUS_ENCONTRISTA.pagar_depois.label, valor: resumo.qtd_pagar_depois, bg: STATUS_ENCONTRISTA.pagar_depois.bg },
    { label: STATUS_ENCONTRISTA.desistiu.label, valor: resumo.qtd_desistencias, bg: STATUS_ENCONTRISTA.desistiu.bg },
  ];

  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-slate-900 px-5 py-4 text-white">
        <p className="text-sm text-slate-300">Total Geral</p>
        <p className="text-3xl font-semibold">{resumo.total_geral}</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {grid.map((c) => (
          <div key={c.label} className={`rounded-xl px-4 py-3 ${c.bg}`}>
            <p className="text-xs font-medium text-slate-700">{c.label}</p>
            <p className="text-2xl font-semibold text-slate-900">{c.valor}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
