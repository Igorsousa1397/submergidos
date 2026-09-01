"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { DashboardData } from "../queries";
import type { AgendaRow } from "@/features/agenda/shared";
import { DIA_LABEL } from "@/features/agenda/shared";
import type { AvisoRow } from "@/features/avisos/queries";

const OK = "#12b5a6";
const ALERTA = "#e5564e";
const AZUL = "#0a84ff";
const LARANJA = "#e0a23c";
const CINZA = "#8e8e93";
const ROXO = "#a855f7";

const cardCls = "rounded-card border border-[rgba(164,214,232,0.12)] bg-[rgba(0,14,33,0.5)]";

const brl = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type Aba = "dashboard" | "agenda" | "avisos";
type Periodo = 7 | 14 | 30;

export function AdminDashboard({
  nome,
  d,
  agenda,
  avisos,
}: {
  nome: string;
  d: DashboardData;
  agenda: AgendaRow[];
  avisos: AvisoRow[];
}) {
  const [aba, setAba] = useState<Aba>("dashboard");
  const [periodo, setPeriodo] = useState<Periodo>(30);

  const pctMeta = d.meta > 0 ? Math.round((d.total / d.meta) * 100) : 0;
  const pctPagosEnc = d.meta > 0 ? Math.round((d.pagos / d.meta) * 100) : 0;
  const pctPagosServos =
    d.servosTotal > 0 ? Math.round((d.servosPagos / d.servosTotal) * 100) : 0;

  const cadastros = useMemo(() => {
    const corte = new Date();
    corte.setDate(corte.getDate() - periodo);
    const cortIso = corte.toISOString().slice(0, 10);
    return d.cadastrosPorDia.filter((x) => x.iso >= cortIso);
  }, [d.cadastrosPorDia, periodo]);

  const maxDia = Math.max(1, ...cadastros.map((x) => x.qtd));
  const maxCel = Math.max(1, ...d.porCelula.map((x) => x.qtd));

  const topo = [
    { label: "Check-in", valor: `${d.checkinFeitos}/${d.checkinTotal}`, href: "/check-in" },
    { label: "Ônibus", valor: `${d.onibusOcupados}/${d.onibusTotal}`, href: "/onibus" },
    { label: "Quartos", valor: `${d.quartos}`, href: "/quartos" },
    { label: "Ocorrências", valor: `${d.ocorrencias}`, href: "/ocorrencias" },
  ];

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <header className="pt-2">
        <h1 className="font-display text-2xl font-extrabold text-luz">
          Shalom, {nome}<span style={{ color: OK }}>.</span>
        </h1>
      </header>

      {/* 4 cards de topo — cada um leva à tela correspondente */}
      <div className="grid grid-cols-2 gap-3">
        {topo.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className={`${cardCls} p-4 transition hover:border-[rgba(164,214,232,0.3)] active:scale-[0.98]`}
          >
            <p className="font-display text-2xl font-extrabold text-luz">{c.valor}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-corrente">{c.label}</p>
          </Link>
        ))}
      </div>

      {/* abas Dashboard / Agenda / Avisos (como no original) */}
      <div className="flex gap-2">
        {([
          ["dashboard", "Dashboard"],
          ["agenda", "Agenda"],
          ["avisos", "Avisos"],
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

      {/* ============ ABA DASHBOARD ============ */}
      {aba === "dashboard" && (
        <>
          {/* Encontristas */}
          <div className={`${cardCls} space-y-4 p-4`}>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-luz">Encontristas</h2>
              <span className="flex items-center gap-2 text-sm text-corrente">
                {d.total}/{d.meta}
                <Pill texto={`${pctPagosEnc}%`} cor={AZUL} />
              </span>
            </div>

            <div>
              <div className="mb-1 flex justify-between text-xs text-corrente">
                <span>Meta: {d.meta}</span>
                <span>{pctMeta}% preenchido</span>
              </div>
              <Barra pct={pctMeta} cor={AZUL} />
            </div>

            <div className="space-y-2">
              <LinhaBarra label="Pago" cor={OK} qtd={d.pagos} base={d.meta} />
              <LinhaBarra label="Pend." cor={ALERTA} qtd={d.pendentes} base={d.meta} />
              {d.pagarDepois > 0 && (
                <LinhaBarra label="Pagar dep." cor={LARANJA} qtd={d.pagarDepois} base={d.meta} />
              )}
              {d.desistencias > 0 && (
                <LinhaBarra label="Desistência" cor={CINZA} qtd={d.desistencias} base={d.meta} />
              )}
            </div>

            <div className="space-y-2 border-t border-[rgba(164,214,232,0.1)] pt-3">
              <p className="text-xs uppercase tracking-wide text-corrente">Financeiro</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-luz">● Arrecadado</span>
                <span className="font-bold" style={{ color: OK }}>{brl(d.arrecadado)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-luz">● A receber</span>
                <span className="font-bold" style={{ color: LARANJA }}>{brl(d.aReceber)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-[rgba(164,214,232,0.1)] pt-2 text-sm">
                <span className="text-corrente">Projeção de hoje</span>
                <span className="font-bold text-luz">{brl(d.arrecadado + d.aReceber)}</span>
              </div>
              <p className="text-[11px] text-corrente">
                * {d.total} cadastrados (arrecadado + a receber)
              </p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-corrente">Previsão total (meta)</span>
                <span className="font-bold" style={{ color: AZUL }}>{brl(d.previsaoTotal)}</span>
              </div>
              <p className="text-[11px] text-corrente">
                * {d.meta - d.itajai} × R$ 360 + {d.itajai} (Itajaí) × R$ 200
              </p>
            </div>
          </div>

          {/* Servos */}
          <div className={`${cardCls} space-y-4 p-4`}>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-luz">Servos</h2>
              <span className="flex items-center gap-2 text-sm text-corrente">
                {d.servosTotal} total
                <Pill texto={`${pctPagosServos}%`} cor={AZUL} />
              </span>
            </div>

            <div className="space-y-2">
              <LinhaBarra label="Pagos" cor={OK} qtd={d.servosPagos} base={d.servosTotal} />
              <LinhaBarra label="Pend." cor={ALERTA} qtd={d.servosPendentes} base={d.servosTotal} />
              <LinhaBarra label="Abonado" cor={CINZA} qtd={d.servosAbonados} base={d.servosTotal} />
            </div>

            <div className="space-y-2 border-t border-[rgba(164,214,232,0.1)] pt-3">
              <p className="text-xs uppercase tracking-wide text-corrente">Financeiro</p>
              <div className="flex items-center justify-between text-sm">
                <span className="text-luz">● Arrecadado</span>
                <span className="font-bold" style={{ color: OK }}>{brl(d.servosArrecadado)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-luz">● A receber</span>
                <span className="font-bold" style={{ color: LARANJA }}>{brl(d.servosAReceber)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-[rgba(164,214,232,0.1)] pt-2 text-sm">
                <span className="text-corrente">Projeção total</span>
                <span className="font-bold text-luz">
                  {brl(d.servosArrecadado + d.servosAReceber)}
                </span>
              </div>
              <p className="text-[11px] text-corrente">
                * R$220/servo·staff·líder e R$100/cozinha (PIX). Abonados não contabilizados.
              </p>
            </div>
          </div>

          {/* Cadastros por dia */}
          <div className={`${cardCls} space-y-3 p-4`}>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-luz">Cadastros por dia</h2>
              <div className="flex gap-1">
                {([7, 14, 30] as Periodo[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => setPeriodo(p)}
                    className="rounded-full px-2.5 py-1 text-[11px] font-bold transition"
                    style={
                      periodo === p
                        ? { background: OK, color: "#fff" }
                        : { background: "rgba(164,214,232,0.08)", color: "#8aa9bd" }
                    }
                  >
                    {p}d
                  </button>
                ))}
              </div>
            </div>
            {cadastros.length === 0 ? (
              <p className="text-sm text-corrente">Nenhum cadastro no período.</p>
            ) : (
              <div className="space-y-2">
                {cadastros.map((x) => (
                  <div key={x.iso} className="flex items-center gap-3 text-sm">
                    <span className="w-12 shrink-0 text-corrente">{x.dia}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(x.qtd / maxDia) * 100}%`, background: AZUL }}
                      />
                    </div>
                    <span className="w-6 shrink-0 text-right font-bold text-luz">{x.qtd}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Por Célula */}
          <div className={`${cardCls} space-y-3 p-4`}>
            <h2 className="font-display text-lg font-bold text-luz">Por Célula</h2>
            {d.porCelula.length === 0 ? (
              <p className="text-sm text-corrente">Nenhum encontrista ainda.</p>
            ) : (
              <div className="space-y-2">
                {d.porCelula.map((x) => (
                  <div key={x.nome} className="flex items-center gap-3 text-sm">
                    <span className="w-24 shrink-0 truncate text-corrente">{x.nome}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(x.qtd / maxCel) * 100}%`, background: ROXO }}
                      />
                    </div>
                    <span className="w-6 shrink-0 text-right font-bold text-luz">{x.qtd}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ============ ABA AGENDA ============ */}
      {aba === "agenda" && (
        <div className="space-y-2">
          {agenda.length === 0 ? (
            <p className="py-8 text-center text-sm text-corrente">
              A agenda ainda não foi publicada.{" "}
              <Link href="/agenda" className="text-raso underline underline-offset-4">
                Gerenciar
              </Link>
            </p>
          ) : (
            <>
              {agenda.map((item, i) => {
                const CORES = [AZUL, "#ff9f0a", "#bf5af2", OK, "#ff2d92", "#64b5f6"];
                return (
                  <div
                    key={item.id}
                    className={cardCls}
                    style={{ borderLeft: `3px solid ${CORES[i % CORES.length]}` }}
                  >
                    <div className="p-4">
                      <p className="font-semibold text-luz">{item.titulo}</p>
                      <p className="text-xs text-corrente">
                        {DIA_LABEL[item.dia ?? ""] ?? item.dia}
                        {item.hora ? ` · ${item.hora.slice(0, 5)}` : ""}
                        {item.ministrante ? ` · ${item.ministrante}` : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
              <Link
                href="/agenda"
                className="block pt-1 text-center text-xs text-raso underline underline-offset-4"
              >
                Gerenciar agenda →
              </Link>
            </>
          )}
        </div>
      )}

      {/* ============ ABA AVISOS ============ */}
      {aba === "avisos" && (
        <div className="space-y-2">
          {avisos.length === 0 ? (
            <p className="py-8 text-center text-sm text-corrente">Nenhum aviso no momento. ✓</p>
          ) : (
            avisos.map((a) => (
              <div key={a.id} className={cardCls} style={{ borderLeft: `3px solid ${OK}` }}>
                <div className="p-4">
                  <p className="text-sm leading-relaxed text-luz">{a.texto}</p>
                  <p className="mt-1.5 text-[11px] text-corrente">
                    {a.autor ?? "—"}
                    {a.autorPerfil ? ` · ${a.autorPerfil}` : ""}
                  </p>
                </div>
              </div>
            ))
          )}
          <Link
            href="/avisos"
            className="block pt-1 text-center text-xs text-raso underline underline-offset-4"
          >
            Publicar / gerenciar avisos →
          </Link>
        </div>
      )}
    </div>
  );
}

function Pill({ texto, cor }: { texto: string; cor: string }) {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{ color: cor, background: `${cor}1f` }}
    >
      {texto}
    </span>
  );
}

function Barra({ pct, cor }: { pct: number; cor: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.min(100, pct)}%`, background: cor }}
      />
    </div>
  );
}

// linha de status com barra (Pago/Pend./Abonado — visual do original)
function LinhaBarra({
  label,
  cor,
  qtd,
  base,
}: {
  label: string;
  cor: string;
  qtd: number;
  base: number;
}) {
  const pct = base > 0 ? (qtd / base) * 100 : 0;
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-20 shrink-0 font-semibold" style={{ color: cor }}>
        {label}
      </span>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.min(100, pct)}%`, background: cor }}
        />
      </div>
      <span className="w-8 shrink-0 text-right font-bold text-luz">{qtd}</span>
    </div>
  );
}
