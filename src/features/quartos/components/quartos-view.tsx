"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Plus, Pencil, Trash2, X, BedDouble, Baby } from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";
import {
  criarQuarto,
  atualizarQuarto,
  removerQuarto,
  adicionarServoQuarto,
  removerServoQuarto,
  adicionarEncQuarto,
  removerEncQuarto,
} from "../actions";
import type { QuartoRow, PessoaOption, Genero } from "../queries";

const OK = "#12b5a6";
const AVISO = "#ff9f0a"; // laranja do Quarto Mães (cor do original)
const ALERTA = "#e5564e";

const cardCls = "rounded-card border border-[rgba(164,214,232,0.12)] bg-[rgba(0,14,33,0.5)]";
const inputCls =
  "w-full rounded-control border border-[rgba(164,214,232,0.18)] bg-[rgba(0,14,33,0.6)] px-3 py-2.5 text-sm text-luz outline-none placeholder:text-corrente focus:border-raso";

// cor por lotação (regra do original: 100% vermelho, 80% laranja, senão verde)
const corLotacao = (pct: number) => (pct >= 100 ? ALERTA : pct >= 80 ? "#e0a23c" : OK);

interface Form {
  numero: string;
  limite_encontristas: string;
  limite_servos: string;
  is_maes: boolean;
}
const FORM_VAZIO: Form = { numero: "", limite_encontristas: "9", limite_servos: "2", is_maes: false };

