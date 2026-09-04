"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { atualizarStatus, alternarInscricoes, salvarPagarDepois, salvarAcordo, marcarComoPago, reverterPago } from "../actions";
import { baixarPlanilha } from "@/lib/planilha";

type Status = "pago" | "pendente" | "pagar_depois" | "desistiu";
type Sexo = "masculino" | "feminino" | null;

export interface EncRow {
  id: string;
  nome: string;
  cpf: string | null;
  nascimento: string | null;
  sexo: Sexo;
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
// pendente -> confirma se vai ao encontro; pagar depois -> lembra do prazo
// combinado; pago -> manda o QR Code de acesso.
// Sem emojis: alguns clientes de WhatsApp (ex.: Web sem fonte de emoji)
// renderizam como losango. Negrito com *asterisco* funciona em todos.
const contatoHref = (e: {
  nome: string;
  whatsapp: string | null;
  status: Status;
  pagar_depois_data?: string | null;
}) => {
  const base = waLink(e.whatsapp ?? "");
  const primeiro = e.nome.trim().split(/\s+/)[0];
  const link = `${APP_URL}/pagamento?doc=${e.whatsapp ?? ""}`;

  let msg = "";
  if (e.status === "pendente") {
    // confirma a intenção ANTES de cobrar: a liderança precisa saber quem
    // realmente vai para liberar a vaga de quem desistiu
    msg =
      `Olá, ${primeiro}!\n\n` +
      `Recebemos a sua inscrição no *Submergidos*, mas ela ainda está *pendente* — a vaga só é confirmada com o pagamento.\n\n` +
      `Antes de qualquer coisa, queremos confirmar com você: *você vai ao encontro?*\n\n` +
      `*1) SIM, eu vou* — garanta a sua vaga por aqui:\n${link}\n\n` +
      `*2) Não vou desta vez* — é só responder esta mensagem que a gente atualiza o seu cadastro e libera a vaga para outra pessoa.\n\n` +
      `Vai ser um final de semana *extraordinário*, e a gente quer muito você com a gente pra mergulhar no próximo nível!`;
  } else if (e.status === "pagar_depois") {
    // lembra do acordo, citando a data combinada quando houver
    const prazo = e.pagar_depois_data
      ? `até *${fmtNasc(e.pagar_depois_data)}*`
      : "nos próximos dias";
    msg =
      `Olá, ${primeiro}!\n\n` +
      `Passando para lembrar do nosso combinado sobre a sua inscrição no *Submergidos*: ficou de acertar o pagamento ${prazo}.\n\n` +
      `A sua vaga está reservada até lá — assim que o pagamento entrar, ela fica confirmada de vez.\n\n` +
      `Você pode pagar por aqui:\n${link}\n\n` +
      `Se alguma coisa mudou e você não puder ir, é só responder esta mensagem que a gente ajusta o seu cadastro.`;
  } else if (e.status === "pago") {
    msg =
      `Olá, ${primeiro}!\n\n` +
      `Boa notícia: o seu pagamento foi confirmado e a sua vaga no *Submergidos* está garantida!\n\n` +
      `Vai ser um final de semana *extraordinário*. Acesse aqui o seu *QR Code* de acesso ao encontro: ${link}`;
  }

  return msg ? `${base}?text=${encodeURIComponent(msg)}` : base;
};

export function EncontristasView({
  encontristas,
  celulas,
  inscricoesBloqueadas,
  admin,
}: {
  encontristas: EncRow[];
  celulas: Celula[];
  inscricoesBloqueadas: boolean;
  admin: boolean;
}) {
  const [aba, setAba] = useState<"todos" | "feminino" | "masculino">("todos");
  const [celulaId, setCelulaId] = useState<string>("");
  const [filtroStatus, setFiltroStatus] = useState<Status[]>([]);
  const [busca, setBusca] = useState("");
  const [expandido, setExpandido] = useState<string | null>(null);
  const [bloqueadas, setBloqueadas] = useState(inscricoesBloqueadas);
  const [dataDrafts, setDataDrafts] = useState<Record<string, string>>({});
  const [editando, setEditando] = useState<Record<string, boolean>>({});
  const [acordoDrafts, setAcordoDrafts] = useState<Record<string, string>>({});
  const [editandoAcordo, setEditandoAcordo] = useState<Record<string, boolean>>({});
  const [mostrarAcordo, setMostrarAcordo] = useState<Record<string, boolean>>({});
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

  // ---- lista filtrada + contagens ----
  // Cada contagem ignora o SEU PRÓPRIO filtro: o número mostrado numa opção
  // diz quantas linhas ela traz se for marcada — e não quantas sobram depois
  // de aplicá-la (que seria sempre igual à lista, e portanto inútil).
  const { lista, porSexo, porStatus } = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const porCelula = (e: EncRow) => !celulaId || e.celula === celulaId;
    const porBusca = (e: EncRow) => !q || e.nome.toLowerCase().includes(q);
    const casaStatus = (e: EncRow) =>
      filtroStatus.length === 0 || filtroStatus.includes(e.status);
    const casaSexo = (e: EncRow) => aba === "todos" || e.sexo === aba;

    const baseSexo = rows.filter((e) => porCelula(e) && porBusca(e) && casaStatus(e));
    const baseStatus = rows.filter((e) => porCelula(e) && porBusca(e) && casaSexo(e));

    return {
      lista: baseSexo.filter(casaSexo),
      porSexo: {
        todos: baseSexo.length,
        feminino: baseSexo.filter((e) => e.sexo === "feminino").length,
        masculino: baseSexo.filter((e) => e.sexo === "masculino").length,
      },
      porStatus: Object.fromEntries(
        (Object.keys(STATUS_LABEL) as Status[]).map((st) => [
          st,
          baseStatus.filter((e) => e.status === st).length,
        ]),
      ) as Record<Status, number>,
    };
  }, [rows, aba, celulaId, filtroStatus, busca]);

  // quem entrou sem sexo informado não aparece em nenhuma das duas abas
  const semSexoInformado = porSexo.todos - porSexo.feminino - porSexo.masculino;

  const temFiltro =
    aba !== "todos" || celulaId !== "" || filtroStatus.length > 0 || busca.trim() !== "";

  const alternarStatus = (st: Status) =>
    setFiltroStatus((prev) => (prev.includes(st) ? prev.filter((x) => x !== st) : [...prev, st]));

  const mudarStatus = (id: string, status: Status) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    startTransition(async () => {
      await atualizarStatus(id, status);
    });
  };

  // marca como "pago" — só admin. Atualiza otimista e persiste via action
  // (que revalida a permissão no servidor). Reverte a UI se o servidor recusar.
  const marcarPago = (id: string) => {
    const anterior = rows.find((r) => r.id === id)?.status ?? "pendente";
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: "pago" } : r)));
    startTransition(async () => {
      const res = await marcarComoPago(id);
      if (!res.ok) {
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: anterior } : r)));
        alert(res.erro ?? "Não foi possível marcar como pago.");
      }
    });
  };

  // reverte um "pago" para "pendente" — só admin. Confirma antes (evita clique
  // acidental num registro já confirmado). Reverte a UI se o servidor recusar.
  const reverterPagamento = (id: string) => {
    if (!confirm("Reverter este pagamento para PENDENTE?")) return;
    const anterior = rows.find((r) => r.id === id)?.status ?? "pago";
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: "pendente" } : r)));
    startTransition(async () => {
      const res = await reverterPago(id);
      if (!res.ok) {
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status: anterior } : r)));
        alert(res.erro ?? "Não foi possível reverter o pagamento.");
      }
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

  // salva o valor de acordo (null quando vazio → volta ao valor padrão)
  const salvarAcordoLocal = (id: string, valor: number | null) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, acordo_valor: valor } : r)));
    startTransition(async () => {
      await salvarAcordo(id, valor);
    });
  };

  const toggleInscricoes = () => {
    const novo = !bloqueadas;
    setBloqueadas(novo);
    startTransition(async () => {
      await alternarInscricoes(novo);
    });
  };

  const exportarPlanilha = () => {
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
    baixarPlanilha({ arquivo: "encontristas-submergidos", aba: "Encontristas", colunas: cab, linhas });
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
            <span className="ml-1.5 text-xs font-bold opacity-60">{porSexo[val]}</span>
          </button>
        ))}
      </div>

      {semSexoInformado > 0 && (
        <p className="-mt-2 text-center text-[11px] text-corrente">
          {semSexoInformado} sem sexo informado — não aparece em Mulheres nem em Homens.
        </p>
      )}

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

      {/* status: múltipla seleção (nenhum marcado = todos) */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-wide text-corrente">
            Status <span className="normal-case">— marque quantos quiser</span>
          </p>
          {filtroStatus.length > 0 && (
            <button
              onClick={() => setFiltroStatus([])}
              className="text-[11px] font-semibold text-raso underline underline-offset-2"
            >
              Limpar
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(STATUS_LABEL) as Status[]).map((st) => {
            const ativo = filtroStatus.includes(st);
            return (
              <button
                key={st}
                onClick={() => alternarStatus(st)}
                aria-pressed={ativo}
                className="flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition active:scale-[0.97]"
                style={
                  ativo
                    ? {
                        borderColor: STATUS_COR[st],
                        color: STATUS_COR[st],
                        background: `${STATUS_COR[st]}1a`,
                      }
                    : { borderColor: "rgba(164,214,232,0.18)", color: "#416a87" }
                }
              >
                {STATUS_LABEL[st]}
                <span className="opacity-70">{porStatus[st]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* exportar */}
      <button
        onClick={exportarPlanilha}
        className="w-full rounded-control py-3 text-sm font-semibold text-white transition active:scale-[0.98]" style={{ background: "#12b5a6" }}
      >
        Exportar Excel
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

      {/* quantos o filtro atual traz */}
      <p className="text-xs text-corrente">
        <span className="font-display text-base font-extrabold text-luz">{lista.length}</span>{" "}
        {lista.length === 1 ? "encontrista" : "encontristas"}
        {temFiltro && ` de ${rows.length}`}
      </p>

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
            const editandoAcordo_ = editandoAcordo[e.id] ?? e.acordo_valor == null;
            const acordoVal =
              acordoDrafts[e.id] ?? (e.acordo_valor != null ? String(e.acordo_valor) : "");
            // abre automático se já houver acordo salvo; senão, só quando clicar no botão
            const mostrarAcordoAtivo = mostrarAcordo[e.id] ?? e.acordo_valor != null;
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
                      <Campo label="Emergência" valor={e.emergencia ?? "—"} />
                      <Campo label="Medicamento" valor={e.medicamento ?? "Não"} />
                      <Campo label="Doença crônica" valor={e.doenca_cronica ?? "Não"} />
                    </div>



                    {/* mudar status — some quando pago (a pill + borda verde já bastam) */}
                    {e.status !== "pago" && (
                    <div>
                      <p className="mb-2 text-xs uppercase tracking-wide text-corrente">Status</p>
                      <div className="grid grid-cols-1 gap-2">
                        {/* Marcar como pago — só admin. Fica em destaque no topo. */}
                        {admin && (
                          <button
                            onClick={() => marcarPago(e.id)}
                            disabled={pending}
                            className="rounded-control py-2 text-xs font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
                            style={{ background: STATUS_COR.pago }}
                          >
                            Marcar como pago
                          </button>
                        )}
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
                        {/* Acordo: não é status — abre o campo de valor combinado */}
                        <button
                          onClick={() =>
                            setMostrarAcordo((d) => ({ ...d, [e.id]: !mostrarAcordoAtivo }))
                          }
                          disabled={pending}
                          className="rounded-control py-2 text-xs font-semibold transition"
                          style={
                            mostrarAcordoAtivo
                              ? { background: "#2ea77d", color: "#fff" }
                              : { border: "1px solid rgba(46,167,125,0.5)", color: "#2ea77d" }
                          }
                        >
                          Acordo{e.acordo_valor != null ? ` · R$ ${e.acordo_valor}` : ""}
                        </button>
                      </div>

                      {/* campo de acordo — só quando o botão Acordo está ativo */}
                      {mostrarAcordoAtivo && (
                        <div
                          className="mt-3 rounded-control border p-3"
                          style={{
                            borderColor: "rgba(46,167,125,0.4)",
                            background: "rgba(46,167,125,0.08)",
                          }}
                        >
                          <p
                            className="mb-2 text-[11px] uppercase tracking-wide"
                            style={{ color: "#2ea77d" }}
                          >
                            Acordo — valor combinado
                          </p>
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-corrente">
                                R$
                              </span>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0,00"
                                value={acordoVal}
                                disabled={!editandoAcordo_}
                                onChange={(ev) =>
                                  setAcordoDrafts((d) => ({ ...d, [e.id]: ev.target.value }))
                                }
                                className="w-full rounded-control border border-[rgba(164,214,232,0.18)] bg-[rgba(0,14,33,0.6)] py-2 pl-9 pr-3 text-sm text-luz outline-none focus:border-raso disabled:opacity-60"
                              />
                            </div>
                            {editandoAcordo_ ? (
                              <button
                                onClick={() => {
                                  const raw = acordoVal.trim().replace(",", ".");
                                  const num = raw === "" ? null : Number(raw);
                                  salvarAcordoLocal(
                                    e.id,
                                    num != null && !Number.isNaN(num) ? num : null,
                                  );
                                  setEditandoAcordo((d) => ({ ...d, [e.id]: false }));
                                }}
                                disabled={pending}
                                className="rounded-control px-4 py-2 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
                                style={{ background: "#2ea77d" }}
                              >
                                Salvar
                              </button>
                            ) : (
                              <button
                                onClick={() => setEditandoAcordo((d) => ({ ...d, [e.id]: true }))}
                                className="rounded-control border px-4 py-2 text-sm font-semibold transition active:scale-[0.98]"
                                style={{ borderColor: "#2ea77d", color: "#2ea77d" }}
                              >
                                Editar
                              </button>
                            )}
                          </div>
                        </div>
                      )}

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

                    {/* reverter pagamento — só admin, e só quando já está pago */}
                    {admin && e.status === "pago" && (
                      <button
                        onClick={() => reverterPagamento(e.id)}
                        disabled={pending}
                        className="w-full rounded-control border py-2 text-xs font-semibold transition active:scale-[0.98] disabled:opacity-50"
                        style={{ borderColor: "rgba(229,86,78,0.5)", color: "#e5564e" }}
                      >
                        Reverter para pendente
                      </button>
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
