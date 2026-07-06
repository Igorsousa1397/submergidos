"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { atualizarStatus, alternarInscricoes, salvarPagarDepois } from "../actions";

type Status = "pago" | "pendente" | "pagar_depois" | "desistiu";
type Sexo = "masculino" | "feminino" | null;

export interface EncRow {
  id: string;
  nome: string;
  cpf: string | null;
  nascimento: string | null;
  sexo: Sexo;
  camiseta: string | null;
  celula: string | null;
  status: Status;
  chegou: boolean;
  emergencia: string | null;
  whatsapp: string | null;
  medicamento: string | null;
  doenca_cronica: string | null;
  acordo_valor: number | null;
  pagar_depois_data: string | null;
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

// status que o admin pode setar à mão — "pago" NÃO entra aqui:
// o pago é confirmado exclusivamente pelo webhook do Mercado Pago.
const STATUS_MANUAL: Status[] = ["pendente", "pagar_depois", "desistiu"];

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

// monta o link do WhatsApp: limpa a máscara e prefixa 55 quando necessário
const waLink = (raw: string) => {
  const d = raw.replace(/\D/g, "");
  const num = d.startsWith("55") && d.length >= 12 ? d : `55${d}`;
  return `https://wa.me/${num}`;
};

// URL de produção do app (usada no link de pagamento enviado ao encontrista)
const APP_URL = "https://submergidos.vercel.app";

// link do WhatsApp com mensagem pronta conforme o status:
// pendente -> cobra o pagamento; pago -> manda o link do QR Code de acesso.
const contatoHref = (e: { nome: string; whatsapp: string | null; status: Status }) => {
  const base = waLink(e.whatsapp ?? "");
  const primeiro = e.nome.trim().split(/\s+/)[0];
  const link = `${APP_URL}/pagamento?doc=${e.whatsapp ?? ""}`;

  let msg = "";
  if (e.status === "pendente") {
    msg =
      `Olá, ${primeiro}! 🌊\n\n` +
      `Recebemos a sua inscrição no *Submergidos*! Só que ela ainda está *pendente* — a vaga só é confirmada depois do pagamento.\n\n` +
      `Vai ser um final de semana *extraordinário*, e a gente quer muito você com a gente pra mergulhar no próximo nível.\n\n` +
      `Garanta a sua vaga por aqui: ${link}`;
  } else if (e.status === "pago") {
    msg =
      `Olá, ${primeiro}! 🌊\n\n` +
      `Boa notícia: o seu pagamento foi confirmado e a sua vaga no *Submergidos* está garantida! 🙌\n\n` +
      `Vai ser um final de semana *extraordinário*. Acesse aqui o seu *QR Code* de acesso ao encontro: ${link}`;
  }

  return msg ? `${base}?text=${encodeURIComponent(msg)}` : base;
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
  const [dataDrafts, setDataDrafts] = useState<Record<string, string>>({});
  const [editando, setEditando] = useState<Record<string, boolean>>({});
  const [pending, startTransition] = useTransition();

  // fonte de verdade da UI: estado local, atualizado de forma otimista.
  // assim mudar status não precisa revalidar a rota (evita o flash da sidebar).
  const [rows, setRows] = useState<EncRow[]>(encontristas);
  useEffect(() => {
    setRows(encontristas);
  }, [encontristas]);

  // A tabela `celulas` está vazia; a célula vive como texto na coluna `celula`.
  // O filtro é montado a partir das células presentes nos cadastros
  // (e de nomes vindos da prop, caso a tabela venha a ser populada).
  const celulasPresentes = useMemo(() => {
    const nomes = new Set<string>();
    for (const c of celulas) if (c.nome) nomes.add(c.nome);
    for (const e of rows) if (e.celula) nomes.add(e.celula);
    return [...nomes].sort((a, b) => a.localeCompare(b));
  }, [rows, celulas]);

  // ---- stats (total geral e por status, sobre TODOS, não filtrado) ----
  const stats = useMemo(() => {
    const s = { total: 0, pago: 0, pendente: 0, pagar_depois: 0, desistiu: 0 };
    for (const e of rows) {
      s.total += 1;
      s[e.status] += 1;
    }
    return s;
  }, [rows]);

  // ---- lista filtrada ----
  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return rows.filter((e) => {
      if (aba !== "todos" && e.sexo !== aba) return false;
      if (celulaId && e.celula !== celulaId) return false;
      if (q && !e.nome.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, aba, celulaId, busca]);

  const mudarStatus = (id: string, status: Status) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    startTransition(async () => {
      await atualizarStatus(id, status);
    });
  };

  // salva a data combinada de "pagar depois" (grava a data e mantém o status)
  const salvarData = (id: string, data: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, status: "pagar_depois", pagar_depois_data: data || null } : r,
      ),
    );
    startTransition(async () => {
      await salvarPagarDepois(id, data);
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
      e.celula ?? "Sem célula",
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
        {celulasPresentes.map((nome) => (
          <option key={nome} value={nome}>
            {nome}
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
            const celula = e.celula || "Não tenho célula";
            // edição do campo de data: começa liberado se ainda não há data salva
            const editando_ = editando[e.id] ?? !e.pagar_depois_data;
            const dataVal = dataDrafts[e.id] ?? (e.pagar_depois_data ?? "");
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
                      {e.status === "pagar_depois" && e.pagar_depois_data
                        ? ` · pagar até ${fmtNasc(e.pagar_depois_data)}`
                        : ""}
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

                    {/* mudar status — some quando pago (a pill + borda verde já bastam) */}
                    {e.status !== "pago" && (
                    <div>
                      <p className="mb-2 text-xs uppercase tracking-wide text-corrente">Status</p>
                      <div className="grid grid-cols-1 gap-2">
                        {STATUS_MANUAL.map((st) => (
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

                      {/* campo de data — só quando "Pagar depois" está ativo */}
                      {e.status === "pagar_depois" && (
                        <div
                          className="mt-3 rounded-control border p-3"
                          style={{
                            borderColor: "rgba(224,162,60,0.4)",
                            background: "rgba(224,162,60,0.08)",
                          }}
                        >
                          <p
                            className="mb-2 text-[11px] uppercase tracking-wide"
                            style={{ color: "#e0a23c" }}
                          >
                            Data combinada para pagamento
                          </p>
                          <div className="flex gap-2">
                            <input
                              type="date"
                              value={dataVal}
                              disabled={!editando_}
                              onChange={(ev) =>
                                setDataDrafts((d) => ({ ...d, [e.id]: ev.target.value }))
                              }
                              style={{ colorScheme: "dark" }}
                              className="flex-1 rounded-control border border-[rgba(164,214,232,0.18)] bg-[rgba(0,14,33,0.6)] px-3 py-2 text-sm text-luz outline-none focus:border-raso disabled:opacity-60"
                            />
                            {editando_ ? (
                              <button
                                onClick={() => {
                                  salvarData(e.id, dataVal);
                                  setEditando((d) => ({ ...d, [e.id]: false }));
                                }}
                                disabled={pending || !dataVal}
                                className="rounded-control px-4 py-2 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
                                style={{ background: "#e0a23c" }}
                              >
                                Salvar
                              </button>
                            ) : (
                              <button
                                onClick={() => setEditando((d) => ({ ...d, [e.id]: true }))}
                                className="rounded-control border px-4 py-2 text-sm font-semibold transition active:scale-[0.98]"
                                style={{ borderColor: "#e0a23c", color: "#e0a23c" }}
                              >
                                Editar
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    )}

                    {/* entrar em contato (WhatsApp) — só se tiver número */}
                    {e.whatsapp && (
                      <a
                        href={contatoHref(e)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block w-full rounded-control border py-3 text-center text-sm font-semibold transition active:scale-[0.98]"
                        style={{ borderColor: "#12b5a6", color: "#12b5a6" }}
                      >
                        {e.status === "pago" ? "Reenviar QR-code" : "Entrar em contato"} — {e.whatsapp}
                      </a>
                    )}
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
