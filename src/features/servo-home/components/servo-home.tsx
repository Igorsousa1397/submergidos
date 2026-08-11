"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Megaphone, AlertTriangle, BedDouble, ChevronDown, ChevronUp } from "lucide-react";
import type { ServoHomeData } from "../queries";

type Aba = "agenda" | "escalas" | "ministracoes";

const cardCls = "rounded-card border border-[rgba(164,214,232,0.12)] bg-[rgba(0,14,33,0.5)]";

// cores das barras laterais da agenda (cíclicas, como no original)
const CORES_AGENDA = ["#0a84ff", "#ff9f0a", "#bf5af2", "#12b5a6", "#ff2d92", "#64b5f6"];

// Ministrações — conteúdo portado do app original (estático por enquanto).
const MINISTRACOES: { titulo: string; dia: string; resumo: string; ato: string | null }[] = [
  {
    titulo: "Pré-Encontro",
    dia: "Quinta · 20:00",
    resumo:
      "Momento de organização dos itens que vão para o sítio do encontro. Algumas escalas serão definidas pelo líder geral.",
    ato: null,
  },
  {
    titulo: "Envio",
    dia: "Quinta · 23:30",
    resumo: "Oração com todos os servos antes da partida. É muito importante que nenhum servo falte",
    ato: null,
  },
  {
    titulo: "Encontro com o Mundo, Encontro com Deus",
    dia: "Sexta · 23:00",
    resumo: "Em breve...",
    ato:
      'Apelo para que os encontristas aceitem a Jesus. Os servos fazem a oração de confissão junto aos encontristas: "Senhor Jesus, eu reconheço que sou um pecador e preciso do Teu perdão. Eu creio que Tu morreste na cruz por mim e ressuscitaste para me dar a vida eterna. Hoje, eu Te aceito como meu único e suficiente Senhor e Salvador da minha vida. Entra no meu coração, guia os meus passos e transforma-me na pessoa que desejas que eu seja. Entrego a minha vida a Ti. Em nome de Jesus. Amém."',
  },
  {
    titulo: "Ministração Peniel",
    dia: "Sábado · 08:30",
    resumo: "Em breve...",
    ato:
      "Os encontristas vão ao microfone e dizem o nome do pecado que rotulava a sua identidade quando chegaram. Os servos, ao abraçar e orar, anulam esses rótulos do pecado e declaram um novo nome: Israel, príncipe ou princesa de Deus. Quando eles saírem para fora, para receber a lembrancinha, os servos formam um corredor para comemorar o retorno deles ao templo com a identidade nova após o ato, celebrando a mudança deles.",
  },
  {
    titulo: "Ministração Cura",
    dia: "Sábado · 10:30",
    resumo: "Em breve...",
    ato:
      "Semelhante ao ato da Ministração Peniel. O encontrista vai ao microfone para liberar perdão por algo que fez e pedir perdão também. Ao finalizar, os servos abraçam e oram declarando que as correntes que o aprisionavam nessa mágoa foram quebradas e que ele está livre.",
  },
  {
    titulo: "Ministração Escamas",
    dia: "Sábado · 15:30",
    resumo: "Em breve...",
    ato:
      "Uma venda é colocada nos olhos dos encontristas simbolizando escamas que deixam a pessoa cega no mundo espiritual. Após o pastor iniciar a ministração, os servos retiram as vendas e oram pelos encontristas como ato profético de que as escamas foram retiradas e que agora eles enxergam com os olhos espirituais.",
  },
  {
    titulo: "Ministração Libertação",
    dia: "Sábado · 17:00",
    resumo: "Em breve...",
    ato:
      "⚠️ Pontos de atenção:\n1. Servos oram pelos encontristas e staffs dão apoio atrás para evitar quedas.\n2. Oração de libertação é feita com a mão na cabeça do encontrista.\n3. Demônios são expulsos em nome de Jesus — se manifestar, dê uma ordem a todas as entidades e expulse em nome de Jesus.\n4. Não pergunte o nome frequentemente — só após a oração para confirmar que não há mais entidades.\n5. Não abrace o encontrista nesse momento — pode ser perigoso.\n6. Não é permitido ir ao banheiro — se necessário, procure os pastores.\n\nApós todas as renúncias, nos revestimos de toda armadura do Céu e celebramos juntos a libertação.",
  },
  {
    titulo: "Ministração Amor de Deus",
    dia: "Sábado · 21:30",
    resumo: "Em breve...",
    ato:
      "1. Ao finalizar a ministração, todos os servos oram por todos os encontristas declarando o amor de Deus sobre suas vidas.\n2. Todos vão para a fogueira para ver os pecados serem queimados na cruz.",
  },
  {
    titulo: "Ministração Sonhos",
    dia: "Domingo · 08:30",
    resumo: "Em breve...",
    ato:
      "Todos fazem uma caixa imaginária do tamanho dos seus sonhos. De forma profética os sonhos são colocados dentro dessa caixa e enviados ao céu lançando a caixa para cima. Em seguida é distribuída uma uva para cada pessoa — colocamos profeticamente os sonhos de Deus dentro da uva e a ingerimos para que os sonhos de Deus sejam gerados em nós.",
  },
  {
    titulo: "Unção de Multiplicação",
    dia: "Domingo · 09:30",
    resumo: "Em breve...",
    ato:
      "É feita uma oração sobre todos os encontristas declarando unção de multiplicação sobre eles, para que possam multiplicar em todas as áreas da vida.",
  },
  {
    titulo: "Batismo com Espírito Santo",
    dia: "Domingo · 10:30",
    resumo: "Em breve...",
    ato:
      'Oram com imposição de mãos, declarando o batismo com o Espírito Santo, batismo com fogo e ativação de dons. Se a pessoa aparentemente demonstrar não estar recebendo o batismo, conduzir ela a fazer uma oração de confissão, semelhante a: "Espírito Santo, eu o reconheço como pessoa e confesso precisar de ti, te convido a habitar em mim e ativar todos os dons necessários para que eu cumpra o propósito de Deus na minha história".',
  },
  {
    titulo: "Oração Estilo de Vida",
    dia: "Domingo · 15:00",
    resumo: "Em breve...",
    ato:
      "São entregues os presentes e cartas enviadas pela família do encontrista. Um dos atos mais importantes do encontro — muita atenção ao colocar a sacola à frente do encontrista.",
  },
];

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
        <div className={`${cardCls} p-4`}>
          <BedDouble size={18} className="text-corrente" />
          <p className="mt-1 font-display text-2xl font-extrabold text-luz">{dados.quartos}</p>
          <p className="text-xs uppercase tracking-wide text-corrente">Quartos</p>
        </div>
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

      {/* ESCALAS */}
      {aba === "escalas" && (
        <div className="space-y-2">
          {dados.escalas.length === 0 ? (
            <p className="py-8 text-center text-sm text-corrente">Sem atribuições. Aguarde.</p>
          ) : (
            dados.escalas.map((e, i) => (
              <div key={i} className={`${cardCls} flex items-center justify-between p-4`}>
                <div>
                  <p className="font-semibold text-luz">{e.funcao}</p>
                  <p className="text-xs capitalize text-corrente">
                    {e.dia}
                    {e.periodo ? ` · ${e.periodo}` : ""}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* MINISTRAÇÕES */}
      {aba === "ministracoes" && (
        <div className="space-y-2">
          {MINISTRACOES.map((m) => (
            <MinistracaoCard key={m.titulo} m={m} />
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

// banner de pendência: informa e navega (pagamento é PIX manual — os
// detalhes/status ficam no Perfil; uniforme resolve na tela de Uniforme)
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
    uniforme_sem_pedido: {
      cor: "#ff9f0a",
      titulo: "🎽 Você ainda não fez seu pedido de uniforme",
      texto: `${prazo ? `Prazo: ${prazo} · ` : ""}Toque para pedir`,
    },
    uniforme_sem_sinal: {
      cor: "#e5564e",
      titulo: "🎽 Uniforme aguardando o sinal (50%)",
      texto: `${b.valor ? `Sinal: ${brl(b.valor)} · ` : ""}Toque para ver o pedido`,
    },
    uniforme_falta_restante: {
      cor: "#ff9f0a",
      titulo: "🎽 Sinal pago — falta o restante",
      texto: `${b.valor ? `Restante: ${brl(b.valor)} · ` : ""}Toque para ver o pedido`,
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

function MinistracaoCard({
  m,
}: {
  m: { titulo: string; dia: string; resumo: string; ato: string | null };
}) {
  const [aberto, setAberto] = useState(false);
  return (
    <div className={cardCls}>
      <button
        onClick={() => setAberto((v) => !v)}
        className="flex w-full items-center justify-between gap-2 p-4 text-left"
      >
        <div className="min-w-0">
          <p className="font-semibold text-luz">{m.titulo}</p>
          <p className="text-xs text-corrente">{m.dia}</p>
        </div>
        {aberto ? (
          <ChevronUp size={16} className="shrink-0 text-corrente" />
        ) : (
          <ChevronDown size={16} className="shrink-0 text-corrente" />
        )}
      </button>
      {aberto && (
        <div className="space-y-3 border-t border-[rgba(164,214,232,0.1)] px-4 py-3 text-sm">
          <div>
            <p className="mb-1 text-[11px] uppercase tracking-wide text-corrente">Resumo</p>
            <p className="leading-relaxed text-luz">{m.resumo}</p>
          </div>
          {m.ato && (
            <div>
              <p className="mb-1 text-[11px] uppercase tracking-wide text-corrente">Ato</p>
              <p className="whitespace-pre-line leading-relaxed text-luz">{m.ato}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
