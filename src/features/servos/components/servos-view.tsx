"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Plus, X, Copy, Check, Search } from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";
import {
  alternarAtivo,
  abonarServo,
  salvarServoPagarDepois,
  removerServoPagarDepois,
  marcarServoPago,
  reverterServoPago,
  salvarDataLimitePagamento,
  criarServo,
  aprovarServo,
  recusarServo,
} from "../actions";
import type { ServoRow, RoleInfo, ServoPagamento } from "../queries";

type Sexo = "masculino" | "feminino";

const OK = "#12b5a6";
const ALERTA = "#e5564e";
const AZUL = "#0a84ff";
const CINZA = "#8e8e93";
const AVISO = "#e0a23c";

const cardCls = "rounded-card border border-[rgba(164,214,232,0.12)] bg-[rgba(0,14,33,0.5)]";
const inputCls =
  "w-full rounded-control border border-[rgba(164,214,232,0.18)] bg-[rgba(0,14,33,0.6)] px-3 py-2.5 text-sm text-luz outline-none placeholder:text-corrente focus:border-raso";

const PAG_LABEL: Record<ServoPagamento, string> = {
  pendente: "Pendente",
  pago: "Pago",
  abonado: "Abonado",
  pagar_depois: "Pagar depois",
};
const PAG_COR: Record<ServoPagamento, string> = {
  pendente: ALERTA,
  pago: OK,
  abonado: CINZA,
  pagar_depois: AZUL,
};

// Ordem de exibição por perfil (regra do original).
const ordemPerfil = (role: string) => {
  if (role === "pastor") return 0;
  if (role === "pastor_auxiliar") return 1;
  if (role === "lider_geral") return 2;
  if (role.startsWith("lider_") && role !== "lider_celula") return 3;
  if (role === "lider_celula") return 4;
  if (role === "staff") return 5;
  if (role === "servo") return 6;
  if (role === "cozinha") return 7;
  return 8;
};

// Perfis oferecidos no cadastro (líderes são promovidos depois, no Back Office).
const ROLES_CADASTRO = ["pastor", "pastor_auxiliar", "cozinha", "staff", "servo"];

const fmtData = (iso: string | null) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
};

const maskCpf = (v: string) =>
  v
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");

interface FormNovo {
  nome: string;
  email: string;
  cpf: string;
  nascimento: string;
  sexo: Sexo | "";
  role: string;
}
const FORM_VAZIO: FormNovo = { nome: "", email: "", cpf: "", nascimento: "", sexo: "", role: "servo" };