export function QuartosView({
  quartos: quartosInit,
  servosDisponiveis: servosInit,
  encontristasDisponiveis: encInit,
  edit,
  sexoUsuario,
}: {
  quartos: QuartoRow[];
  servosDisponiveis: PessoaOption[];
  encontristasDisponiveis: PessoaOption[];
  edit: boolean;
  sexoUsuario: Genero | null;
}) {
  const [quartos, setQuartos] = useState(quartosInit);
  const [servosDisp, setServosDisp] = useState(servosInit);
  const [encDisp, setEncDisp] = useState(encInit);
  useEffect(() => setQuartos(quartosInit), [quartosInit]);
  useEffect(() => setServosDisp(servosInit), [servosInit]);
  useEffect(() => setEncDisp(encInit), [encInit]);

  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState("");
  // sem edição, a aba é travada no sexo do usuário (regra do original)
  const tabRestrita: Genero = sexoUsuario === "masculino" ? "masculino" : "feminino";
  const [aba, setAba] = useState<Genero>("feminino");
  const abaEfetiva = edit ? aba : tabRestrita;

  const [expandido, setExpandido] = useState<string | null>(null);
  const [sheetAberto, setSheetAberto] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(FORM_VAZIO);
  const [buscaServo, setBuscaServo] = useState<Record<string, string>>({});
  const [buscaEnc, setBuscaEnc] = useState<Record<string, string>>({});

  const doGenero = useMemo(
    () => quartos.filter((q) => q.genero === abaEfetiva),
    [quartos, abaEfetiva],
  );
  const maes = abaEfetiva === "feminino" ? doGenero.find((q) => q.is_maes) : undefined;
  const lista = doGenero.filter((q) => !q.is_maes);

  // stats do gênero ativo (inclui o quarto mães, como no original)
  const stats = useMemo(() => {
    const totalVagas = doGenero.reduce(
      (s, q) => s + q.limite_encontristas + q.limite_servos,
      0,
    );
    const preenchido = doGenero.reduce(
      (s, q) => s + q.servos.length + q.encontristas.length,
      0,
    );
    const pct = totalVagas > 0 ? Math.round((preenchido / totalVagas) * 100) : 0;
    return { livres: Math.max(0, totalVagas - preenchido), preenchido, pct };
  }, [doGenero]);

  const abrirNovo = () => {
    setEditId(null);
    setForm(FORM_VAZIO);
    setErro("");
    setSheetAberto(true);
  };

  const abrirEdicao = (q: QuartoRow) => {
    setEditId(q.id);
    setForm({
      numero: q.numero,
      limite_encontristas: String(q.limite_encontristas),
      limite_servos: String(q.limite_servos),
      is_maes: q.is_maes,
    });
    setErro("");
    setSheetAberto(true);
  };

  const salvarForm = () => {
    setErro("");
    const input = {
      numero: form.numero.trim(),
      genero: abaEfetiva,
      is_maes: form.is_maes,
      limite_encontristas: Math.max(0, parseInt(form.limite_encontristas, 10) || 0),
      limite_servos: Math.max(0, parseInt(form.limite_servos, 10) || 0),
    };
    startTransition(async () => {
      const res = editId ? await atualizarQuarto(editId, input) : await criarQuarto(input);
      if (!res.ok) return setErro(res.erro ?? "Não foi possível salvar.");
      setSheetAberto(false);
      if (editId) {
        setQuartos((prev) => prev.map((q) => (q.id === editId ? { ...q, ...input } : q)));
      } else {
        // sem o id real ainda; um refresh do RSC traz — atualização otimista simples
        setQuartos((prev) => [
          ...prev,
          { id: `tmp-${Date.now()}`, servos: [], encontristas: [], ...input },
        ]);
      }
    });
  };

  const remover = (q: QuartoRow) => {
    if (!confirm(`Deseja realmente excluir "Quarto ${q.numero}"?`)) return;
    setErro("");
    const anterior = quartos;
    setQuartos((prev) => prev.filter((x) => x.id !== q.id));
    startTransition(async () => {
      const res = await removerQuarto(q.id);
      if (!res.ok) {
        setQuartos(anterior);
        setErro(res.erro ?? "Não foi possível remover.");
      }
    });
  };

  const addServo = (q: QuartoRow, p: PessoaOption) => {
    setErro("");
    setQuartos((prev) =>
      prev.map((x) =>
        x.id === q.id ? { ...x, servos: [...x.servos, { id: p.id, nome: p.nome }] } : x,
      ),
    );
    setServosDisp((prev) => prev.filter((s) => s.id !== p.id));
    setBuscaServo((d) => ({ ...d, [q.id]: "" }));
    startTransition(async () => {
      const res = await adicionarServoQuarto(q.id, p.id);
      if (!res.ok) {
        setQuartos((prev) =>
          prev.map((x) =>
            x.id === q.id ? { ...x, servos: x.servos.filter((s) => s.id !== p.id) } : x,
          ),
        );
        setServosDisp((prev) => [...prev, p]);
        setErro(res.erro ?? "Não foi possível alocar o servo.");
      }
    });
  };

  const delServo = (q: QuartoRow, servoId: string, nome: string) => {
    setErro("");
    setQuartos((prev) =>
      prev.map((x) =>
        x.id === q.id ? { ...x, servos: x.servos.filter((s) => s.id !== servoId) } : x,
      ),
    );
    setServosDisp((prev) => [...prev, { id: servoId, nome, sexo: abaEfetiva }]);
    startTransition(async () => {
      const res = await removerServoQuarto(q.id, servoId);
      if (!res.ok) setErro(res.erro ?? "Não foi possível remover o servo.");
    });
  };

  const addEnc = (q: QuartoRow, p: PessoaOption) => {
    setErro("");
    setQuartos((prev) =>
      prev.map((x) =>
        x.id === q.id
          ? { ...x, encontristas: [...x.encontristas, { id: p.id, nome: p.nome }] }
          : x,
      ),
    );
    setEncDisp((prev) => prev.filter((e) => e.id !== p.id));
    setBuscaEnc((d) => ({ ...d, [q.id]: "" }));
    startTransition(async () => {
      const res = await adicionarEncQuarto(q.id, p.id);
      if (!res.ok) {
        setQuartos((prev) =>
          prev.map((x) =>
            x.id === q.id
              ? { ...x, encontristas: x.encontristas.filter((e) => e.id !== p.id) }
              : x,
          ),
        );
        setEncDisp((prev) => [...prev, p]);
        setErro(res.erro ?? "Não foi possível alocar.");
      }
    });
  };

  const delEnc = (q: QuartoRow, encId: string, nome: string) => {
    setErro("");
    setQuartos((prev) =>
      prev.map((x) =>
        x.id === q.id ? { ...x, encontristas: x.encontristas.filter((e) => e.id !== encId) } : x,
      ),
    );
    setEncDisp((prev) => [...prev, { id: encId, nome, sexo: abaEfetiva }]);
    startTransition(async () => {
      const res = await removerEncQuarto(q.id, encId);
      if (!res.ok) setErro(res.erro ?? "Não foi possível remover.");
    });
  };

  const exportarCSV = () => {
    // ambos os gêneros, como no original (Quarto | Nome | Camiseta)
    const cab = ["Ala", "Quarto", "Nome", "Camiseta"];
    const linhas: string[][] = [];
    for (const g of ["feminino", "masculino"] as Genero[]) {
      const qs = quartos
        .filter((q) => q.genero === g)
        .sort((a, b) => a.numero.localeCompare(b.numero, "pt-BR", { numeric: true }));
      for (const q of qs) {
        for (const e of [...q.encontristas].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")))
          linhas.push([
            g === "feminino" ? "Mulheres" : "Homens",
            q.is_maes ? "Quarto Mães" : `Quarto ${q.numero}`,
            e.nome,
            e.camiseta ?? "",
          ]);
      }
    }
    const csv = [cab, ...linhas]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "encontristas-por-quarto.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      {/* header */}
      <div className={`${cardCls} flex items-center justify-between p-4`}>
        <div className="flex items-center gap-2">
          <BedDouble size={20} className="text-raso" />
          <h1 className="font-display text-lg font-bold text-luz">Quartos</h1>
        </div>
        <span className="text-xs text-corrente">{doGenero.length} quartos</span>
      </div>

      {!edit && (
        <div
          className="rounded-card border px-4 py-3 text-center text-xs font-semibold"
          style={{ borderColor: "rgba(224,162,60,0.4)", background: "rgba(224,162,60,0.08)", color: "#e0a23c" }}
        >
          👀 Somente visualização
        </div>
      )}

      {erro && !sheetAberto && (
        <div
          className="rounded-card border px-4 py-3 text-sm"
          style={{ borderColor: "rgba(229,86,78,0.3)", background: "rgba(229,86,78,0.1)", color: "#f0a39e" }}
        >
          {erro}
        </div>
      )}

      {/* abas de gênero — só quem edita alterna */}
      {edit && (
        <div className="flex gap-2">
          {([
            ["feminino", "Mulheres"],
            ["masculino", "Homens"],
          ] as [Genero, string][]).map(([val, label]) => (
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
      )}

      {/* stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className={`${cardCls} p-4`} style={{ borderLeft: `3px solid ${OK}` }}>
          <p className="font-display text-2xl font-extrabold text-luz">{stats.livres}</p>
          <p className="mt-1 text-xs uppercase tracking-wide text-corrente">Vagas livres</p>
        </div>
        <div className={`${cardCls} p-4`} style={{ borderLeft: `3px solid ${corLotacao(stats.pct)}` }}>
          <p className="font-display text-2xl font-extrabold text-luz">{stats.preenchido}</p>
          <p className="mt-1 text-xs uppercase tracking-wide text-corrente">
            Preenchido ({stats.pct}%)
          </p>
        </div>
      </div>

      {edit && (
        <>
          <button
            onClick={exportarCSV}
            className="w-full rounded-control py-3 text-sm font-semibold text-white transition active:scale-[0.98]"
            style={{ background: OK }}
          >
            Exportar Excel (por quarto)
          </button>
          <button
            onClick={abrirNovo}
            className="flex w-full items-center justify-center gap-2 rounded-control border border-[rgba(164,214,232,0.18)] py-3 text-sm font-semibold text-corrente transition hover:text-luz active:scale-[0.98]"
          >
            <Plus size={15} /> Novo quarto
          </button>
        </>
      )}

      {/* Quarto Mães — card especial laranja, só na ala feminina */}
      {maes && (
        <CardQuarto
          q={maes}
          especial
          edit={edit}
          aberto={expandido === maes.id}
          onToggle={() => setExpandido((v) => (v === maes.id ? null : maes.id))}
          onEditar={() => abrirEdicao(maes)}
          onRemover={undefined /* fiel ao original: mães não tem lixeira */}
          servosDisp={servosDisp}
          encDisp={encDisp}
          buscaServo={buscaServo[maes.id] ?? ""}
          buscaEnc={buscaEnc[maes.id] ?? ""}
          setBuscaServo={(v) => setBuscaServo((d) => ({ ...d, [maes.id]: v }))}
          setBuscaEnc={(v) => setBuscaEnc((d) => ({ ...d, [maes.id]: v }))}
          abaEfetiva={abaEfetiva}
          pending={pending}
          addServo={addServo}
          delServo={delServo}
          addEnc={addEnc}
          delEnc={delEnc}
        />
      )}

      {/* lista */}
      <div className="space-y-2">
        {lista.length === 0 && !maes ? (
          <p className="py-8 text-center text-sm text-corrente">
            Nenhum quarto {abaEfetiva === "feminino" ? "feminino" : "masculino"} ainda.
          </p>
        ) : (
          lista.map((q) => (
            <CardQuarto
              key={q.id}
              q={q}
              edit={edit}
              aberto={expandido === q.id}
              onToggle={() => setExpandido((v) => (v === q.id ? null : q.id))}
              onEditar={() => abrirEdicao(q)}
              onRemover={() => remover(q)}
              servosDisp={servosDisp}
              encDisp={encDisp}
              buscaServo={buscaServo[q.id] ?? ""}
              buscaEnc={buscaEnc[q.id] ?? ""}
              setBuscaServo={(v) => setBuscaServo((d) => ({ ...d, [q.id]: v }))}
              setBuscaEnc={(v) => setBuscaEnc((d) => ({ ...d, [q.id]: v }))}
              abaEfetiva={abaEfetiva}
              pending={pending}
              addServo={addServo}
              delServo={delServo}
              addEnc={addEnc}
              delEnc={delEnc}
            />
          ))
        )}
      </div>

      {/* sheet criar/editar */}
      <BottomSheet
        titulo={editId ? "Editar quarto" : "Novo quarto"}
        aberto={sheetAberto}
        onClose={() => setSheetAberto(false)}
      >
        <div className="space-y-3">
          <div>
            <p className="mb-1 text-[11px] uppercase tracking-wide text-corrente">Número *</p>
            <input
              placeholder="Ex: 1"
              value={form.numero}
              onChange={(e) => setForm((v) => ({ ...v, numero: e.target.value }))}
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1 text-[11px] uppercase tracking-wide text-corrente">
                Camas — encontristas
              </p>
              <input
                type="number"
                min="0"
                value={form.limite_encontristas}
                onChange={(e) => setForm((v) => ({ ...v, limite_encontristas: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div>
              <p className="mb-1 text-[11px] uppercase tracking-wide text-corrente">
                Camas — servos
              </p>
              <input
                type="number"
                min="0"
                value={form.limite_servos}
                onChange={(e) => setForm((v) => ({ ...v, limite_servos: e.target.value }))}
                className={inputCls}
              />
            </div>
          </div>
          {abaEfetiva === "feminino" && (
            <button
              onClick={() => setForm((v) => ({ ...v, is_maes: !v.is_maes }))}
              className="flex w-full items-center justify-between rounded-control border px-3 py-2.5 text-sm font-semibold transition"
              style={
                form.is_maes
                  ? { borderColor: AVISO, color: AVISO, background: "rgba(255,159,10,0.08)" }
                  : { borderColor: "rgba(164,214,232,0.18)", color: "#416a87" }
              }
            >
              <span className="flex items-center gap-2">
                <Baby size={15} /> Quarto Mães
              </span>
              <span>{form.is_maes ? "Sim" : "Não"}</span>
            </button>
          )}
          {erro && (
            <p className="text-sm" style={{ color: "#f0a39e" }}>
              {erro}
            </p>
          )}
          <button
            onClick={salvarForm}
            disabled={pending}
            className="w-full rounded-control py-3.5 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
            style={{ background: OK }}
          >
            {pending ? "Salvando..." : editId ? "Salvar alterações" : "Criar quarto"}
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}

// ============ Card de quarto ============

function CardQuarto({
  q,
  especial = false,
  edit,
  aberto,
  onToggle,
  onEditar,
  onRemover,
  servosDisp,
  encDisp,
  buscaServo,
  buscaEnc,
  setBuscaServo,
  setBuscaEnc,
  abaEfetiva,
  pending,
  addServo,
  delServo,
  addEnc,
  delEnc,
}: {
  q: QuartoRow;
  especial?: boolean;
  edit: boolean;
  aberto: boolean;
  onToggle: () => void;
  onEditar: () => void;
  onRemover?: () => void;
  servosDisp: PessoaOption[];
  encDisp: PessoaOption[];
  buscaServo: string;
  buscaEnc: string;
  setBuscaServo: (v: string) => void;
  setBuscaEnc: (v: string) => void;
  abaEfetiva: Genero;
  pending: boolean;
  addServo: (q: QuartoRow, p: PessoaOption) => void;
  delServo: (q: QuartoRow, id: string, nome: string) => void;
  addEnc: (q: QuartoRow, p: PessoaOption) => void;
  delEnc: (q: QuartoRow, id: string, nome: string) => void;
}) {
  const total = q.limite_encontristas + q.limite_servos;
  const oc = q.servos.length + q.encontristas.length;
  const pct = total > 0 ? Math.min(100, Math.round((oc / total) * 100)) : 0;
  const lv = total - oc;
  const cor = especial ? AVISO : corLotacao(pct);

  const servoLotado = q.servos.length >= q.limite_servos;
  const encLotado = q.encontristas.length >= q.limite_encontristas;

  const sugestoesServo = buscaServo
    ? servosDisp
        .filter((s) => s.sexo === abaEfetiva)
        .filter((s) => s.nome.toLowerCase().includes(buscaServo.toLowerCase()))
        .slice(0, 6)
    : [];
  const sugestoesEnc = buscaEnc
    ? encDisp
        .filter((e) => e.sexo === abaEfetiva)
        .filter((e) => e.nome.toLowerCase().includes(buscaEnc.toLowerCase()))
        .slice(0, 6)
    : [];

  return (
    <div className={cardCls} style={{ borderLeft: `3px solid ${cor}` }}>
      {/* cabeçalho */}
      <button onClick={onToggle} className="flex w-full items-center justify-between gap-2 p-4 text-left">
        <p className="font-semibold text-luz">
          {especial ? "Quarto Mães" : `Quarto ${q.numero}`}
        </p>
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold"
          style={{ color: cor, background: `${cor}1f` }}
        >
          {oc}/{total}
        </span>
      </button>

      {/* barra de ocupação */}
      <div className="px-4 pb-3">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: cor }} />
        </div>
        <p className="mt-1 text-[11px] text-corrente">{lv > 0 ? `${lv} vagas` : "Lotado"}</p>
      </div>

      {aberto && (
        <div className="space-y-4 border-t border-[rgba(164,214,232,0.1)] px-4 py-4">
          {edit && (
            <div className="flex gap-2">
              <button
                onClick={onEditar}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-control border border-[rgba(164,214,232,0.18)] py-2 text-xs font-semibold text-corrente transition hover:text-luz"
              >
                <Pencil size={13} /> Editar quarto
              </button>
              {onRemover && (
                <button
                  onClick={onRemover}
                  disabled={pending}
                  aria-label="Excluir quarto"
                  className="flex h-8 w-10 items-center justify-center rounded-control border transition disabled:opacity-50"
                  style={{ borderColor: "rgba(229,86,78,0.4)", color: ALERTA }}
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          )}

          {/* servos */}
          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-corrente">
              Servos ({q.servos.length}/{q.limite_servos})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {q.servos.length === 0 && (
                <p className="text-xs italic text-corrente">Nenhum ainda</p>
              )}
              {q.servos.map((s) => (
                <Tag key={s.id} nome={s.nome} cor={OK} onDel={edit ? () => delServo(q, s.id, s.nome) : undefined} />
              ))}
            </div>
            {edit && servoLotado && q.limite_servos > 0 && (
              <p className="mt-2 text-xs italic text-corrente">
                Limite de {q.limite_servos} servos atingido.
              </p>
            )}
            {edit && !servoLotado && (
              <Autocomplete
                placeholder="Buscar servo..."
                valor={buscaServo}
                onChange={setBuscaServo}
                sugestoes={sugestoesServo}
                onPick={(p) => addServo(q, p)}
                vazio="Nenhum servo disponível"
              />
            )}
          </div>

          {/* encontristas / mães */}
          <div>
            <p className="mb-2 text-xs uppercase tracking-wide text-corrente">
              {especial ? "Mães" : "Encontristas"} ({q.encontristas.length}/{q.limite_encontristas})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {q.encontristas.length === 0 && (
                <p className="text-xs italic text-corrente">Nenhum ainda</p>
              )}
              {q.encontristas.map((e) => (
                <Tag
                  key={e.id}
                  nome={e.nome}
                  cor={especial ? AVISO : "#a4d6e8"}
                  onDel={edit ? () => delEnc(q, e.id, e.nome) : undefined}
                />
              ))}
            </div>
            {edit && !encLotado && (
              <Autocomplete
                placeholder={especial ? "Buscar mãe (check-in feito)..." : "Buscar encontrista (check-in feito)..."}
                valor={buscaEnc}
                onChange={setBuscaEnc}
                sugestoes={sugestoesEnc}
                onPick={(p) => addEnc(q, p)}
                vazio="Ninguém disponível (só entra quem fez check-in)"
              />
            )}
            {edit && encLotado && q.limite_encontristas > 0 && (
              <p className="mt-2 text-xs italic text-corrente">Camas de encontrista esgotadas.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Tag({ nome, cor, onDel }: { nome: string; cor: string; onDel?: () => void }) {
  return (
    <span
      className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ color: cor, background: `${cor}1a`, border: `1px solid ${cor}44` }}
    >
      {nome}
      {onDel && (
        <button onClick={onDel} aria-label={`Remover ${nome}`} className="ml-0.5 opacity-70 hover:opacity-100">
          <X size={12} />
        </button>
      )}
    </span>
  );
}

function Autocomplete({
  placeholder,
  valor,
  onChange,
  sugestoes,
  onPick,
  vazio,
}: {
  placeholder: string;
  valor: string;
  onChange: (v: string) => void;
  sugestoes: PessoaOption[];
  onPick: (p: PessoaOption) => void;
  vazio: string;
}) {
  return (
    <div className="relative mt-2">
      <input
        placeholder={placeholder}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className={
          "w-full rounded-control border border-[rgba(164,214,232,0.18)] bg-[rgba(0,14,33,0.6)] px-3 py-2 text-sm text-luz outline-none placeholder:text-corrente focus:border-raso"
        }
      />
      {valor && (
        <div className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-control border border-[rgba(164,214,232,0.2)] bg-breu shadow-glow">
          {sugestoes.length === 0 ? (
            <p className="px-3 py-2 text-xs italic text-corrente">{vazio}</p>
          ) : (
            sugestoes.map((p) => (
              <button
                key={p.id}
                onMouseDown={() => onPick(p)}
                className="block w-full px-3 py-2 text-left text-sm text-luz transition hover:bg-white/5"
              >
                {p.nome}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
