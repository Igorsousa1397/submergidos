"use client";

import { useEffect, useState, useTransition } from "react";
import { Search, Plus, X, Trash2 } from "lucide-react";
import { registrarAchado, alternarEntregue, removerAchado } from "../actions";
import type { AchadoRow } from "../queries";

const OK = "#12b5a6";
const ROXO = "#bf5af2"; // cor dos itens não entregues no original

const cardCls = "rounded-card border border-[rgba(164,214,232,0.12)] bg-[rgba(0,14,33,0.5)]";
const inputCls =
  "w-full rounded-control border border-[rgba(164,214,232,0.18)] bg-[rgba(0,14,33,0.6)] px-3 py-2.5 text-sm text-luz outline-none placeholder:text-corrente focus:border-raso";

const fmtQuando = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} · ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
};

export function AchadosView({ achados: init, admin }: { achados: AchadoRow[]; admin: boolean }) {
  const [rows, setRows] = useState(init);
  useEffect(() => setRows(init), [init]);

  const [sh, setSh] = useState(false);
  const [f, setF] = useState({ item: "", local: "", dono: "" });
  const [erro, setErro] = useState("");
  const [pending, startTransition] = useTransition();

  const pendentes = rows.filter((a) => !a.entregue).length;

  const registrar = () => {
    if (!f.item.trim() || pending) return;
    setErro("");
    const temp: AchadoRow = {
      id: `tmp-${Date.now()}`,
      item: f.item.trim(),
      local: f.local.trim() || null,
      dono: f.dono.trim() || null,
      entregue: false,
      entregue_at: null,
      criado_por_nome: "Você",
      created_at: new Date().toISOString(),
    };
    setRows((prev) => [temp, ...prev]);
    setF({ item: "", local: "", dono: "" });
    setSh(false);
    startTransition(async () => {
      const res = await registrarAchado(temp.item, temp.local ?? "", temp.dono ?? "");
      if (!res.ok) {
        setRows((prev) => prev.filter((a) => a.id !== temp.id));
        setErro(res.erro ?? "Não foi possível registrar.");
      }
    });
  };

  const alternar = (a: AchadoRow) => {
    setErro("");
    const entregue = !a.entregue;
    setRows((prev) =>
      prev.map((x) =>
        x.id === a.id
          ? { ...x, entregue, entregue_at: entregue ? new Date().toISOString() : null }
          : x,
      ),
    );
    startTransition(async () => {
      const res = await alternarEntregue(a.id, entregue);
      if (!res.ok) {
        setRows((prev) => prev.map((x) => (x.id === a.id ? a : x)));
        setErro(res.erro ?? "Não foi possível salvar.");
      }
    });
  };

  const remover = (a: AchadoRow) => {
    if (!confirm(`Remover "${a.item}" da lista?`)) return;
    setErro("");
    const anterior = rows;
    setRows((prev) => prev.filter((x) => x.id !== a.id));
    startTransition(async () => {
      const res = await removerAchado(a.id);
      if (!res.ok) {
        setRows(anterior);
        setErro(res.erro ?? "Não foi possível remover.");
      }
    });
  };

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      {/* header */}
      <div className={`${cardCls} flex items-center justify-between p-4`}>
        <div className="flex items-center gap-2">
          <Search size={20} className="text-raso" />
          <h1 className="font-display text-lg font-bold text-luz">Achados & Perdidos</h1>
        </div>
        {rows.length > 0 && (
          <span className="text-xs text-corrente">
            <b className="text-luz">{pendentes}</b> aguardando dono
          </span>
        )}
      </div>

      {erro && (
        <div
          className="rounded-card border px-4 py-3 text-sm"
          style={{ borderColor: "rgba(229,86,78,0.3)", background: "rgba(229,86,78,0.1)", color: "#f0a39e" }}
        >
          {erro}
        </div>
      )}

      {/* registrar */}
      <button
        onClick={() => setSh((v) => !v)}
        className="flex w-full items-center justify-center gap-2 rounded-control py-3 text-sm font-bold transition active:scale-[0.98]"
        style={
          sh
            ? { background: "rgba(164,214,232,0.12)", color: "#a4d6e8" }
            : { background: ROXO, color: "#fff" }
        }
      >
        {sh ? (
          <>
            <X size={15} /> Cancelar
          </>
        ) : (
          <>
            <Plus size={15} /> Registrar Item Encontrado
          </>
        )}
      </button>

      {sh && (
        <div className={`${cardCls} space-y-3 p-4`}>
          <input
            placeholder="Item *"
            value={f.item}
            onChange={(e) => setF((v) => ({ ...v, item: e.target.value }))}
            className={inputCls}
          />
          <input
            placeholder="Onde foi encontrado"
            value={f.local}
            onChange={(e) => setF((v) => ({ ...v, local: e.target.value }))}
            className={inputCls}
          />
          <input
            placeholder="Dono (se souber)"
            value={f.dono}
            onChange={(e) => setF((v) => ({ ...v, dono: e.target.value }))}
            className={inputCls}
          />
          <button
            onClick={registrar}
            disabled={pending || !f.item.trim()}
            className="w-full rounded-control py-3 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
            style={{ background: OK }}
          >
            Registrar
          </button>
        </div>
      )}

      {/* lista */}
      {rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-corrente">Nenhum item.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((a) => {
            const cor = a.entregue ? OK : ROXO;
            return (
              <div key={a.id} className={cardCls} style={{ borderLeft: `3px solid ${cor}` }}>
                <div className="flex items-start justify-between gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-luz">🔎 {a.item}</p>
                    {a.local && <p className="mt-0.5 text-xs text-corrente">📍 {a.local}</p>}
                    {a.dono && <p className="mt-0.5 text-xs text-corrente">👤 Dono: {a.dono}</p>}
                    <p className="mt-1 text-[11px] text-corrente">
                      🕐 {fmtQuando(a.created_at)}
                      {a.criado_por_nome ? ` · por ${a.criado_por_nome}` : ""}
                    </p>
                    {a.entregue && (
                      <p className="mt-0.5 text-[11px]" style={{ color: OK }}>
                        ✓ Entregue{a.entregue_at ? ` às ${fmtQuando(a.entregue_at)}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <button
                      onClick={() => alternar(a)}
                      disabled={pending}
                      className="rounded-control border px-2.5 py-1.5 text-[11px] font-bold transition active:scale-[0.98] disabled:opacity-50"
                      style={{ borderColor: `${cor}55`, color: cor, background: `${cor}12` }}
                    >
                      {a.entregue ? "✓ Entregue" : "Marcar entregue"}
                    </button>
                    {admin && (
                      <button
                        onClick={() => remover(a)}
                        disabled={pending}
                        aria-label="Remover item"
                        className="flex h-7 w-7 items-center justify-center rounded-control border transition disabled:opacity-50"
                        style={{ borderColor: "rgba(229,86,78,0.4)", color: "#e5564e" }}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
