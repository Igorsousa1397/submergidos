"use client";

import { useState, useTransition } from "react";
import { STATUS_ENCONTRISTA, SEXO_LABEL } from "@/lib/constants";
import { atualizarStatus } from "@/features/encontristas/actions";
import type { Database } from "@/lib/database.types";
import type { EncontristaStatus } from "@/lib/db-types";

type Encontrista = Database["public"]["Tables"]["encontristas"]["Row"];

// Card expansível: clique abre detalhes (CPF, nascimento, emergência, etc).
export function EncontristaCard({ enc }: { enc: Encontrista }) {
  const [aberto, setAberto] = useState(false);
  const [pending, startTransition] = useTransition();
  const s = STATUS_ENCONTRISTA[enc.status];

  function mudarStatus(novo: EncontristaStatus) {
    startTransition(() => {
      atualizarStatus(enc.id, novo);
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white">
      <button
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <span className="font-medium text-slate-900">{enc.nome}</span>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${s.bg} ${s.cor}`}>
          {s.label}
        </span>
      </button>

      {aberto && (
        <div className="space-y-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">
            <Campo k="CPF" v={enc.cpf} />
            <Campo k="Nascimento" v={enc.nascimento} />
            <Campo k="Camiseta" v={enc.camiseta} />
            <Campo k="Sexo" v={enc.sexo ? SEXO_LABEL[enc.sexo] : null} />
            <Campo k="Emergência" v={enc.emergencia} />
            <Campo k="Medicamento" v={enc.medicamento} />
            <Campo k="Doença crônica" v={enc.doenca_cronica} />
          </dl>

          <div className="flex flex-wrap gap-2 pt-1">
            {(Object.keys(STATUS_ENCONTRISTA) as EncontristaStatus[]).map((st) => (
              <button
                key={st}
                disabled={pending || st === enc.status}
                onClick={() => mudarStatus(st)}
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 disabled:opacity-40 hover:bg-slate-50"
              >
                {STATUS_ENCONTRISTA[st].label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Campo({ k, v }: { k: string; v: string | null }) {
  return (
    <>
      <dt className="text-slate-400">{k}</dt>
      <dd className="text-slate-700">{v || "—"}</dd>
    </>
  );
}
