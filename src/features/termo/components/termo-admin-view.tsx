"use client";

import { useMemo, useState, useTransition } from "react";
import { gerarUrlPdf } from "../actions-admin";
import type { TermoRow } from "../queries-admin";

const OK = "#12b5a6"; // verde (assinados)
const AVISO = "#e0a23c"; // laranja (aguardando)

const sexoLabel = (s: TermoRow["sexo"]) =>
  s === "masculino" ? "Masculino" : s === "feminino" ? "Feminino" : "—";

const fmtAssinado = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const data = d.toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" });
  const hora = d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `Assinado em ${data} às ${hora}`;
};

export function TermoAdminView({ termos }: { termos: TermoRow[] }) {
  const [aba, setAba] = useState<"aguardando" | "assinados">("aguardando");
  const [busca, setBusca] = useState("");
  const [pending, startTransition] = useTransition();

  const aguardando = useMemo(
    () => termos.filter((t) => !t.termo_assinado_at),
    [termos],
  );
  const assinados = useMemo(
    () => termos.filter((t) => t.termo_assinado_at),
    [termos],
  );

  const lista = useMemo(() => {
    const base = aba === "aguardando" ? aguardando : assinados;
    const q = busca.trim().toLowerCase();
    return q ? base.filter((t) => t.nome.toLowerCase().includes(q)) : base;
  }, [aba, aguardando, assinados, busca]);

  const abrirPdf = (path: string | null) => {
    if (!path) return;
    startTransition(async () => {
      const url = await gerarUrlPdf(path);
      if (url) window.open(url, "_blank", "noopener,noreferrer");
    });
  };

  const baixarTodos = () => {
    const comPdf = assinados.filter((t) => t.termo_pdf_path);
    startTransition(async () => {
      for (const t of comPdf) {
        const url = await gerarUrlPdf(t.termo_pdf_path!);
        if (url) window.open(url, "_blank", "noopener,noreferrer");
        await new Promise((r) => setTimeout(r, 400)); // evita o bloqueio de pop-ups
      }
    });
  };

  const qtdPdfs = assinados.filter((t) => t.termo_pdf_path).length;

  return (
    <div data-zone="deep" className="mx-auto w-full max-w-md space-y-4 px-4 py-6">
      {/* abas */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setAba("aguardando")}
          className="rounded-control py-2 text-sm font-semibold transition"
          style={
            aba === "aguardando"
              ? { background: AVISO, color: "#000" }
              : { border: "1px solid rgba(164,214,232,0.18)", color: "rgba(220,241,248,.6)" }
          }
        >
          Aguardando ({aguardando.length})
        </button>
        <button
          onClick={() => setAba("assinados")}
          className="rounded-control py-2 text-sm font-semibold transition"
          style={
            aba === "assinados"
              ? { background: OK, color: "#000" }
              : { border: "1px solid rgba(164,214,232,0.18)", color: "rgba(220,241,248,.6)" }
          }
        >
          Assinados ({assinados.length})
        </button>
      </div>

      {/* busca */}
      <input
        type="text"
        placeholder="Buscar por nome..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="w-full rounded-control border border-[rgba(164,214,232,0.18)] bg-[rgba(0,14,33,0.6)] px-3 py-3 text-sm text-luz outline-none focus:border-raso"
      />

      {/* baixar todos — só na aba assinados */}
      {aba === "assinados" && qtdPdfs > 0 && (
        <button
          onClick={baixarTodos}
          disabled={pending}
          className="w-full rounded-control border py-3 text-center text-sm font-semibold transition active:scale-[0.98] disabled:opacity-50"
          style={{ borderColor: OK, color: OK }}
        >
          ↓ Baixar todos ({qtdPdfs} PDFs)
        </button>
      )}

      {/* lista */}
      {lista.length === 0 && (
        <p className="py-8 text-center text-sm text-corrente">
          {aba === "aguardando" ? "Ninguém aguardando assinatura." : "Nenhum termo assinado ainda."}
        </p>
      )}

      {lista.map((t) => {
        const cor = aba === "aguardando" ? AVISO : OK;
        return (
          <div
            key={t.id}
            className="rounded-card border border-[rgba(164,214,232,0.1)] bg-[rgba(0,14,33,0.4)] p-4"
            style={{ borderLeft: `3px solid ${cor}` }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-luz">{t.nome}</p>
                <p className="text-xs text-corrente">
                  {sexoLabel(t.sexo)} · {t.igreja ?? "—"}
                </p>
                {aba === "aguardando" ? (
                  <p className="mt-1 text-xs" style={{ color: AVISO }}>
                    Inscrito · aguardando assinatura
                  </p>
                ) : (
                  <p className="mt-1 text-xs" style={{ color: OK }}>
                    ✓ {fmtAssinado(t.termo_assinado_at)}
                  </p>
                )}
              </div>
              {aba === "assinados" && t.termo_pdf_path && (
                <button
                  onClick={() => abrirPdf(t.termo_pdf_path)}
                  disabled={pending}
                  className="shrink-0 rounded-control border px-3 py-2 text-xs font-semibold transition active:scale-[0.98] disabled:opacity-50"
                  style={{ borderColor: "rgba(164,214,232,0.18)", color: "rgba(220,241,248,.6)" }}
                >
                  Exportar PDF
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}