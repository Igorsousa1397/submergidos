"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Megaphone, AlertTriangle, BedDouble, ChevronDown, ChevronUp } from "lucide-react";
import type { EscalaItem, ServoHomeData } from "../queries";
import {
  DIAS_ESCALA,
  DIA_ESCALA_LABEL,
  DIA_ESCALA_COR,
} from "@/features/backoffice/shared";

type Aba = "agenda" | "escalas" | "ministracoes";

const cardCls = "rounded-card border border-[rgba(164,214,232,0.12)] bg-[rgba(0,14,33,0.5)]";

// cores das barras laterais da agenda (cíclicas, como no original)
const CORES_AGENDA = ["#0a84ff", "#ff9f0a", "#bf5af2", "#12b5a6", "#ff2d92", "#64b5f6"];

export function ServoHome({ nome, dados }: { nome: string; dados: ServoHomeData }) {
  const [aba, setAba] = useState<Aba>("agenda");

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      {/* saudação */}
      <header className="pt-2">
        <h1 className="font-display text-2xl font-extrabold text-luz">
          Shalom, {nome}<span style={{ color: "#12b5a6" }}>.</span>
        </h1>
      </header>

      {/* 4 cards de atalho/contagem */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/avisos" className={`${cardCls} p-4 transition active:scale-[0.98]`}>
          <Megaphone size={18} className="text-corrente" />
          <p className="mt-2 text-xs uppercase tracking-wide text-corrente">Avisos</p>
        </Link>
        <Link href="/ocorrencias" className={`${cardCls} p-4 transition active:scale-[0.98]`}>
          <AlertTriangle size={18} className="text-corrente" />
          <p className="mt-1 font-display text-2xl font-extrabold text-luz">{dados.ocorrencias}</p>
          <p className="text-xs uppercase tracking-wide text-corrente">Ocorrências</p>
        </Link>
        <Link href="/quartos" className={`${cardCls} p-4 transition active:scale-[0.98]`}>
          <BedDouble size={18} className="text-corrente" />
          <p className="mt-1 font-display text-2xl font-extrabold text-luz">{dados.quartos}</p>
          <p className="text-xs uppercase tracking-wide text-corrente">Quartos</p>
        </Link>
      </div>

      {/* carrossel de pendências (como no original) */}
      <BannerCarrossel banners={dados.banners} />

      {/* abas */}
      <div className="flex gap-2">
        {([
          ["agenda", "Agenda"],
          ["escalas", "Escalas"],
          ["ministracoes", "Ministrações"],
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

      {/* AGENDA */}
      {aba === "agenda" && (
        <div className="space-y-2">
          {dados.agenda.length === 0 ? (
            <p className="py-8 text-center text-sm text-corrente">
              A agenda do encontro ainda não foi publicada.
            </p>
          ) : (
            dados.agenda.map((item, i) => (
              <div
                key={item.id}
                className={cardCls}
                style={
                  i === 0
                    ? { border: "1px solid rgba(10,132,255,0.45)", background: "rgba(10,132,255,0.08)" }
                    : { borderLeft: `3px solid ${CORES_AGENDA[i % CORES_AGENDA.length]}` }
                }
              >
                <div className="p-4">
                  {i === 0 && (
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-widest" style={{ color: "#4ea8d8" }}>
                      Próxima
                    </p>
                  )}
                  <p className="font-semibold text-luz">{item.titulo}</p>
                  <p className="text-xs capitalize text-corrente">
                    {item.dia ?? ""}
                    {item.hora ? ` · ${item.hora.slice(0, 5)}` : ""}
                    {item.ministrante ? ` · ${item.ministrante}` : ""}
                  </p>
                  {item.aviso && (
                    <p className="mt-2 rounded-control bg-[rgba(224,162,60,0.1)] px-2 py-1 text-xs" style={{ color: "#e0a23c" }}>
                      {item.aviso}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ESCALAS — agrupadas por dia, com líderes e equipe (como no original) */}
      {aba === "escalas" && (
        <div className="space-y-2">
          {dados.escalas.length === 0 ? (
            <p className="py-8 text-center text-sm text-corrente">Sem atribuições. Aguarde.</p>
          ) : (
            DIAS_ESCALA.filter((d) => dados.escalas.some((e) => e.dia === d)).map((dia) => (
              <CardDiaEscala
                key={dia}
                dia={dia}
                itens={dados.escalas.filter((e) => e.dia === dia)}
              />
            ))
          )}
        </div>
      )}

      {/* MINISTRAÇÕES — conteúdo do Submergidos ainda não definido */}
      {aba === "ministracoes" && (
        <p className="py-8 text-center text-sm text-corrente">
          As ministrações ainda não foram publicadas.
        </p>
      )}
    </div>
  );
}

// Card de um dia da escala: cabeçalho colorido com a contagem de funções e,
// dentro, cada função com seus líderes e a equipe do dia.
function CardDiaEscala({ dia, itens }: { dia: string; itens: EscalaItem[] }) {
  const [aberto, setAberto] = useState(true);
  const cor = DIA_ESCALA_COR[dia] ?? "#12b5a6";

  return (
    <div className={cardCls} style={{ borderLeft: `3px solid ${cor}` }}>
      <button
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center justify-between gap-2 p-4 text-left"
      >
        <span className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide" style={{ color: cor }}>
          <span className="h-2 w-2 rounded-full" style={{ background: cor }} />
          {DIA_ESCALA_LABEL[dia] ?? dia}
        </span>
        <span className="flex items-center gap-2">
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{ color: cor, background: `${cor}1f` }}
          >
            {itens.length} {itens.length === 1 ? "função" : "funções"}
          </span>
          {aberto ? (
            <ChevronUp size={15} className="text-corrente" />
          ) : (
            <ChevronDown size={15} className="text-corrente" />
          )}
        </span>
      </button>

      {aberto && (
        <div className="space-y-2 px-4 pb-4">
          {itens.map((e, i) => (
            <div
              key={i}
              className="rounded-control border border-[rgba(164,214,232,0.12)] bg-[rgba(0,14,33,0.45)] p-3"
            >
              <p className="font-semibold text-luz">
                {e.funcao}
                {e.periodo ? ` — ${e.periodo}` : ""}
              </p>
              {e.meuQuarto && (
                <p className="mt-0.5 text-xs" style={{ color: cor }}>
                  🛏 {e.meuQuarto}
                </p>
              )}

              {e.lideres.length > 0 && (
                <div className="mt-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-corrente">
                    Líder
                  </p>
                  {e.lideres.map((nome) => (
                    <p key={nome} className="flex items-center gap-1.5 text-xs text-luz">
                      <span className="h-1 w-1 rounded-full bg-corrente" />
                      {nome}
                    </p>
                  ))}
                </div>
              )}

              {e.colegas.length > 0 && (
                <div className="mt-2">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-corrente">
                    Equipe
                  </p>
                  {e.colegas.map((c) => (
                    <p key={c.nome} className="flex items-center gap-1.5 text-xs text-luz">
                      <span className="h-1 w-1 rounded-full bg-corrente" />
                      <span className={c.euMesmo ? "font-bold" : ""}>
                        {c.nome}
                        {c.euMesmo ? " (você)" : ""}
                      </span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const brl = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtPrazo = (iso: string | null | undefined) => {
  if (!iso) return null;
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
};

// carrossel de pendências: desliza sozinho a cada 8s, pontinhos navegáveis
// (o ativo vira a pílula verde, como no original)
function BannerCarrossel({ banners }: { banners: import("../queries").BannerPendencia[] }) {
  const [idx, setIdx] = useState(0);

  // se a lista encolher (pendência resolvida), volta pro início
  useEffect(() => {
    if (idx >= banners.length) setIdx(0);
  }, [banners.length, idx]);

  useEffect(() => {
    if (banners.length < 2) return;
    const t = setInterval(() => setIdx((v) => (v + 1) % banners.length), 8000);
    return () => clearInterval(t);
  }, [banners.length]);

  if (banners.length === 0) return null;

  return (
    <div>
      <div className="overflow-hidden rounded-card">
        <div
          className="flex transition-transform duration-500 ease-out motion-reduce:transition-none"
          style={{ transform: `translateX(-${Math.min(idx, banners.length - 1) * 100}%)` }}
        >
          {banners.map((b) => (
            <div key={b.tipo} className="w-full shrink-0">
              <BannerCard b={b} />
            </div>
          ))}
        </div>
      </div>
      {banners.length > 1 && (
        <div className="mt-2 flex items-center justify-center gap-1.5">
          {banners.map((b, i) => (
            <button
              key={b.tipo}
              onClick={() => setIdx(i)}
              aria-label={`Ver pendência ${i + 1}`}
              className="rounded-full transition-all"
              style={
                i === idx
                  ? { width: 18, height: 6, background: "#12b5a6" }
                  : { width: 6, height: 6, background: "rgba(164,214,232,0.25)" }
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

// banner de pendência: informa e navega (o pagamento em si e o status
// ficam no Perfil)
function BannerCard({ b }: { b: import("../queries").BannerPendencia }) {
  const prazo = fmtPrazo(b.prazo);
  const cfg = {
    inscricao_pendente: {
      cor: "#e5564e",
      titulo: "⚠️ Pagamento da inscrição pendente",
      texto: `Valor: ${b.valor ? brl(b.valor) : ""}${prazo ? ` · prazo ${prazo}` : ""} — toque para ver os detalhes`,
    },
    inscricao_pagar_depois: {
      cor: "#0a84ff",
      titulo: "📅 Pagamento combinado",
      texto: `${b.valor ? brl(b.valor) : ""}${prazo ? ` até ${prazo}` : ""} — toque para ver os detalhes`,
    },
  }[b.tipo];

  return (
    <Link
      href={b.href}
      className="block rounded-card border p-4 transition active:scale-[0.99]"
      style={{ borderColor: `${cfg.cor}55`, background: `${cfg.cor}0f` }}
    >
      <p className="text-sm font-bold" style={{ color: cfg.cor }}>
        {cfg.titulo}
      </p>
      <p className="mt-0.5 text-xs text-corrente">{cfg.texto}</p>
    </Link>
  );
}
