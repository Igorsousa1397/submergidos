"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Stethoscope, Plus, X, Trash2, Search } from "lucide-react";
import { criarRegistroSaude, removerRegistroSaude } from "../actions";
import type { SaudeData } from "../queries";

const OK = "#12b5a6";
const ALERTA = "#e5564e";

const cardCls = "rounded-card border border-[rgba(164,214,232,0.12)] bg-[rgba(0,14,33,0.5)]";
const inputCls =
  "w-full rounded-control border border-[rgba(164,214,232,0.18)] bg-[rgba(0,14,33,0.6)] px-3 py-2.5 text-sm text-luz outline-none placeholder:text-corrente focus:border-raso";

export function SaudeView({ dados }: { dados: SaudeData }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState("");
  const [busca, setBusca] = useState("");
  const [sh, setSh] = useState(false);
  const [f, setF] = useState({ nome: "", quarto: "", condicao: "", obs: "" });

  const rodar = (fn: () => Promise<{ ok: boolean; erro?: string }>) => {
    setErro("");
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setErro(res.erro ?? "Não foi possível salvar.");
      router.refresh();
    });
  };

  const q = busca.trim().toLowerCase();
  const encontristas = useMemo(
    () => dados.encontristas.filter((e) => !q || e.nome.toLowerCase().includes(q)),
    [dados.encontristas, q],
  );
  const registros = useMemo(
    () => dados.registros.filter((r) => !q || r.nome.toLowerCase().includes(q)),
    [dados.registros, q],
  );

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <div className={`${cardCls} flex items-center justify-between p-4`}>
        <div className="flex items-center gap-2">
          <Stethoscope size={20} className="text-raso" />
          <h1 className="font-display text-lg font-bold text-luz">Saúde</h1>
        </div>
        <span className="text-xs text-corrente">
          {dados.encontristas.length + dados.registros.length} registros
        </span>
      </div>

      {/* aviso de sensibilidade (do original) */}
      <div
        className="rounded-card border px-4 py-3 text-xs leading-relaxed"
        style={{ borderColor: "rgba(229,86,78,0.2)", background: "rgba(229,86,78,0.06)", color: "#c98a86" }}
      >
        🩺 Condições de saúde e necessidades especiais. Visível apenas para a equipe
        responsável — trate com confidencialidade.
      </div>

      {erro && (
        <div
          className="rounded-card border px-4 py-3 text-sm"
          style={{ borderColor: "rgba(229,86,78,0.3)", background: "rgba(229,86,78,0.1)", color: "#f0a39e" }}
        >
          {erro}
        </div>
      )}

      {/* adicionar registro manual */}
      <button
        onClick={() => setSh((v) => !v)}
        className="flex w-full items-center justify-center gap-2 rounded-control border border-[rgba(164,214,232,0.18)] py-3 text-sm font-semibold text-corrente transition hover:text-luz active:scale-[0.98]"
      >
        {sh ? (
          <>
            <X size={15} /> Cancelar
          </>
        ) : (
          <>
            <Plus size={15} /> Adicionar registro
          </>
        )}
      </button>

      {sh && (
        <div className={`${cardCls} space-y-3 p-4`}>
          <input
            placeholder="Nome *"
            value={f.nome}
            onChange={(e) => setF((v) => ({ ...v, nome: e.target.value }))}
            className={inputCls}
          />
          <div className="grid grid-cols-2 gap-3">
            <input
              placeholder="Quarto"
              value={f.quarto}
              onChange={(e) => setF((v) => ({ ...v, quarto: e.target.value }))}
              className={inputCls}
            />
            <input
              placeholder="Condição * (ex: diabética)"
              value={f.condicao}
              onChange={(e) => setF((v) => ({ ...v, condicao: e.target.value }))}
              className={inputCls}
            />
          </div>
          <textarea
            placeholder="Obs..."
            rows={2}
            value={f.obs}
            onChange={(e) => setF((v) => ({ ...v, obs: e.target.value }))}
            className={inputCls}
          />
          <button
            onClick={() => {
              if (!f.nome.trim() || !f.condicao.trim()) return;
              rodar(() => criarRegistroSaude(f.nome, f.quarto, f.condicao, f.obs));
              setF({ nome: "", quarto: "", condicao: "", obs: "" });
              setSh(false);
            }}
            disabled={pending || !f.nome.trim() || !f.condicao.trim()}
            className="w-full rounded-control py-3 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
            style={{ background: OK }}
          >
            Salvar
          </button>
        </div>
      )}

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

      {/* registros manuais */}
      {registros.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-wide text-corrente">Registros manuais</p>
          {registros.map((r) => (
            <div key={r.id} className={cardCls} style={{ borderLeft: `3px solid ${ALERTA}` }}>
              <div className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-luz">{r.nome}</p>
                  <p className="mt-0.5 text-xs text-corrente">
                    {r.quarto ? `🛏 Quarto ${r.quarto} · ` : ""}🩺 {r.condicao}
                  </p>
                  {r.obs && <p className="mt-1 text-xs leading-relaxed text-corrente">{r.obs}</p>}
                  {r.criado_por_nome && (
                    <p className="mt-1 text-[11px] text-corrente">por {r.criado_por_nome}</p>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (!confirm(`Remover o registro de ${r.nome}?`)) return;
                    rodar(() => removerRegistroSaude(r.id));
                  }}
                  disabled={pending}
                  aria-label="Remover registro"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control border transition disabled:opacity-50"
                  style={{ borderColor: "rgba(229,86,78,0.4)", color: ALERTA }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* da inscrição */}
      <div className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-corrente">
          Declarado na inscrição ({encontristas.length})
        </p>
        {encontristas.length === 0 ? (
          <p className="py-6 text-center text-sm text-corrente">
            Nenhum encontrista com condição declarada.
          </p>
        ) : (
          encontristas.map((e) => (
            <div key={e.id} className={cardCls} style={{ borderLeft: `3px solid ${ALERTA}` }}>
              <div className="space-y-1 p-4">
                <p className="text-sm font-bold text-luz">{e.nome}</p>
                <p className="text-xs text-corrente">
                  {e.celula || "Sem célula"}
                  {e.quarto ? ` · 🛏 Quarto ${e.quarto}` : ""}
                </p>
                {e.medicamento && (
                  <p className="text-xs text-luz">
                    💊 <span className="text-corrente">Medicamento:</span> {e.medicamento}
                  </p>
                )}
                {e.doenca_cronica && (
                  <p className="text-xs text-luz">
                    🩺 <span className="text-corrente">Doença crônica:</span> {e.doenca_cronica}
                  </p>
                )}
                {e.emergencia && (
                  <p className="text-xs text-luz">
                    🆘 <span className="text-corrente">Emergência:</span> {e.emergencia}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
