"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  FolderKanban,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  Check,
  Trash2,
  Search,
} from "lucide-react";
import { CELULAS } from "@/features/inscricoes/options";
import {
  mudarPerfil,
  definirLiderCelula,
  definirCelula,
  adicionarEscala,
  removerEscala,
  criarFuncao,
  removerFuncao,
  salvarLideresFuncao,
  criarPerfil,
  alternarTelaPerfil,
  alternarTelaExtra,
} from "../actions";
import {
  DIAS_ESCALA,
  DIA_ESCALA_LABEL,
  DIA_ESCALA_COR,
  TELAS,
  LIDER_MAP_DEFAULT,
} from "../shared";
import type { BackOfficeData, UsuarioBack, FuncaoBack, RoleBack } from "../queries";

const OK = "#12b5a6";
const AZUL = "#0a84ff";
const ALERTA = "#e5564e";
const LARANJA = "#ff6b35";
const ROSA = "#ff2d92";

const cardCls = "rounded-card border border-[rgba(164,214,232,0.12)] bg-[rgba(0,14,33,0.5)]";
const inputCls =
  "w-full rounded-control border border-[rgba(164,214,232,0.18)] bg-[rgba(0,14,33,0.6)] px-3 py-2.5 text-sm text-luz outline-none placeholder:text-corrente focus:border-raso";

type Aba = "perfis" | "escalas" | "funcoes";