export function ServosView({
  servos,
  roles,
  dataLimitePagamento,
  admin,
}: {
  servos: ServoRow[];
  roles: RoleInfo[];
  dataLimitePagamento: string | null;
  admin: boolean;
}) {
  const [rows, setRows] = useState<ServoRow[]>(servos);
  useEffect(() => setRows(servos), [servos]);

  const [busca, setBusca] = useState("");
  const [aba, setAba] = useState<"todos" | Sexo>("todos");
  const [fPerfil, setFPerfil] = useState("todos");
  const [fStatus, setFStatus] = useState("todos");
  const [expandido, setExpandido] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const [pending, startTransition] = useTransition();

  // form de novo servo
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState<FormNovo>(FORM_VAZIO);
  const [senhaGerada, setSenhaGerada] = useState<{ nome: string; senha: string } | null>(null);
  const [copiado, setCopiado] = useState(false);

  // data limite
  const [dataLimite, setDataLimite] = useState(dataLimitePagamento ?? "");
  const [editandoData, setEditandoData] = useState(false);

  // drafts do "pagar depois" por servo
  const [pdData, setPdData] = useState<Record<string, string>>({});
  const [pdObs, setPdObs] = useState<Record<string, string>>({});
  const [pdAberto, setPdAberto] = useState<Record<string, boolean>>({});

  const rolePorSlug = useMemo(() => new Map(roles.map((r) => [r.slug, r])), [roles]);
  const isIsentoPorPerfil = (u: ServoRow) => rolePorSlug.get(u.role)?.isento_pagamento ?? false;

  // ---- stats (globais, como no original: ignoram filtros e busca) ----
  const stats = useMemo(() => {
    const base = rows.filter((u) => u.nome);
    const inativos = base.filter((u) => !u.ativo).length;
    const ativos = base.filter((u) => u.ativo);
    // abonado por perfil tem precedência sobre "pago"
    const pagos = ativos.filter((u) => !isIsentoPorPerfil(u) && u.pagamento === "pago").length;
    const abonados = ativos.filter((u) => isIsentoPorPerfil(u) || u.pagamento === "abonado").length;
    const pagarDepois = ativos.filter(
      (u) => !isIsentoPorPerfil(u) && u.pagamento === "pagar_depois",
    ).length;
    const pendentes = ativos.length - pagos - abonados - pagarDepois;
    const aguardando = base.filter((u) => !u.aprovado).length;
    return { total: base.length, pagos, pendentes, abonados, pagarDepois, inativos, aguardando };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, roles]);

  // ---- lista filtrada ----
  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return rows
      .filter((u) => {
        if (!u.nome) return false;
        if (q && !u.nome.toLowerCase().includes(q)) return false;
        if (aba !== "todos" && u.sexo !== aba) return false;

        if (fPerfil === "lider" && !u.role.startsWith("lider_")) return false;
        else if (fPerfil === "pastor" && u.role !== "pastor" && u.role !== "pastor_auxiliar")
          return false;
        else if (["servo", "cozinha", "staff"].includes(fPerfil) && u.role !== fPerfil)
          return false;

        if (fStatus === "pagos" && u.pagamento !== "pago") return false;
        if (fStatus === "pendentes" && (u.pagamento !== "pendente" || isIsentoPorPerfil(u) || !u.ativo))
          return false;
        if (fStatus === "abonados" && !(u.pagamento === "abonado" || isIsentoPorPerfil(u)))
          return false;
        if (fStatus === "pagar_depois" && u.pagamento !== "pagar_depois") return false;
        if (fStatus === "ativos" && !u.ativo) return false;
        if (fStatus === "inativos" && u.ativo) return false;
        if (fStatus === "primeiro_acesso" && !u.primeiro) return false;
        if (fStatus === "aguardando" && u.aprovado) return false;
        return true;
      })
      .sort(
        (a, b) =>
          ordemPerfil(a.role) - ordemPerfil(b.role) ||
          a.nome.localeCompare(b.nome, "pt-BR"),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, busca, aba, fPerfil, fStatus, roles]);

  // roda action com atualização otimista + rollback
  const rodar = (
    id: string,
    patch: Partial<ServoRow>,
    fn: () => Promise<{ ok: boolean; erro?: string }>,
  ) => {
    setErro("");
    const anterior = rows.find((r) => r.id === id);
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) {
        if (anterior) setRows((prev) => prev.map((r) => (r.id === id ? anterior : r)));
        setErro(res.erro ?? "Não foi possível salvar.");
      }
    });
  };

  const adicionar = () => {
    setErro("");
    startTransition(async () => {
      const res = await criarServo({
        nome: form.nome,
        email: form.email,
        cpf: form.cpf,
        nascimento: form.nascimento,
        sexo: form.sexo,
        role: form.role,
      });
      if (!res.ok) return setErro(res.erro ?? "Não foi possível criar o servo.");
      setSenhaGerada({ nome: form.nome.trim(), senha: res.senhaTemporaria });
      setForm(FORM_VAZIO);
      setMostrarForm(false);
    });
  };

  const copiarSenha = async () => {
    if (!senhaGerada) return;
    await navigator.clipboard.writeText(senhaGerada.senha);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const salvarData = () => {
    setErro("");
    startTransition(async () => {
      const res = await salvarDataLimitePagamento(dataLimite || null);
      if (!res.ok) setErro(res.erro ?? "Não foi possível salvar a data.");
      else setEditandoData(false);
    });
  };

  const exportarCSV = () => {
    const cab = ["Nome", "Email", "CPF", "Nascimento", "Perfil", "Pagamento", "Ativo"];
    const linhas = lista.map((u) => [
      u.nome,
      u.email ?? "",
      u.cpf ?? "",
      fmtData(u.nascimento),
      rolePorSlug.get(u.role)?.nome ?? u.role,
      isIsentoPorPerfil(u) ? "Abonado (perfil)" : PAG_LABEL[u.pagamento],
      u.ativo ? "Sim" : "Não",
    ]);
    const csv = [cab, ...linhas]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "servos-submergidos.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  // cor da barra lateral: hierarquia de perfil vence status (regra do original)
  const corBarra = (u: ServoRow) => {
    if (u.role === "pastor" || u.role === "pastor_auxiliar" || u.role.startsWith("lider_"))
      return rolePorSlug.get(u.role)?.cor ?? AVISO;
    if (isIsentoPorPerfil(u)) return CINZA;
    return PAG_COR[u.pagamento];
  };

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      {/* senha temporária gerada (aparece 1x após criar) */}
      {senhaGerada && (
        <div
          className="space-y-2 rounded-card border p-4"
          style={{ borderColor: "rgba(18,181,166,0.4)", background: "rgba(18,181,166,0.08)" }}
        >
          <p className="text-sm font-bold" style={{ color: OK }}>
            ✓ {senhaGerada.nome} cadastrado!
          </p>
          <p className="text-xs text-corrente">
            Senha temporária — envie ao servo. No primeiro login ele cria a própria senha.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-control bg-[rgba(0,14,33,0.8)] px-3 py-2 font-mono text-base text-luz">
              {senhaGerada.senha}
            </code>
            <button
              onClick={copiarSenha}
              className="flex h-9 w-9 items-center justify-center rounded-control border border-[rgba(164,214,232,0.25)] text-luz"
              aria-label="Copiar senha"
            >
              {copiado ? <Check size={15} style={{ color: OK }} /> : <Copy size={15} />}
            </button>
            <button
              onClick={() => setSenhaGerada(null)}
              className="flex h-9 w-9 items-center justify-center rounded-control border border-[rgba(164,214,232,0.18)] text-corrente"
              aria-label="Fechar"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}

      {/* adicionar servo */}
      {admin && (
        <button
          onClick={() => {
            setForm(FORM_VAZIO);
            setErro("");
            setMostrarForm(true);
          }}
          className="flex w-full items-center justify-center gap-2 rounded-control border border-[rgba(164,214,232,0.18)] py-3 text-sm font-semibold text-corrente transition hover:text-luz active:scale-[0.98]"
        >
          <Plus size={15} /> Adicionar Servo
        </button>
      )}

      {erro && !mostrarForm && (
        <div
          className="rounded-card border px-4 py-3 text-sm"
          style={{ borderColor: "rgba(229,86,78,0.3)", background: "rgba(229,86,78,0.1)", color: "#f0a39e" }}
        >
          {erro}
        </div>
      )}

      {/* bottom sheet de cadastro (padrão do app original) */}
      <BottomSheet titulo="Adicionar Servo" aberto={admin && mostrarForm} onClose={() => setMostrarForm(false)}>
        <div className="space-y-3">
          <p
            className="rounded-control border px-3 py-2.5 text-xs"
            style={{ borderColor: "rgba(18,181,166,0.3)", background: "rgba(18,181,166,0.08)", color: OK }}
          >
            🔑 Uma senha temporária será gerada — envie ao servo; ele troca no primeiro acesso.
          </p>
          <input
            placeholder="Nome completo *"
            value={form.nome}
            onChange={(e) => setForm((v) => ({ ...v, nome: e.target.value }))}
            className={inputCls}
          />
          <input
            type="email"
            placeholder="E-mail * (será usado para login)"
            value={form.email}
            onChange={(e) => setForm((v) => ({ ...v, email: e.target.value }))}
            className={inputCls}
          />
          <input
            placeholder="CPF *"
            inputMode="numeric"
            value={form.cpf}
            onChange={(e) => setForm((v) => ({ ...v, cpf: maskCpf(e.target.value) }))}
            className={inputCls}
          />
          <div>
            <p className="mb-1 text-[11px] uppercase tracking-wide text-corrente">Nascimento *</p>
            <input
              type="date"
              value={form.nascimento}
              onChange={(e) => setForm((v) => ({ ...v, nascimento: e.target.value }))}
              style={{ colorScheme: "dark" }}
              className={inputCls}
            />
          </div>
          <div>
            <p className="mb-1 text-[11px] uppercase tracking-wide text-corrente">Sexo</p>
            <div className="flex gap-2">
              {(["masculino", "feminino"] as Sexo[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setForm((v) => ({ ...v, sexo: s }))}
                  className="flex-1 rounded-control border py-2.5 text-xs font-semibold transition"
                  style={
                    form.sexo === s
                      ? { borderColor: "#a4d6e8", color: "#00060f", background: "#dcf1f8" }
                      : { borderColor: "rgba(164,214,232,0.18)", color: "#416a87" }
                  }
                >
                  {s === "masculino" ? "Masculino" : "Feminino"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 text-[11px] uppercase tracking-wide text-corrente">Perfil</p>
            <select
              value={form.role}
              onChange={(e) => setForm((v) => ({ ...v, role: e.target.value }))}
              className={inputCls}
            >
              {ROLES_CADASTRO.map((slug) => (
                <option key={slug} value={slug}>
                  {rolePorSlug.get(slug)?.nome ?? slug}
                </option>
              ))}
            </select>
          </div>
          {erro && (
            <p className="text-sm" style={{ color: "#f0a39e" }}>
              {erro}
            </p>
          )}
          <button
            onClick={adicionar}
            disabled={pending}
            className="w-full rounded-control py-3.5 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
            style={{ background: OK }}
          >
            {pending ? "Criando..." : "Criar Servo"}
          </button>
        </div>
      </BottomSheet>

      {/* data limite pagamento */}
      {admin && (
        <div className={`${cardCls} p-4`}>
          <p className="mb-2 text-xs uppercase tracking-wide text-corrente">
            Data limite — pagamento do servo
          </p>
          {editandoData ? (
            <div className="flex gap-2">
              <input
                type="date"
                value={dataLimite}
                onChange={(e) => setDataLimite(e.target.value)}
                style={{ colorScheme: "dark" }}
                className={inputCls}
              />
              <button
                onClick={salvarData}
                disabled={pending}
                className="shrink-0 rounded-control px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ background: OK }}
              >
                Salvar
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="font-display text-lg font-bold text-luz">
                {dataLimite ? fmtData(dataLimite) : "Não definida"}
              </p>
              <button
                onClick={() => setEditandoData(true)}
                className="rounded-control border border-[rgba(164,214,232,0.25)] px-3 py-1.5 text-xs font-semibold text-corrente transition hover:text-luz"
              >
                Alterar data
              </button>
            </div>
          )}
        </div>
      )}

      {/* stats */}
      <div className={`${cardCls} p-5 text-center`}>
        <p className="font-display text-4xl font-extrabold text-luz">{stats.total}</p>
        <p className="mt-1 text-xs uppercase tracking-widest text-corrente">Total de Servos</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {([
          ["Pagos", stats.pagos, OK],
          ["Pendentes", stats.pendentes, ALERTA],
          ["Abonados", stats.abonados, CINZA],
          ["Pagar dep.", stats.pagarDepois, AZUL],
        ] as [string, number, string][]).map(([label, n, cor]) => (
          <div key={label} className={`${cardCls} p-4`} style={{ borderLeft: `3px solid ${cor}` }}>
            <p className="font-display text-2xl font-extrabold text-luz">{n}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-corrente">{label}</p>
          </div>
        ))}
      </div>
      {stats.aguardando > 0 && (
        <button
          onClick={() => setFStatus("aguardando")}
          className="flex w-full items-center justify-between rounded-card border p-4 text-left transition active:scale-[0.99]"
          style={{ borderColor: "rgba(224,162,60,0.45)", background: "rgba(224,162,60,0.08)" }}
        >
          <div>
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: AVISO }}>
              ⏳ Aguardando aprovação
            </p>
            <p className="text-[11px] text-corrente">Toque para ver os cadastros pendentes</p>
          </div>
          <p className="font-display text-2xl font-extrabold" style={{ color: AVISO }}>
            {stats.aguardando}
          </p>
        </button>
      )}
      {stats.inativos > 0 && (
        <div className={`${cardCls} flex items-center justify-between p-4`}>
          <p className="text-xs uppercase tracking-wide text-corrente">Inativos</p>
          <p className="font-display text-xl font-extrabold text-luz">{stats.inativos}</p>
        </div>
      )}

      {/* abas de sexo */}
      <div className="flex gap-2">
        {([
          ["todos", "Todos"],
          ["feminino", "Mulheres"],
          ["masculino", "Homens"],
        ] as ["todos" | Sexo, string][]).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setAba(val)}
            className={`flex-1 rounded-control py-2 text-sm font-semibold transition ${
              aba === val
                ? "font-bold"
                : "border border-[rgba(164,214,232,0.18)] text-corrente hover:text-luz"
            }`}
            style={aba === val ? { background: "#dcf1f8", color: "#00060f" } : undefined}
          >
            {label}
          </button>
        ))}
      </div>

      {/* filtros de perfil e status */}
      <div className="grid grid-cols-2 gap-2">
        <select value={fPerfil} onChange={(e) => setFPerfil(e.target.value)} className={inputCls}>
          <option value="todos">Perfil: todos</option>
          <option value="servo">Servo</option>
          <option value="cozinha">Cozinha</option>
          <option value="staff">Staff</option>
          <option value="lider">Líderes</option>
          <option value="pastor">Pastores</option>
        </select>
        <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className={inputCls}>
          <option value="todos">Status: todos</option>
          <option value="pagos">Pagos</option>
          <option value="pendentes">Pendentes</option>
          <option value="abonados">Abonados</option>
          <option value="pagar_depois">Pagar depois</option>
          <option value="ativos">Ativos</option>
          <option value="inativos">Inativos</option>
          <option value="primeiro_acesso">1º acesso</option>
          <option value="aguardando">Aguardando aprovação</option>
        </select>
      </div>

      {/* busca */}
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-corrente" />
        <input
          placeholder="Buscar por nome..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className={`${inputCls} pl-9`}
        />
      </div>

      {/* exportar */}
      {admin && (
        <button
          onClick={exportarCSV}
          className="w-full rounded-control py-3 text-sm font-semibold text-white transition active:scale-[0.98]"
          style={{ background: OK }}
        >
          Exportar Excel (CSV)
        </button>
      )}

      <p className="text-center text-xs text-corrente">
        Exibindo {lista.length} de {stats.total}
      </p>

      {/* lista */}
      <div className="space-y-2">
        {lista.length === 0 ? (
          <p className="py-8 text-center text-sm text-corrente">Nenhum servo encontrado.</p>
        ) : (
          lista.map((u) => {
            const aberto = expandido === u.id;
            const role = rolePorSlug.get(u.role);
            const isento = isIsentoPorPerfil(u);
            const pdDataVal = pdData[u.id] ?? (u.pagar_depois_data ?? "");
            const pdObsVal = pdObs[u.id] ?? (u.pagar_depois_obs ?? "");
            return (
              <div key={u.id} className={cardCls} style={{ borderLeft: `3px solid ${corBarra(u)}` }}>
                {/* cabeçalho */}
                <button
                  onClick={() => setExpandido(aberto ? null : u.id)}
                  className="flex w-full items-center justify-between gap-2 p-4 text-left"
                >
                  <p className="min-w-0 flex-1 truncate font-semibold text-luz">{u.nome}</p>
                  <span className="flex shrink-0 flex-wrap items-center justify-end gap-1">
                    {!u.aprovado && <Pill texto="⏳ Aguardando" cor={AVISO} />}
                    {u.primeiro && <Pill texto="1º acesso" cor={AVISO} />}
                    {!u.sexo && <Pill texto="Sem sexo" cor={ALERTA} />}
                    {!u.ativo && <Pill texto="Inativo" cor={CINZA} />}
                    {isento ? (
                      <Pill texto="Abonado" cor={CINZA} />
                    ) : (
                      <Pill texto={PAG_LABEL[u.pagamento]} cor={PAG_COR[u.pagamento]} />
                    )}
                    <Pill texto={role?.nome ?? u.role} cor={role?.cor ?? "#6b7280"} />
                  </span>
                </button>

                {/* corpo expandido */}
                {aberto && (
                  <div className="space-y-4 border-t border-[rgba(164,214,232,0.1)] px-4 py-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <Campo label="E-mail" valor={u.email ?? "—"} />
                      <Campo label="CPF" valor={u.cpf ?? "—"} />
                      <Campo label="Nascimento" valor={fmtData(u.nascimento)} />
                      <Campo
                        label="Sexo"
                        valor={u.sexo === "masculino" ? "Masculino" : u.sexo === "feminino" ? "Feminino" : "—"}
                      />
                    </div>

                    {/* aprovação do auto-cadastro */}
                    {!u.aprovado && admin && (
                      <div
                        className="space-y-2 rounded-control border p-3"
                        style={{ borderColor: "rgba(224,162,60,0.4)", background: "rgba(224,162,60,0.07)" }}
                      >
                        <p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: AVISO }}>
                          ⏳ Cadastro aguardando aprovação
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => rodar(u.id, { aprovado: true }, () => aprovarServo(u.id))}
                            disabled={pending}
                            className="flex-1 rounded-control py-2.5 text-xs font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
                            style={{ background: OK }}
                          >
                            ✓ Aprovar acesso
                          </button>
                          <button
                            onClick={() => {
                              if (!confirm(`Recusar e REMOVER o cadastro de ${u.nome}?`)) return;
                              setErro("");
                              startTransition(async () => {
                                const res = await recusarServo(u.id);
                                if (!res.ok) setErro(res.erro ?? "Não foi possível recusar.");
                                else setRows((prev) => prev.filter((r) => r.id !== u.id));
                              });
                            }}
                            disabled={pending}
                            className="rounded-control border px-3 py-2.5 text-xs font-semibold transition active:scale-[0.98] disabled:opacity-50"
                            style={{ borderColor: "rgba(229,86,78,0.5)", color: ALERTA }}
                          >
                            Recusar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* status ativo */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-corrente">Status</p>
                        <p className="text-sm font-semibold text-luz">{u.ativo ? "Ativo" : "Inativo"}</p>
                      </div>
                      {admin && (
                        <button
                          onClick={() =>
                            rodar(u.id, { ativo: !u.ativo }, () => alternarAtivo(u.id, !u.ativo))
                          }
                          disabled={pending}
                          aria-label="Alternar ativo"
                          className={`relative h-7 w-12 rounded-full transition ${u.ativo ? "" : "bg-white/15"}`}
                          style={u.ativo ? { background: OK } : undefined}
                        >
                          <span
                            className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
                              u.ativo ? "left-6" : "left-1"
                            }`}
                          />
                        </button>
                      )}
                    </div>

                    {/* pagamento — oculto para isentos por perfil (regra do original) */}
                    {!isento && (
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-wide text-corrente">Pagamento</p>

                        {u.pagamento === "pago" ? (
                          <>
                            <p className="text-sm font-semibold" style={{ color: OK }}>
                              ✓ Pago
                            </p>
                            {admin && (
                              <button
                                onClick={() => {
                                  if (!confirm("Reverter este pagamento para PENDENTE?")) return;
                                  rodar(u.id, { pagamento: "pendente" }, () => reverterServoPago(u.id));
                                }}
                                disabled={pending}
                                className="w-full rounded-control border py-2 text-xs font-semibold transition active:scale-[0.98] disabled:opacity-50"
                                style={{ borderColor: "rgba(229,86,78,0.5)", color: ALERTA }}
                              >
                                Reverter para pendente
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            {u.pagamento === "pagar_depois" && (
                              <p className="text-xs text-corrente">
                                📅 até {fmtData(u.pagar_depois_data)}
                                {u.pagar_depois_obs ? ` · 💬 ${u.pagar_depois_obs}` : ""}
                              </p>
                            )}
                            {admin && (
                              <div className="grid grid-cols-1 gap-2">
                                <button
                                  onClick={() => rodar(u.id, { pagamento: "pago" }, () => marcarServoPago(u.id))}
                                  disabled={pending}
                                  className="rounded-control py-2 text-xs font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
                                  style={{ background: OK }}
                                >
                                  Marcar como pago
                                </button>
                                {u.pagamento !== "pagar_depois" && (
                                  <button
                                    onClick={() =>
                                      rodar(
                                        u.id,
                                        { pagamento: u.pagamento === "abonado" ? "pendente" : "abonado" },
                                        () => abonarServo(u.id, u.pagamento !== "abonado"),
                                      )
                                    }
                                    disabled={pending}
                                    className="rounded-control border py-2 text-xs font-semibold transition active:scale-[0.98] disabled:opacity-50"
                                    style={{ borderColor: `${CINZA}88`, color: CINZA }}
                                  >
                                    {u.pagamento === "abonado" ? "Desfazer abono" : "Abonar"}
                                  </button>
                                )}
                                {u.pagamento !== "abonado" && (
                                  <button
                                    onClick={() =>
                                      setPdAberto((d) => ({
                                        ...d,
                                        [u.id]: !(d[u.id] ?? u.pagamento === "pagar_depois"),
                                      }))
                                    }
                                    disabled={pending}
                                    className="rounded-control border py-2 text-xs font-semibold transition active:scale-[0.98] disabled:opacity-50"
                                    style={
                                      (pdAberto[u.id] ?? u.pagamento === "pagar_depois")
                                        ? { background: AZUL, color: "#fff" }
                                        : { borderColor: `${AZUL}66`, color: AZUL }
                                    }
                                  >
                                    Pagar depois
                                  </button>
                                )}
                                {u.pagamento !== "abonado" &&
                                  (pdAberto[u.id] ?? u.pagamento === "pagar_depois") && (
                                  <div
                                    className="space-y-2 rounded-control border p-3"
                                    style={{ borderColor: "rgba(10,132,255,0.35)", background: "rgba(10,132,255,0.07)" }}
                                  >
                                    <p className="text-[11px] uppercase tracking-wide" style={{ color: AZUL }}>
                                      Pagar depois
                                    </p>
                                    <input
                                      type="date"
                                      value={pdDataVal}
                                      onChange={(e) => setPdData((d) => ({ ...d, [u.id]: e.target.value }))}
                                      style={{ colorScheme: "dark" }}
                                      className={inputCls}
                                    />
                                    <input
                                      placeholder="Observação (opcional)"
                                      value={pdObsVal}
                                      onChange={(e) => setPdObs((d) => ({ ...d, [u.id]: e.target.value }))}
                                      className={inputCls}
                                    />
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() =>
                                          rodar(
                                            u.id,
                                            {
                                              pagamento: "pagar_depois",
                                              pagar_depois_data: pdDataVal || null,
                                              pagar_depois_obs: pdObsVal || null,
                                            },
                                            () => salvarServoPagarDepois(u.id, pdDataVal, pdObsVal),
                                          )
                                        }
                                        disabled={pending || !pdDataVal}
                                        className="flex-1 rounded-control py-2 text-xs font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
                                        style={{ background: AZUL }}
                                      >
                                        Salvar
                                      </button>
                                      {u.pagamento === "pagar_depois" && (
                                        <button
                                          onClick={() =>
                                            rodar(
                                              u.id,
                                              { pagamento: "pendente", pagar_depois_data: null, pagar_depois_obs: null },
                                              () => removerServoPagarDepois(u.id),
                                            )
                                          }
                                          disabled={pending}
                                          className="rounded-control border px-3 py-2 text-xs font-semibold transition disabled:opacity-50"
                                          style={{ borderColor: `${AZUL}66`, color: AZUL }}
                                        >
                                          Remover
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {!admin && (
        <p className="pt-2 text-center text-xs text-corrente">
          Somente administradores podem editar os servos.
        </p>
      )}
    </div>
  );
}

function Pill({ texto, cor }: { texto: string; cor: string }) {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
      style={{ color: cor, background: `${cor}1f` }}
    >
      {texto}
    </span>
  );
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-corrente">{label}</p>
      <p className="truncate text-luz">{valor}</p>
    </div>
  );
}
