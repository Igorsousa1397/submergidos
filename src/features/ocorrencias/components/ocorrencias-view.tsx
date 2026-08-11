"use client";

import { useEffect, useState, useTransition } from "react";
import { AlertTriangle, Plus, X } from "lucide-react";
import { registrarOcorrencia, alternarResolvida } from "../actions";
import type { OcorrenciaRow } from "../queries";

const OK = "#12b5a6";
const LARANJA = "#ff9f0a";

const cardCls = "rounded-card border border-[rgba(164,214,232,0.12)] bg-[rgba(0,14,33,0.5)]";
const inputCls =
  "w-full rounded-control border border-[rgba(164,214,232,0.18)] bg-[rgba(0,14,33,0.6)] px-3 py-2.5 text-sm text-luz outline-none placeholder:text-corrente focus:border-raso";

// Tipos do app original.
const TIPOS = [
  "🚽 Banheiro entupido",
  "🚿 Chuveiro quebrado",
  "🛏️ Cama quebrada",
  "💡 Elétrico",
  "🚪 Porta",
  "⚠️ Outro",
];

const fmtQuando = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} · ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
};

export function OcorrenciasView({ ocorrencias: init }: { ocorrencias: OcorrenciaRow[] }) {
  const [rows, setRows] = useState(init);
  useEffect(() => setRows(init), [init]);

  const [sh, setSh] = useState(false);
  const [f, setF] = useState({ tipo: "", local: "", desc: "" });
  const [erro, setErro] = useState("");
  const [pending, startTransition] = useTransition();

  const abertas = rows.filter((o) => !o.resolvido).length;

  const registrar = () => {
    if (!f.tipo || pending) return;
    setErro("");
    const temp: OcorrenciaRow = {
      id: `tmp-${Date.now()}`,
      tipo: f.tipo,
      local: f.local.trim() || null,
      descricao: f.desc.trim() || null,
      resolvido: false,
      resolvido_at: null,
      resolvido_por_nome: null,
      created_at: new Date().toISOString(),
    };
    setRows((prev) => [temp, ...prev]);
    setF({ tipo: "", local: "", desc: "" });
    setSh(false);
    startTransition(async () => {
      const res = await registrarOcorrencia(temp.tipo ?? "", temp.local ?? "", temp.descricao ?? "");
      if (!res.ok) {
        setRows((prev) => prev.filter((o) => o.id !== temp.id));
        setErro(res.erro ?? "Não foi possível registrar.");
      }
    });
  };

  const alternar = (o: OcorrenciaRow) => {
    setErro("");
    const resolver = !o.resolvido;
    setRows((prev) =>
      prev.map((x) =>
        x.id === o.id
          ? {
              ...x,
              resolvido: resolver,
              resolvido_por_nome: resolver ? "Você" : null,
              resolvido_at: resolver ? new Date().toISOString() : null,
            }
          : x,
      ),
    );
    startTransition(async () => {
      const res = await alternarResolvida(o.id, resolver);
      if (!res.ok) {
        setRows((prev) => prev.map((x) => (x.id === o.id ? o : x)));
        setErro(res.erro ?? "Não foi possível salvar.");
      }
    });
  };

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      {/* header */}
      <div className={`${cardCls} flex items-center justify-between p-4`}>
        <div className="flex items-center gap-2">
          <AlertTriangle size={20} className="text-raso" />
          <h1 className="font-display text-lg font-bold text-luz">Ocorrências</h1>
        </div>
        {rows.length > 0 && (
          <span className="text-xs text-corrente">
            <b className="text-luz">{abertas}</b> não resolvida{abertas === 1 ? "" : "s"} de{" "}
            <b className="text-luz">{rows.length}</b>
          </span>
        )}
      </div>

      {/* registrar — botão laranja como no original */}
      <button
        onClick={() => setSh((v) => !v)}
        className="flex w-full items-center justify-center gap-2 rounded-control py-3 text-sm font-bold text-white transition active:scale-[0.98]"
        style={
          sh
            ? { background: "rgba(164,214,232,0.12)", color: "#a4d6e8" }
            : { background: "linear-gradient(135deg,#ff9f0a,#ff6b00)" }
        }
      >
        {sh ? (
          <>
            <X size={15} /> Cancelar
          </>
        ) : (
          <>
            <Plus size={15} /> Registrar Ocorrência
          </>
        )}
      </button>

      {erro && (
        <div
          className="rounded-card border px-4 py-3 text-sm"
          style={{ borderColor: "rgba(229,86,78,0.3)", background: "rgba(229,86,78,0.1)", color: "#f0a39e" }}
        >
          {erro}
        </div>
      )}

      {/* form */}
      {sh && (
        <div className={`${cardCls} space-y-3 p-4`}>
          <select
            value={f.tipo}
            onChange={(e) => setF((v) => ({ ...v, tipo: e.target.value }))}
            className={inputCls}
          >
            <option value="">Tipo *</option>
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            placeholder="Local (ex: Quarto 8)"
            value={f.local}
            onChange={(e) => setF((v) => ({ ...v, local: e.target.value }))}
            className={inputCls}
          />
          <textarea
            placeholder="Descrição..."
            rows={3}
            value={f.desc}
            onChange={(e) => setF((v) => ({ ...v, desc: e.target.value }))}
            className={inputCls}
          />
          <button
            onClick={registrar}
            disabled={pending || !f.tipo}
            className="w-full rounded-control py-3 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
            style={{ background: OK }}
          >
            Registrar
          </button>
        </div>
      )}

      {/* lista */}
      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-corrente">Nenhuma ocorrência. Tudo certo! ✓</p>
      ) : (
        <div className="space-y-2">
          {rows.map((o) => {
            const cor = o.resolvido ? OK : LARANJA;
            return (
              <div key={o.id} className={cardCls} style={{ borderLeft: `3px solid ${cor}` }}>
                <div className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-luz">{o.tipo}</p>
                    {o.local && <p className="mt-0.5 text-xs text-corrente">📍 {o.local}</p>}
                    {o.descricao && (
                      <p className="mt-1 text-xs leading-relaxed text-corrente">{o.descricao}</p>
                    )}
                    <p className="mt-1.5 text-[11px] text-corrente">🕐 {fmtQuando(o.created_at)}</p>
                    {o.resolvido && o.resolvido_por_nome && (
                      <p className="mt-0.5 text-[11px]" style={{ color: OK }}>
                        ✓ Resolvido por {o.resolvido_por_nome}
                        {o.resolvido_at ? ` às ${fmtQuando(o.resolvido_at)}` : ""}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => alternar(o)}
                    disabled={pending}
                    className="shrink-0 rounded-control border px-2.5 py-1.5 text-[11px] font-bold transition active:scale-[0.98] disabled:opacity-50"
                    style={{ borderColor: `${cor}55`, color: cor, background: `${cor}12` }}
                  >
                    {o.resolvido ? "✓ OK" : "Resolver"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