export function BackOfficeView({ dados }: { dados: BackOfficeData }) {
  const router = useRouter();
  const [aba, setAba] = useState<Aba>("escalas");
  const [erro, setErro] = useState("");
  const [pending, startTransition] = useTransition();

  // roda action + refresh (dados voltam frescos do RSC)
  const rodar = (fn: () => Promise<{ ok: boolean; erro?: string }>) => {
    setErro("");
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setErro(res.erro ?? "Não foi possível salvar.");
      router.refresh();
    });
  };

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <div className={`${cardCls} flex items-center justify-between p-4`}>
        <div className="flex items-center gap-2">
          <FolderKanban size={20} className="text-raso" />
          <h1 className="font-display text-lg font-bold text-luz">Back Office</h1>
        </div>
        <span className="text-xs text-corrente">{dados.usuarios.length} usuários</span>
      </div>

      {/* abas */}
      <div className="flex gap-2">
        {([
          ["perfis", "Perfis"],
          ["escalas", "Escalas"],
          ["funcoes", "Funções"],
        ] as [Aba, string][]).map(([val, label]) => (
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

      {erro && (
        <div
          className="rounded-card border px-4 py-3 text-sm"
          style={{ borderColor: "rgba(229,86,78,0.3)", background: "rgba(229,86,78,0.1)", color: "#f0a39e" }}
        >
          {erro}
        </div>
      )}

      {aba === "perfis" && <TabPerfis dados={dados} rodar={rodar} pending={pending} />}
      {aba === "escalas" && <TabEscalas dados={dados} rodar={rodar} pending={pending} />}
      {aba === "funcoes" && <TabFuncoes dados={dados} rodar={rodar} pending={pending} />}
    </div>
  );
}

type Rodar = (fn: () => Promise<{ ok: boolean; erro?: string }>) => void;

// linha-checkbox custom (quadradinho + ✓), padrão visual do original
function CheckRow({
  label,
  ativo,
  cor,
  onClick,
  disabled,
}: {
  label: string;
  ativo: boolean;
  cor: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-2.5 rounded-control border px-3 py-2 text-left text-sm transition disabled:opacity-50"
      style={
        ativo
          ? { borderColor: `${cor}66`, background: `${cor}12`, color: "#dcf1f8" }
          : { borderColor: "rgba(164,214,232,0.14)", color: "#8aa9bd" }
      }
    >
      <span
        className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border"
        style={ativo ? { background: cor, borderColor: cor } : { borderColor: "rgba(164,214,232,0.3)" }}
      >
        {ativo && <Check size={12} className="text-white" />}
      </span>
      {label}
    </button>
  );
}

// ============================================================
//  ABA PERFIS — permissões de telas por perfil + novo perfil
// ============================================================
function TabPerfis({ dados, rodar, pending }: { dados: BackOfficeData; rodar: Rodar; pending: boolean }) {
  const [aberto, setAberto] = useState<string | null>(null);
  const [shNovo, setShNovo] = useState(false);
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState("#0a84ff");

  const roles = dados.roles.filter((r) => r.slug !== "admin");

  return (
    <div className="space-y-2">
      {/* novo perfil */}
      {shNovo ? (
        <div className={`${cardCls} space-y-3 p-4`}>
          <div className="flex items-center gap-2">
            <input
              autoFocus
              placeholder="Nome do novo perfil... (ex: Líder Decoração)"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && nome.trim()) {
                  rodar(() => criarPerfil(nome, cor));
                  setNome("");
                  setShNovo(false);
                }
              }}
              className={inputCls}
            />
            <input
              type="color"
              value={cor}
              onChange={(e) => setCor(e.target.value)}
              aria-label="Cor do perfil"
              className="h-10 w-12 shrink-0 cursor-pointer rounded-control border border-[rgba(164,214,232,0.18)] bg-transparent"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (!nome.trim()) return;
                rodar(() => criarPerfil(nome, cor));
                setNome("");
                setShNovo(false);
              }}
              disabled={pending || !nome.trim()}
              className="flex-1 rounded-control py-2.5 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
              style={{ background: OK }}
            >
              Criar perfil
            </button>
            <button
              onClick={() => setShNovo(false)}
              className="rounded-control border border-[rgba(164,214,232,0.18)] px-4 text-sm text-corrente"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShNovo(true)}
          className="flex w-full items-center justify-center gap-2 rounded-control border border-[rgba(164,214,232,0.18)] py-3 text-sm font-semibold text-corrente transition hover:text-luz active:scale-[0.98]"
        >
          <Plus size={15} /> Novo perfil
        </button>
      )}

      <p className="px-1 pt-1 text-[11px] leading-relaxed text-corrente">
        Marque as telas de gestão que cada perfil pode ver. Check-in, Quartos, Avisos e a
        agenda da home são abertos a todos. Admin, Líder Geral e Pastor veem tudo.
      </p>

      {roles.map((r) => {
        const abertoEste = aberto === r.slug;
        return (
          <div key={r.slug} className={cardCls} style={{ borderLeft: `3px solid ${r.cor}` }}>
            <button
              onClick={() => setAberto(abertoEste ? null : r.slug)}
              className="flex w-full items-center justify-between gap-2 p-4 text-left"
            >
              <p className="font-semibold text-luz">{r.nome}</p>
              <span className="flex items-center gap-2">
                <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-corrente">
                  {r.telas.length} telas
                </span>
                {abertoEste ? (
                  <ChevronUp size={15} className="text-corrente" />
                ) : (
                  <ChevronDown size={15} className="text-corrente" />
                )}
              </span>
            </button>
            {abertoEste && (
              <div className="space-y-1.5 border-t border-[rgba(164,214,232,0.1)] px-4 py-3">
                {TELAS.map((t) => (
                  <CheckRow
                    key={t.id}
                    label={t.label}
                    ativo={r.telas.includes(t.id)}
                    cor={OK}
                    disabled={pending}
                    onClick={() => rodar(() => alternarTelaPerfil(r.slug, t.id))}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================
//  ABA ESCALAS — usuários, perfil, líder de célula, escala por dia
// ============================================================
function TabEscalas({ dados, rodar, pending }: { dados: BackOfficeData; rodar: Rodar; pending: boolean }) {
  const [busca, setBusca] = useState("");
  const [fPerfil, setFPerfil] = useState("todos");
  const [aberto, setAberto] = useState<string | null>(null);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return dados.usuarios.filter((u) => {
      if (q && !u.nome.toLowerCase().includes(q)) return false;
      if (fPerfil === "lider" && !u.role.startsWith("lider_")) return false;
      else if (fPerfil === "pastor" && u.role !== "pastor" && u.role !== "pastor_auxiliar")
        return false;
      else if (["servo", "cozinha", "staff"].includes(fPerfil) && u.role !== fPerfil) return false;
      return true;
    });
  }, [dados.usuarios, busca, fPerfil]);

  const exportarCSV = () => {
    const cab = ["Nome", "Perfil", "Quinta", "Sexta", "Sábado", "Domingo"];
    const nomeRole = new Map(dados.roles.map((r) => [r.slug, r.nome]));
    const linhas = dados.usuarios.map((u) => [
      u.nome,
      nomeRole.get(u.role) ?? u.role,
      ...DIAS_ESCALA.map((d) =>
        u.escalas
          .filter((e) => e.dia === d)
          .map((e) => e.funcaoNome + (e.periodo ? ` - ${e.periodo}` : ""))
          .join(", "),
      ),
    ]);
    const csv = [cab, ...linhas]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "escalas-submergidos.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-2">
      <button
        onClick={exportarCSV}
        className="w-full rounded-control py-3 text-sm font-semibold text-white transition active:scale-[0.98]"
        style={{ background: OK }}
      >
        Exportar Escalas (CSV)
      </button>

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-corrente" />
          <input
            placeholder="Buscar usuário..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className={`${inputCls} pl-8`}
          />
        </div>
        <select value={fPerfil} onChange={(e) => setFPerfil(e.target.value)} className={inputCls}>
          <option value="todos">Todos</option>
          <option value="pastor">Pastores</option>
          <option value="lider">Líderes</option>
          <option value="servo">Servos</option>
          <option value="cozinha">Cozinha</option>
          <option value="staff">Staff</option>
        </select>
      </div>

      {lista.length === 0 ? (
        <p className="py-8 text-center text-sm text-corrente">Nenhum usuário encontrado.</p>
      ) : (
        lista.map((u) => (
          <CardUsuario
            key={u.id}
            u={u}
            roles={dados.roles}
            funcoes={dados.funcoes}
            aberto={aberto === u.id}
            onToggle={() => setAberto((v) => (v === u.id ? null : u.id))}
            rodar={rodar}
            pending={pending}
          />
        ))
      )}
    </div>
  );
}

function CardUsuario({
  u,
  roles,
  funcoes,
  aberto,
  onToggle,
  rodar,
  pending,
}: {
  u: UsuarioBack;
  roles: RoleBack[];
  funcoes: FuncaoBack[];
  aberto: boolean;
  onToggle: () => void;
  rodar: Rodar;
  pending: boolean;
}) {
  const [shTelas, setShTelas] = useState(false);
  const rolePorSlug = useMemo(() => new Map(roles.map((r) => [r.slug, r])), [roles]);
  const role = rolePorSlug.get(u.role);
  const total = u.escalas.length;

  // telas do perfil já cobrem — extras só oferecem o que falta
  const telasDoPerfil = role?.telas ?? [];
  const telasDisponiveis = TELAS.filter((t) => !telasDoPerfil.includes(t.id));

  return (
    <div className={cardCls} style={{ borderLeft: `3px solid ${role?.cor ?? OK}` }}>
      {/* header */}
      <div className="flex items-center justify-between gap-2 p-4">
        <button onClick={onToggle} className="min-w-0 flex-1 text-left">
          <p className="truncate font-semibold text-luz">{u.nome}</p>
          <p className="text-xs text-corrente">
            {role?.nome ?? u.role}
            {total > 0 && (
              <span style={{ color: OK }}>
                {" "}
                · {total} {total === 1 ? "função" : "funções"}
              </span>
            )}
          </p>
        </button>
        <select
          value={u.role}
          onChange={(e) => rodar(() => mudarPerfil(u.id, e.target.value))}
          disabled={pending}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 rounded-control border border-[rgba(164,214,232,0.18)] bg-[rgba(0,14,33,0.6)] px-2 py-1.5 text-xs text-luz outline-none disabled:opacity-50"
        >
          {roles
            .filter((r) => r.slug !== "admin")
            .map((r) => (
              <option key={r.slug} value={r.slug}>
                {r.nome}
              </option>
            ))}
        </select>
        <button onClick={onToggle} aria-label="Expandir" className="shrink-0 text-corrente">
          {aberto ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {aberto && (
        <div className="space-y-4 border-t border-[rgba(164,214,232,0.1)] px-4 py-4">
          {u.email && <p className="text-xs text-corrente">✉️ {u.email}</p>}

          {/* líder de célula — só servo/lider_celula (regra do original) */}
          {(u.role === "servo" || u.role === "lider_celula") && (
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-wide text-corrente">Líder de célula</p>
              <div className="flex gap-2">
                {([
                  [true, "Sim"],
                  [false, "Não"],
                ] as [boolean, string][]).map(([val, label]) => (
                  <button
                    key={label}
                    onClick={() => rodar(() => definirLiderCelula(u.id, val))}
                    disabled={pending}
                    className="flex-1 rounded-control border py-2 text-xs font-semibold transition disabled:opacity-50"
                    style={
                      u.lider_celula === val
                        ? val
                          ? { borderColor: LARANJA, color: LARANJA, background: `${LARANJA}14` }
                          : { borderColor: "rgba(164,214,232,0.3)", color: "#dcf1f8", background: "rgba(164,214,232,0.08)" }
                        : { borderColor: "rgba(164,214,232,0.14)", color: "#416a87" }
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>
              {u.lider_celula && (
                <select
                  value={u.celula ?? ""}
                  onChange={(e) => rodar(() => definirCelula(u.id, e.target.value))}
                  disabled={pending}
                  className={inputCls}
                >
                  <option value="">Selecione a célula...</option>
                  {CELULAS.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* telas extras individuais */}
          {telasDisponiveis.length > 0 && (
            <div>
              <button
                onClick={() => setShTelas((v) => !v)}
                className="flex w-full items-center justify-between rounded-control border px-3 py-2 text-xs font-semibold transition"
                style={
                  u.telas_extra.length > 0
                    ? { borderColor: `${AZUL}55`, color: AZUL }
                    : { borderColor: "rgba(164,214,232,0.18)", color: "#8aa9bd" }
                }
              >
                Telas extras ({u.telas_extra.length})
                {shTelas ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </button>
              {shTelas && (
                <div className="mt-2 space-y-1.5">
                  {telasDisponiveis.map((t) => (
                    <CheckRow
                      key={t.id}
                      label={t.label}
                      ativo={u.telas_extra.includes(t.id)}
                      cor={AZUL}
                      disabled={pending}
                      onClick={() => rodar(() => alternarTelaExtra(u.id, t.id))}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* escala por dia */}
          {DIAS_ESCALA.map((dia) => {
            const cor = DIA_ESCALA_COR[dia];
            const doDia = u.escalas.filter((e) => e.dia === dia);
            return (
              <div key={dia}>
                <p
                  className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide"
                  style={{ color: cor }}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: cor }} />
                  {DIA_ESCALA_LABEL[dia]}
                </p>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {doDia.map((e) => (
                    <button
                      key={e.id}
                      onClick={() => rodar(() => removerEscala(e.id))}
                      disabled={pending}
                      className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition disabled:opacity-50"
                      style={{ color: cor, background: `${cor}18`, border: `1px solid ${cor}44` }}
                    >
                      {e.funcaoNome}
                      {e.periodo ? ` - ${e.periodo}` : ""}
                      <X size={11} style={{ color: ALERTA }} />
                    </button>
                  ))}
                </div>
                <AddFuncaoDia
                  dia={dia}
                  cor={cor}
                  funcoes={funcoes}
                  pending={pending}
                  onAdd={(funcaoId, periodo) =>
                    rodar(() => adicionarEscala(u.id, funcaoId, dia, periodo))
                  }
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// autocomplete de função com pergunta de período (Almoço/Jantar)
function AddFuncaoDia({
  dia,
  cor,
  funcoes,
  pending,
  onAdd,
}: {
  dia: string;
  cor: string;
  funcoes: FuncaoBack[];
  pending: boolean;
  onAdd: (funcaoId: string, periodo: string | null) => void;
}) {
  const [busca, setBusca] = useState("");
  const [pendente, setPendente] = useState<FuncaoBack | null>(null);

  const sugestoes = busca
    ? funcoes.filter((f) => f.nome.toLowerCase().includes(busca.toLowerCase())).slice(0, 6)
    : [];

  const escolher = (f: FuncaoBack) => {
    setBusca("");
    if (f.periodo === "almoco_jantar") setPendente(f);
    else onAdd(f.id, null);
  };

  if (pendente) {
    return (
      <div
        className="flex flex-wrap items-center gap-2 rounded-control border p-2.5"
        style={{ borderColor: `${cor}44`, background: `${cor}0d` }}
      >
        <p className="text-xs font-semibold text-luz">{pendente.nome} — qual período?</p>
        {["Almoço", "Jantar"].map((p) => (
          <button
            key={p}
            onClick={() => {
              onAdd(pendente.id, p);
              setPendente(null);
            }}
            disabled={pending}
            className="rounded-control px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
            style={{ background: cor }}
          >
            {p}
          </button>
        ))}
        <button onClick={() => setPendente(null)} aria-label="Cancelar" className="text-corrente">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        placeholder={`+ Função na ${DIA_ESCALA_LABEL[dia]}...`}
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="w-full rounded-control border bg-[rgba(0,14,33,0.6)] px-3 py-2 text-base text-luz outline-none placeholder:text-corrente md:text-sm"
        style={{ borderColor: `${cor}44` }}
      />
      {busca && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 max-h-44 overflow-y-auto rounded-control border border-[rgba(164,214,232,0.2)] bg-breu shadow-glow">
          {sugestoes.length === 0 ? (
            <p className="px-3 py-2 text-xs italic text-corrente">Nenhuma função encontrada</p>
          ) : (
            sugestoes.map((f) => (
              <button
                key={f.id}
                onMouseDown={() => escolher(f)}
                className="block w-full px-3 py-2 text-left text-sm text-luz transition hover:bg-white/5"
              >
                {f.nome}
                {f.periodo === "almoco_jantar" && (
                  <span className="ml-1 text-[10px] text-corrente">(pede período)</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
//  ABA FUNÇÕES — catálogo, líderes responsáveis, quem está escalado
// ============================================================
function TabFuncoes({ dados, rodar, pending }: { dados: BackOfficeData; rodar: Rodar; pending: boolean }) {
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<string | null>(null);
  const [shNova, setShNova] = useState(false);
  const [nome, setNome] = useState("");
  const [temPeriodo, setTemPeriodo] = useState(false);

  // pessoas por função (nome + dia + sexo), derivado das escalas dos usuários
  const porFuncao = useMemo(() => {
    const mapa = new Map<string, { nome: string; dia: string; sexo: string | null }[]>();
    for (const f of dados.funcoes) mapa.set(f.id, []);
    for (const u of dados.usuarios)
      for (const e of u.escalas)
        mapa.get(e.funcaoId)?.push({ nome: u.nome, dia: e.dia, sexo: u.sexo });
    return mapa;
  }, [dados]);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return dados.funcoes.filter((f) => !q || f.nome.toLowerCase().includes(q));
  }, [dados.funcoes, busca]);

  return (
    <div className="space-y-2">
      {/* nova função */}
      {shNova ? (
        <div className={`${cardCls} space-y-3 p-4`}>
          <input
            autoFocus
            placeholder="Nome da nova função..."
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className={inputCls}
          />
          <button
            onClick={() => setTemPeriodo((v) => !v)}
            className="flex w-full items-center justify-between rounded-control border px-3 py-2.5 text-sm font-semibold transition"
            style={
              temPeriodo
                ? { borderColor: `${AZUL}66`, color: AZUL, background: `${AZUL}10` }
                : { borderColor: "rgba(164,214,232,0.18)", color: "#416a87" }
            }
          >
            Pede período (Almoço/Jantar)
            <span>{temPeriodo ? "Sim" : "Não"}</span>
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (!nome.trim()) return;
                rodar(() => criarFuncao(nome, temPeriodo));
                setNome("");
                setTemPeriodo(false);
                setShNova(false);
              }}
              disabled={pending || !nome.trim()}
              className="flex-1 rounded-control py-2.5 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
              style={{ background: OK }}
            >
              Criar função
            </button>
            <button
              onClick={() => setShNova(false)}
              className="rounded-control border border-[rgba(164,214,232,0.18)] px-4 text-sm text-corrente"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShNova(true)}
          className="flex w-full items-center justify-center gap-2 rounded-control border border-[rgba(164,214,232,0.18)] py-3 text-sm font-semibold text-corrente transition hover:text-luz active:scale-[0.98]"
        >
          <Plus size={15} /> Nova função
        </button>
      )}

      <div className="relative">
        <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-corrente" />
        <input
          placeholder="Buscar função..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className={`${inputCls} pl-8`}
        />
      </div>

      {lista.map((f) => {
        const pessoas = porFuncao.get(f.id) ?? [];
        const unicas = new Set(pessoas.map((p) => p.nome)).size;
        const abertoEste = aberto === f.id;
        return (
          <div key={f.id} className={cardCls}>
            <button
              onClick={() => setAberto(abertoEste ? null : f.id)}
              className="flex w-full items-center justify-between gap-2 p-4 text-left"
            >
              <p className="min-w-0 flex-1 truncate font-semibold text-luz">
                {f.nome}
                {f.periodo === "almoco_jantar" && (
                  <span className="ml-1.5 text-[10px] font-normal text-corrente">Almoço/Jantar</span>
                )}
              </p>
              <span className="flex shrink-0 items-center gap-2">
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={
                    unicas > 0
                      ? { color: AZUL, background: `${AZUL}1f` }
                      : { color: "#8e8e93", background: "rgba(142,142,147,0.12)" }
                  }
                >
                  {unicas > 0 ? `${unicas} pessoa${unicas > 1 ? "s" : ""}` : "Sem ninguém"}
                </span>
                {abertoEste ? (
                  <ChevronUp size={15} className="text-corrente" />
                ) : (
                  <ChevronDown size={15} className="text-corrente" />
                )}
              </span>
            </button>

            {abertoEste && (
              <div className="space-y-4 border-t border-[rgba(164,214,232,0.1)] px-4 py-4">
                <LideresEditor
                  funcaoNome={f.nome}
                  roles={dados.roles}
                  liderMap={dados.liderMap}
                  rodar={rodar}
                  pending={pending}
                />

                {/* escala da função por dia e sexo */}
                <div>
                  <p className="mb-2 text-[11px] uppercase tracking-wide text-corrente">Escala</p>
                  {pessoas.length === 0 ? (
                    <p className="text-xs italic text-corrente">
                      Nenhum servo escalado nesta função ainda.
                    </p>
                  ) : (
                    DIAS_ESCALA.filter((d) => pessoas.some((p) => p.dia === d)).map((d) => {
                      const doDia = pessoas.filter((p) => p.dia === d);
                      const grupos: [string, string, typeof doDia][] = [
                        ["Mulheres", ROSA, doDia.filter((p) => p.sexo === "feminino")],
                        ["Homens", AZUL, doDia.filter((p) => p.sexo === "masculino")],
                        ["Sem sexo definido", "#8e8e93", doDia.filter((p) => !p.sexo)],
                      ];
                      return (
                        <div key={d} className="mb-3">
                          <p
                            className="mb-1 text-[11px] font-bold uppercase"
                            style={{ color: DIA_ESCALA_COR[d] }}
                          >
                            {DIA_ESCALA_LABEL[d]} · {doDia.length}
                          </p>
                          {grupos
                            .filter(([, , g]) => g.length > 0)
                            .map(([label, cor, g]) => (
                              <div key={label} className="mb-1.5">
                                <p className="text-[10px] font-semibold" style={{ color: cor }}>
                                  {label}
                                </p>
                                {g.map((p, i) => (
                                  <p key={i} className="flex items-center gap-1.5 text-xs text-luz">
                                    <span
                                      className="h-1 w-1 rounded-full"
                                      style={{ background: cor }}
                                    />
                                    {p.nome}
                                  </p>
                                ))}
                              </div>
                            ))}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* excluir — só extras e sem escalados */}
                {!f.is_sistema && unicas === 0 && (
                  <button
                    onClick={() => {
                      if (!confirm(`Excluir a função "${f.nome}"?`)) return;
                      rodar(() => removerFuncao(f.id));
                    }}
                    disabled={pending}
                    className="flex w-full items-center justify-center gap-1.5 rounded-control border py-2 text-xs font-semibold transition disabled:opacity-50"
                    style={{ borderColor: "rgba(229,86,78,0.4)", color: ALERTA }}
                  >
                    <Trash2 size={13} /> Excluir função
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function LideresEditor({
  funcaoNome,
  roles,
  liderMap,
  rodar,
  pending,
}: {
  funcaoNome: string;
  roles: RoleBack[];
  liderMap: Record<string, string[]>;
  rodar: Rodar;
  pending: boolean;
}) {
  const [sh, setSh] = useState(false);
  // cascata: override do banco → default do original → lider_staff
  const atual = liderMap[funcaoNome] ?? LIDER_MAP_DEFAULT[funcaoNome] ?? ["lider_staff"];
  const lideres = roles.filter((r) => r.slug.startsWith("lider_"));

  return (
    <div>
      <button
        onClick={() => setSh((v) => !v)}
        className="flex w-full items-center justify-between rounded-control border px-3 py-2 text-xs font-semibold transition"
        style={{ borderColor: `${AZUL}55`, color: AZUL }}
      >
        Líder(es) responsável(eis) ({atual.length})
        {sh ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>
      {sh && (
        <div className="mt-2 space-y-1.5">
          {lideres.map((r) => (
            <CheckRow
              key={r.slug}
              label={r.nome}
              ativo={atual.includes(r.slug)}
              cor={AZUL}
              disabled={pending}
              onClick={() =>
                rodar(() =>
                  salvarLideresFuncao(
                    funcaoNome,
                    atual.includes(r.slug)
                      ? atual.filter((s) => s !== r.slug)
                      : [...atual, r.slug],
                  ),
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
