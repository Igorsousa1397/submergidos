"use client";

import { useState } from "react";
import { BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import type { MinistracaoRow } from "../shared";

// Lista do cronograma de ministrações. Cabeçalho sempre visível (número,
// título, quando · ministrante) e o conteúdo — texto, tema, ato profético e
// direção — abre ao toque: são 7 ministrações e o servo precisa achar a dele
// rápido no meio do encontro.

const cardCls = "rounded-card border border-[rgba(164,214,232,0.12)] bg-[rgba(0,14,33,0.5)]";
const CORES = ["#0a84ff", "#12b5a6", "#bf5af2", "#4ea8d8", "#ff9f0a", "#64b5f6", "#12b5a6"];

export function MinistracoesLista({ itens }: { itens: MinistracaoRow[] }) {
  if (itens.length === 0)
    return (
      <p className="py-8 text-center text-sm text-corrente">
        As ministrações ainda não foram publicadas.
      </p>
    );

  return (
    <div className="space-y-2">
      {itens.map((m, i) => (
        <CardMinistracao key={m.id} m={m} cor={CORES[i % CORES.length]} numero={i + 1} />
      ))}
    </div>
  );
}

function CardMinistracao({
  m,
  cor,
  numero,
}: {
  m: MinistracaoRow;
  cor: string;
  numero: number;
}) {
  const [aberto, setAberto] = useState(false);
  const temDetalhe = Boolean(m.texto || m.base || m.citacao || m.tema || m.ato || m.direcao);

  const subtitulo = [m.quando, m.ministrante].filter(Boolean).join(" · ");

  return (
    <div className={cardCls} style={{ borderLeft: `3px solid ${cor}` }}>
      <button
        onClick={() => setAberto((v) => !v)}
        disabled={!temDetalhe}
        className="flex w-full items-start justify-between gap-3 p-4 text-left disabled:cursor-default"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span
              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
              style={{ color: cor, background: `${cor}1f` }}
            >
              {numero}
            </span>
            <span className="font-semibold text-luz">{m.titulo}</span>
          </span>
          {subtitulo && <span className="mt-0.5 block text-xs text-corrente">{subtitulo}</span>}
        </span>
        {temDetalhe &&
          (aberto ? (
            <ChevronUp size={15} className="mt-0.5 shrink-0 text-corrente" />
          ) : (
            <ChevronDown size={15} className="mt-0.5 shrink-0 text-corrente" />
          ))}
      </button>

      {aberto && temDetalhe && (
        <div className="space-y-3 px-4 pb-4">
          {(m.texto || m.base) && (
            <div className="flex flex-wrap gap-2">
              {m.texto && <Referencia label="Texto" valor={m.texto} cor={cor} />}
              {m.base && <Referencia label="Base" valor={m.base} cor={cor} />}
            </div>
          )}

          {m.citacao && (
            <p
              className="rounded-control border-l-2 px-3 py-2 text-xs italic leading-relaxed text-luz"
              style={{ borderColor: cor, background: "rgba(0,14,33,0.45)" }}
            >
              “{m.citacao}”
            </p>
          )}

          {m.tema && <Bloco label="Tema" texto={m.tema} />}
          {m.ato && <Bloco label="Ato profético" texto={m.ato} destaque />}
          {m.direcao && <Bloco label="Direção" texto={m.direcao} />}
        </div>
      )}
    </div>
  );
}

function Referencia({ label, valor, cor }: { label: string; valor: string; cor: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold"
      style={{ color: cor, background: `${cor}1a` }}
    >
      <BookOpen size={11} />
      {label}: {valor}
    </span>
  );
}

// O ato profético ganha destaque: é o que a equipe precisa preparar
// (bacia com água, bexiga, pedra + óleo...).
function Bloco({
  label,
  texto,
  destaque,
}: {
  label: string;
  texto: string;
  destaque?: boolean;
}) {
  return (
    <div
      className={destaque ? "rounded-control px-3 py-2" : undefined}
      style={destaque ? { background: "rgba(224,162,60,0.09)" } : undefined}
    >
      <p
        className="text-[10px] font-bold uppercase tracking-wide"
        style={{ color: destaque ? "#e0a23c" : undefined }}
      >
        <span className={destaque ? "" : "text-corrente"}>{label}</span>
      </p>
      <p className="mt-0.5 whitespace-pre-line text-xs leading-relaxed text-luz">{texto}</p>
    </div>
  );
}
