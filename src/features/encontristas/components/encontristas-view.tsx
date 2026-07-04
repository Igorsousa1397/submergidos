"use client";

import { useMemo, useState, useTransition } from "react";
import { atualizarStatus, alternarInscricoes } from "../actions";

type Status = "pago" | "pendente" | "pagar_depois" | "desistiu";
type Sexo = "masculino" | "feminino" | null;

export interface EncRow {
  id: string;
  nome: string;
  cpf: string | null;
  nascimento: string | null;
  sexo: Sexo;
  camiseta: string | null;
  celula_id: string | null;
  status: Status;
  chegou: boolean;
  emergencia: string | null;
  medicamento: string | null;
  doenca_cronica: string | null;
  acordo_valor: number | null;
  created_at: string | null;
}

export interface Celula {
  id: string;
  nome: string;
}

const STATUS_LABEL: Record<Status, string> = {
  pago: "Pago",
  pendente: "Pendente",
  pagar_depois: "Pagar depois",
  desistiu: "Desistiu",
};

// cor da borda esquerda do card por status
const STATUS_COR: Record<Status, string> = {
  pago: "#12b5a6",
  pendente: "#e5564e",
  pagar_depois: "#e0a23c",
  desistiu: "#6b7f95",
};

const fmtData = (iso: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const fmtNasc = (iso: string | null) => {
  if (!iso) return "—";
  // nascimento vem como YYYY-MM-DD (date), evita fuso
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
};

export function EncontristasView({
  encontristas,
  celulas,
  inscricoesBloqueadas,
}: {
  encontristas: EncRow[];
  celulas: Celula[];
  inscricoesBloqueadas: boolean;
}) {
  const [aba, setAba] = useState<"todos" | "feminino" | "masculino">("todos");
  const [celulaId, setCelulaId] = useState<string>("");
  const [busca, setBusca] = useState("");
  const [expandido, setExpandido] = useState<string | null>(null);
  const [bloqueadas, setBloqueadas] = useState(inscricoesBloqueadas);
  const [pending, startTransition] = useTransition();

  const nomeCelula = useMemo(
    () => new Map(celulas.map((c) => [c.id, c.nome])),
    [celulas],
  );

  // ---- stats (total geral e por status, sobre TODOS, não filtrado) ----
  const stats = useMemo(() => {
    const s = { total: 0, pago: 0, pendente: 0, pagar_depois: 0, desistiu: 0 };
    for (const e of encontristas) {
      s.total += 1;
      s[e.status] += 1;
    }
    return s;
  }, [encontristas]);

  // ---- lista filtrada ----
  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return encontristas.filter((e) => {
      if (aba !== "todos" && e.sexo !== aba) return false;
      if (celulaId && e.celula_id !== celulaId) return false;
      if (q && !e.nome.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [encontristas, aba, celulaId, busca]);

  const mudarStatus = (id: string, status: Status) => {
    startTransition(async () => {
      await atualizarStatus(id, status);
    });
  };

  const toggleInscricoes = () => {
    const novo = !bloqueadas;
    setBloqueadas(novo);
    startTransition(async () => {
      await alternarInscricoes(novo);
    });
  };

  const exportarCSV = () => {
    const cab = ["Nome", "CPF", "Nascimento", "Sexo", "Célula", "Status", "Check-in"];
    const linhas = lista.map((e) => [
      e.nome,
      e.cpf ?? "",
      fmtNasc(e.nascimento),
      e.sexo ?? "",
      e.celula_id ? nomeCelula.get(e.celula_id) ?? "" : "Sem célula",
      STATUS_LABEL[e.status],
      e.chegou ? "Sim" : "Não",
    ]);
    const csv = [cab, ...linhas]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `encontristas-submergidos.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const cardCls = "rounded-card border border-[rgba(164,214,232,0.12)] bg-[rgba(0,14,33,0.5)]";

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      {/* total geral */}
      <div className={`${cardCls} p-5 text-center`}>
        <p className="font-display text-4xl font-extrabold text-luz">{stats.total}</p>
        <p className="mt-1 text-xs uppercase tracking-widest text-corrente">Total Geral</p>
      </div>

      {/* 4 cards coloridos */}
      <div className="grid grid-cols-2 gap-3">
        {([
          ["pago", "Pagos"],
          ["pendente", "Pendentes"],
          ["pagar_depois", "Pagar Dep."],
          ["desistiu", "Desistência"],
        ] as [Status, string][]).map(([st, label]) => (
          <div
            key={st}
            className={`${cardCls} p-4`}
            style={{ borderLeft: `3px solid ${STATUS_COR[st]}` }}
          >
            <p className="font-display text-2xl font-extrabold text-luz">{stats[st]}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-corrente">{label}</p>
          </div>
        ))}
      </div>

      {/* abas de sexo */}
      <div className="flex gap-2">
        {([
          ["todos", "Todos"],
          ["feminino", "Mulheres"],
          ["masculino", "Homens"],
        ] as ["todos" | "feminino" | "masculino", string][]).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setAba(val)}
            className={`flex-1 rounded-control py-2 text-sm font-semibold transition ${
              aba === val
                ? "font-bold"
                : "border border-[rgba(164,214,232,0.18)] text-corrente hover:text-luz"
            }`}
            style={
              aba === val ? { background: "#dcf1f8", color: "#00060f" } : undefined
            }
          >
            {label}
          </button>
        ))}
      </div>

      {/* filtro de célula */}
      <select
        value={celulaId}
        onChange={(e) => setCelulaId(e.target.value)}
        className="w-full rounded-control border border-[rgba(164,214,232,0.18)] bg-[rgba(0,14,33,0.6)] px-3 py-3 text-sm text-luz outline-none focus:border-raso"
      >
        <option value="">Todas as células</option>
        {celulas.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </select>

      {/* exportar */}
      <button
        onClick={exportarCSV}
        className="w-full rounded-control py-3 text-sm font-semibold text-white transition active:scale-[0.98]" style={{ background: "#12b5a6" }}
      >
        Exportar Excel (CSV)
      </button>

      {/* toggle inscrições */}
      <div className={`${cardCls} flex items-center justify-between p-4`}>
        <div>
          <p className="text-sm font-semibold text-luz">
            {bloqueadas ? "Inscrições encerradas" : "Inscrições abertas"}
          </p>
          <p className="text-xs text-corrente">
            Toque para {bloqueadas ? "reabrir" : "encerrar"} novas inscrições
          </p>
        </div>
        <button
          onClick={toggleInscricoes}
          disabled={pending}
          aria-label="Alternar inscrições"
          className={`relative h-7 w-12 rounded-full transition ${
            bloqueadas ? "bg-white/15" : ""
          }`}
          style={bloqueadas ? undefined : { background: "#12b5a6" }}
        >
          <span
            className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
              bloqueadas ? "left-1" : "left-6"
            }`}
          />
        </button>
      </div>

      {/* busca */}
      <input
        placeholder="Buscar por nome..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="w-full rounded-control border border-[rgba(164,214,232,0.18)] bg-[rgba(0,14,33,0.6)] px-3 py-3 text-sm text-luz outline-none placeholder:text-corrente focus:border-raso"
      />

      {/* lista */}
      <div className="space-y-2">
        {lista.length === 0 ? (
          <p className="py-8 text-center text-sm text-corrente">Nenhum encontrista encontrado.</p>
        ) : (
          lista.map((e) => {
            const aberto = expandido === e.id;
            const celula = e.celula_id ? nomeCelula.get(e.celula_id) ?? "—" : "Não tenho célula";
            return (
              <div
                key={e.id}
                className={cardCls}
                style={{ borderLeft: `3px solid ${STATUS_COR[e.status]}` }}
              >
                {/* cabeçalho do card (clicável) */}
                <button
                  onClick={() => setExpandido(aberto ? null : e.id)}
                  className="flex w-full items-center justify-between gap-2 p-4 text-left"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-luz">{e.nome}</p>
                    <p className="truncate text-xs text-corrente">
                      {celula} · {fmtData(e.created_at)}
                    </p>
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold"
                    style={{ color: STATUS_COR[e.status], background: `${STATUS_COR[e.status]}1a` }}
                  >
                    {STATUS_LABEL[e.status]}
                  </span>
                </button>

                {/* detalhes expandidos */}
                {aberto && (
                  <div className="space-y-4 border-t border-[rgba(164,214,232,0.1)] px-4 py-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <Campo label="CPF" valor={e.cpf ?? "—"} />
                      <Campo label="Nascimento" valor={fmtNasc(e.nascimento)} />
                      <Campo label="Camiseta" valor={e.camiseta ?? "—"} />
                      <Campo label="Emergência" valor={e.emergencia ?? "—"} />
                      <Campo label="Medicamento" valor={e.medicamento ?? "Não"} />
                      <Campo label="Doença crônica" valor={e.doenca_cronica ?? "Não"} />
                    </div>

                    {/* mudar status */}
                    <div>
                      <p className="mb-2 text-xs uppercase tracking-wide text-corrente">Status</p>
                      <div className="grid grid-cols-2 gap-2">
                        {(Object.keys(STATUS_LABEL) as Status[]).map((st) => (
                          <button
                            key={st}
                            onClick={() => mudarStatus(e.id, st)}
                            disabled={pending}
                            className={`rounded-control py-2 text-xs font-semibold transition ${
                              e.status === st
                                ? "text-white"
                                : "border border-[rgba(164,214,232,0.18)] text-corrente hover:text-luz"
                            }`}
                            style={e.status === st ? { background: STATUS_COR[st] } : undefined}
                          >
                            {STATUS_LABEL[st]}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-corrente">{label}</p>
      <p className="text-luz">{valor}</p>
    </div>
  );
}
