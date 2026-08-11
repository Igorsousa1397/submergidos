"use client";

import { useEffect, useState, useTransition } from "react";
import { Megaphone, Send } from "lucide-react";
import { criarAviso, removerAviso } from "../actions";
import type { AvisoRow, AvisoPublico } from "../queries";

const OK = "#12b5a6";
const AZUL = "#0a84ff";
const ROSA = "#ff2d92";

const cardCls = "rounded-card border border-[rgba(164,214,232,0.12)] bg-[rgba(0,14,33,0.5)]";
const inputCls =
  "w-full rounded-control border border-[rgba(164,214,232,0.18)] bg-[rgba(0,14,33,0.6)] px-3 py-2.5 text-sm text-luz outline-none placeholder:text-corrente focus:border-raso";

// Templates portados do app original.
const TEMPLATES = [
  "⏰ Faltam 15 minutos para o Ato. Preparem-se!",
  "⏰ Faltam 10 minutos para o Ato. Preparem-se!",
  "⏰ Faltam 5 minutos para o Ato. Preparem-se!",
  "☕ Café da Manhã às 08h30.",
  "🍽️ Almoço às 13h. Retorno às 15h30.",
  "☕ Café da tarde às 16h40.",
  "🍽️ Jantar às 20h.",
  "🍽️ Almoço às 13h30. Retorno às 15h.",
  "📢 Recados pós encontro. Obrigado por servir!",
  "🙏 Jejum - Lembre-se: retire ao menos 1 refeição por dia e mantenha 6h de jejum. Deus honra cada sacrifício! 💚",
];

const PUBLICOS: [AvisoPublico, string][] = [
  ["todos", "Todos"],
  ["homens", "Homens"],
  ["mulheres", "Mulheres"],
];

const fmtQuando = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })} · ${d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;
};

export function AvisosView({
  avisos: avisosInit,
  podeAvisos,
}: {
  avisos: AvisoRow[];
  podeAvisos: boolean;
}) {
  const [avisos, setAvisos] = useState(avisosInit);
  useEffect(() => setAvisos(avisosInit), [avisosInit]);

  const [texto, setTexto] = useState("");
  const [publico, setPublico] = useState<AvisoPublico>("todos");
  const [erro, setErro] = useState("");
  const [pending, startTransition] = useTransition();

  const publicar = () => {
    const txt = texto.trim();
    if (!txt || pending) return;
    setErro("");
    setTexto("");
    // otimista: entra no topo com dados locais; o refresh do RSC consolida
    const temp: AvisoRow = {
      id: `tmp-${Date.now()}`,
      texto: txt,
      publico,
      created_at: new Date().toISOString(),
      autor: "Você",
      autorPerfil: null,
    };
    setAvisos((prev) => [temp, ...prev]);
    startTransition(async () => {
      const res = await criarAviso(txt, publico);
      if (!res.ok) {
        setAvisos((prev) => prev.filter((a) => a.id !== temp.id));
        setTexto(txt);
        setErro(res.erro ?? "Não foi possível publicar.");
      }
    });
  };

  const excluir = (a: AvisoRow) => {
    if (!confirm("Excluir este aviso?")) return;
    setErro("");
    const anterior = avisos;
    setAvisos((prev) => prev.filter((x) => x.id !== a.id));
    startTransition(async () => {
      const res = await removerAviso(a.id);
      if (!res.ok) {
        setAvisos(anterior);
        setErro(res.erro ?? "Não foi possível excluir.");
      }
    });
  };

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      {/* header */}
      <div className={`${cardCls} flex items-center justify-between p-4`}>
        <div className="flex items-center gap-2">
          <Megaphone size={20} className="text-raso" />
          <h1 className="font-display text-lg font-bold text-luz">Avisos</h1>
        </div>
        <span className="text-xs text-corrente">{avisos.length} publicados</span>
      </div>

      {erro && (
        <div
          className="rounded-card border px-4 py-3 text-sm"
          style={{ borderColor: "rgba(229,86,78,0.3)", background: "rgba(229,86,78,0.1)", color: "#f0a39e" }}
        >
          {erro}
        </div>
      )}

      {/* composer — só quem pode publicar */}
      {podeAvisos && (
        <div className={`${cardCls} space-y-3 p-4`}>
          <select
            value=""
            onChange={(e) => {
              if (e.target.value) setTexto(e.target.value);
            }}
            className={inputCls}
          >
            <option value="">Usar template de aviso...</option>
            {TEMPLATES.map((t) => (
              <option key={t} value={t}>
                {t.length > 50 ? `${t.slice(0, 50)}...` : t}
              </option>
            ))}
          </select>

          <div className="flex gap-2">
            {PUBLICOS.map(([val, label]) => (
              <button
                key={val}
                onClick={() => setPublico(val)}
                className="flex-1 rounded-control border py-2 text-xs font-bold transition"
                style={
                  publico === val
                    ? { borderColor: AZUL, color: AZUL, background: "rgba(10,132,255,0.12)" }
                    : { borderColor: "rgba(164,214,232,0.18)", color: "#416a87" }
                }
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              placeholder="Escrever aviso..."
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && publicar()}
              className={inputCls}
            />
            <button
              onClick={publicar}
              disabled={pending || !texto.trim()}
              aria-label="Publicar aviso"
              className="flex shrink-0 items-center justify-center rounded-control px-4 text-white transition active:scale-[0.98] disabled:opacity-40"
              style={{ background: OK }}
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {/* lista */}
      {avisos.length === 0 ? (
        <p className="py-10 text-center text-sm text-corrente">Nenhum aviso no momento. ✓</p>
      ) : (
        <div className="space-y-2">
          {avisos.map((a) => (
            <div key={a.id} className={cardCls} style={{ borderLeft: `3px solid ${OK}` }}>
              <div className="p-4">
                <p className="text-sm leading-relaxed text-luz">{a.texto}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-corrente">
                  <span>
                    {a.autor ?? "—"}
                    {a.autorPerfil ? ` · ${a.autorPerfil}` : ""} · {fmtQuando(a.created_at)}
                  </span>
                  {a.publico === "homens" && <Pill texto="Homens" cor={AZUL} />}
                  {a.publico === "mulheres" && <Pill texto="Mulheres" cor={ROSA} />}
                </div>
                {podeAvisos && (
                  <button
                    onClick={() => excluir(a)}
                    disabled={pending}
                    className="mt-2 text-xs font-bold transition disabled:opacity-50"
                    style={{ color: "rgba(229,86,78,0.7)" }}
                  >
                    Excluir
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
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
