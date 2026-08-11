"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Shirt, Minus, Plus } from "lucide-react";
import {
  salvarPedido,
  naoQueroUniforme,
  mudeiDeIdeia,
  solicitarAlteracao,
} from "../actions";
import {
  TAMANHOS_UNIFORME,
  ITEM_LABEL,
  precoItem,
  totalPedido,
  brl,
  type ItemUniforme,
} from "../shared";
import type { UniformeRow, UniformesConfig } from "../queries";

const OK = "#12b5a6";
const AVISO = "#e0a23c";
const ALERTA = "#e5564e";

const cardCls = "rounded-card border border-[rgba(164,214,232,0.12)] bg-[rgba(0,14,33,0.5)]";
const inputCls =
  "w-full rounded-control border border-[rgba(164,214,232,0.18)] bg-[rgba(0,14,33,0.6)] px-3 py-2.5 text-sm text-luz outline-none placeholder:text-corrente focus:border-raso";

const fmtData = (iso: string | null) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

interface FormPedido {
  nome_camiseta: string;
  camisa: string;
  qtd_camisas: number;
  calca: string;
  qtd_calcas: number;
  blusa: string;
  qtd_blusas: number;
}

export function UniformeServoView({
  pedido,
  config,
}: {
  pedido: UniformeRow | null;
  config: UniformesConfig;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState("");
  const [form, setForm] = useState<FormPedido>({
    nome_camiseta: pedido?.nome_camiseta ?? "",
    camisa: pedido?.camisa ?? "",
    qtd_camisas: pedido?.qtd_camisas || 1,
    calca: pedido?.calca ?? "",
    qtd_calcas: pedido?.qtd_calcas || 1,
    blusa: pedido?.blusa ?? "",
    qtd_blusas: pedido?.qtd_blusas || 1,
  });

  const hoje = new Date().toISOString().slice(0, 10);
  const prazoDefinido = !!config.data_limite;
  const prazoOk = prazoDefinido && hoje <= (config.data_limite as string);

  const pago = !!pedido && (pedido.pago_sinal || pedido.pago_integral);
  const editavel = !pedido || pedido.status === "aberto";

  const rodar = (fn: () => Promise<{ ok: boolean; erro?: string }>) => {
    setErro("");
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setErro(res.erro ?? "Não foi possível salvar.");
      router.refresh();
    });
  };

  const total = pedido && !editavel ? pedido.valor_total : totalPedido({
    nome_camiseta: form.nome_camiseta,
    camisa: form.camisa || null,
    qtd_camisas: form.qtd_camisas,
    calca: form.calca || null,
    qtd_calcas: form.qtd_calcas,
    blusa: form.blusa || null,
    qtd_blusas: form.qtd_blusas,
  });

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <div className={`${cardCls} flex items-center gap-2 p-4`}>
        <Shirt size={20} className="text-raso" />
        <h1 className="font-display text-lg font-bold text-luz">Uniforme</h1>
      </div>

      {erro && (
        <div
          className="rounded-card border px-4 py-3 text-sm"
          style={{ borderColor: "rgba(229,86,78,0.3)", background: "rgba(229,86,78,0.1)", color: "#f0a39e" }}
        >
          {erro}
        </div>
      )}

      {/* solicitações ainda não abertas */}
      {!prazoDefinido && (
        <p className="py-10 text-center text-sm text-corrente">
          As solicitações de uniforme ainda não foram abertas.
        </p>
      )}

      {/* prazo encerrado */}
      {prazoDefinido && !prazoOk && (
        <div className="space-y-3">
          <div
            className="rounded-card border px-4 py-3 text-center text-sm font-semibold"
            style={{ borderColor: "rgba(229,86,78,0.4)", background: "rgba(229,86,78,0.08)", color: ALERTA }}
          >
            O prazo para solicitação encerrou.
          </div>
          {pedido && !pedido.nao_quer && <StatusPagamento pedido={pedido} config={config} />}
        </div>
      )}

      {prazoDefinido && prazoOk && (
        <>
          {/* prazo aberto (banner do original) */}
          <div
            className="rounded-card border px-4 py-3 text-sm"
            style={{ borderColor: "rgba(18,181,166,0.35)", background: "rgba(18,181,166,0.06)" }}
          >
            <p className="font-bold" style={{ color: OK }}>
              Prazo aberto
            </p>
            <p className="text-xs text-corrente">Data limite: {fmtData(config.data_limite)}</p>
          </div>

          {/* optou por não pedir */}
          {pedido?.nao_quer ? (
            <div className={`${cardCls} space-y-3 p-4 text-center`}>
              <p className="text-sm text-corrente">Você optou por não pedir uniforme.</p>
              <button
                onClick={() => rodar(mudeiDeIdeia)}
                disabled={pending}
                className="w-full rounded-control border border-[rgba(164,214,232,0.25)] py-2.5 text-sm font-semibold text-corrente transition hover:text-luz disabled:opacity-50"
              >
                Mudei de ideia
              </button>
            </div>
          ) : editavel ? (
            /* ---- FORM (sem pedido ou liberado pra editar) ---- */
            <>
              {pedido?.status === "aberto" && (
                <div
                  className="rounded-card border px-4 py-3 text-sm"
                  style={{ borderColor: "rgba(18,181,166,0.35)", background: "rgba(18,181,166,0.08)", color: OK }}
                >
                  ✓ Alteração aprovada — edite e salve novamente.
                </div>
              )}

              {(["camisa", "calca", "blusa"] as ItemUniforme[]).map((item) => {
                const tam = form[item];
                const qtdKey =
                  item === "camisa" ? "qtd_camisas" : item === "calca" ? "qtd_calcas" : "qtd_blusas";
                const qtd = form[qtdKey] as number;
                return (
                  <div key={item} className={`${cardCls} space-y-3 p-4`}>
                    <p className="text-sm font-bold text-luz">{ITEM_LABEL[item]}</p>
                    {item === "camisa" && (
                      <p className="text-[11px]" style={{ color: "rgba(255,159,10,0.85)" }}>
                        ⚠️ Obrigatório ao menos 1 camiseta para quem serve pela primeira vez.
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => setForm((v) => ({ ...v, [item]: "" }))}
                        className="rounded-full border px-3 py-1.5 text-xs font-semibold transition"
                        style={
                          !tam
                            ? { borderColor: "rgba(164,214,232,0.5)", color: "#dcf1f8", background: "rgba(164,214,232,0.1)" }
                            : { borderColor: "rgba(164,214,232,0.18)", color: "#416a87" }
                        }
                      >
                        Não quero
                      </button>
                      {TAMANHOS_UNIFORME.map((t) => (
                        <button
                          key={t}
                          onClick={() => setForm((v) => ({ ...v, [item]: t }))}
                          className="rounded-full border px-3 py-1.5 text-xs font-semibold transition"
                          style={
                            tam === t
                              ? { borderColor: OK, color: OK, background: "rgba(18,181,166,0.12)" }
                              : { borderColor: "rgba(164,214,232,0.18)", color: "#416a87" }
                          }
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    {tam && (
                      <>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-corrente">
                            Quantidade (máx. 3) · {brl(precoItem(item, tam))} cada
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                setForm((v) => ({ ...v, [qtdKey]: Math.max(1, qtd - 1) }))
                              }
                              aria-label="Diminuir"
                              className="flex h-7 w-7 items-center justify-center rounded-full border border-[rgba(164,214,232,0.25)] text-luz"
                            >
                              <Minus size={13} />
                            </button>
                            <span className="w-5 text-center font-bold text-luz">{qtd}</span>
                            <button
                              onClick={() =>
                                setForm((v) => ({ ...v, [qtdKey]: Math.min(3, qtd + 1) }))
                              }
                              aria-label="Aumentar"
                              className="flex h-7 w-7 items-center justify-center rounded-full border border-[rgba(164,214,232,0.25)] text-luz"
                            >
                              <Plus size={13} />
                            </button>
                          </div>
                        </div>
                        {item === "camisa" && (
                          <input
                            placeholder="Nome na camiseta (primeiro nome e sobrenome)"
                            value={form.nome_camiseta}
                            onChange={(e) =>
                              setForm((v) => ({ ...v, nome_camiseta: e.target.value }))
                            }
                            className={inputCls}
                          />
                        )}
                      </>
                    )}
                  </div>
                );
              })}

              <Resumo form={form} total={total} config={config} />

              <div className="space-y-2">
                <button
                  onClick={() => rodar(() => salvarPedido(form))}
                  disabled={pending}
                  className="w-full rounded-control py-3 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
                  style={{ background: OK }}
                >
                  {pedido ? "Salvar Alteração" : "Salvar Pedido"}
                </button>
                {!pedido && (
                  <button
                    onClick={() => rodar(naoQueroUniforme)}
                    disabled={pending}
                    className="w-full rounded-control border border-[rgba(164,214,232,0.18)] py-2.5 text-sm font-semibold text-corrente transition hover:text-luz disabled:opacity-50"
                  >
                    Não vou pedir nada
                  </button>
                )}
              </div>
            </>
          ) : (
            /* ---- PEDIDO TRAVADO (bloqueado/pendente) ---- */
            <>
              {pedido!.status === "pendente" && (
                <div
                  className="rounded-card border px-4 py-3 text-sm"
                  style={{ borderColor: "rgba(224,162,60,0.4)", background: "rgba(224,162,60,0.08)", color: AVISO }}
                >
                  ⏳ Solicitação de alteração enviada — aguardando aprovação.
                </div>
              )}

              <div className={`${cardCls} space-y-2 p-4`}>
                <p className="text-xs uppercase tracking-wide text-corrente">Seu pedido</p>
                {pedido!.camisa && (
                  <Linha
                    texto={`Camiseta ${pedido!.camisa} ×${pedido!.qtd_camisas} — "${pedido!.nome_camiseta}"`}
                    valor={precoItem("camisa", pedido!.camisa) * pedido!.qtd_camisas}
                  />
                )}
                {pedido!.calca && (
                  <Linha
                    texto={`Calça ${pedido!.calca} ×${pedido!.qtd_calcas}`}
                    valor={precoItem("calca", pedido!.calca) * pedido!.qtd_calcas}
                  />
                )}
                {pedido!.blusa && (
                  <Linha
                    texto={`Blusa de Frio ${pedido!.blusa} ×${pedido!.qtd_blusas}`}
                    valor={precoItem("blusa", pedido!.blusa) * pedido!.qtd_blusas}
                  />
                )}
                <div className="flex items-center justify-between border-t border-[rgba(164,214,232,0.1)] pt-2">
                  <p className="text-sm font-bold text-luz">Total</p>
                  <p className="text-sm font-bold" style={{ color: OK }}>
                    {brl(pedido!.valor_total)}
                  </p>
                </div>
                <p className="text-xs text-corrente">Sinal (50%): {brl(pedido!.valor_total / 2)}</p>
              </div>

              <StatusPagamento pedido={pedido!} config={config} />

              {!pago && pedido!.status === "bloqueado" && (
                <button
                  onClick={() => rodar(solicitarAlteracao)}
                  disabled={pending}
                  className="w-full rounded-control border border-[rgba(164,214,232,0.25)] py-2.5 text-sm font-semibold text-corrente transition hover:text-luz disabled:opacity-50"
                >
                  Solicitar Alteração
                </button>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function Linha({ texto, valor }: { texto: string; valor: number }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <p className="text-luz">{texto}</p>
      <p className="shrink-0 text-corrente">{brl(valor)}</p>
    </div>
  );
}

function Resumo({
  form,
  total,
  config,
}: {
  form: { camisa: string; calca: string; blusa: string };
  total: number;
  config: UniformesConfig;
}) {
  if (total === 0) return null;
  return (
    <div className={`${cardCls} space-y-2 p-4`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-luz">Total</p>
        <p className="text-sm font-bold" style={{ color: OK }}>
          {brl(total)}
        </p>
      </div>
      <p className="text-xs text-corrente">Sinal (50%): {brl(total / 2)}</p>
      <div
        className="rounded-control border p-3 text-xs leading-relaxed"
        style={{ borderColor: "rgba(224,162,60,0.3)", background: "rgba(224,162,60,0.06)", color: "#c9a86a" }}
      >
        <p className="mb-1 font-bold" style={{ color: AVISO }}>
          📋 Condições do pedido
        </p>
        {config.data_limite_pedido && <p>• Pedido até {fmtData(config.data_limite_pedido)}</p>}
        <p>• Entrada (sinal) de 50% do valor — o pedido só é confirmado com o sinal pago.</p>
        {config.data_limite_restante && (
          <p>• Restante até {fmtData(config.data_limite_restante)}</p>
        )}
        <p>• Pagamento via PIX com a liderança; a confirmação aparece aqui.</p>
      </div>
    </div>
  );
}

function StatusPagamento({
  pedido,
  config,
}: {
  pedido: UniformeRow;
  config: UniformesConfig;
}) {
  if (pedido.pago_integral)
    return (
      <div
        className="rounded-card border px-4 py-3 text-sm"
        style={{ borderColor: "rgba(18,181,166,0.35)", background: "rgba(18,181,166,0.08)", color: OK }}
      >
        ✓ Pagamento integral confirmado
        <p className="mt-1 text-xs text-corrente">🎽 A entrega será realizada no pré-encontro.</p>
      </div>
    );

  return (
    <div className={`${cardCls} space-y-2 p-4`}>
      <p className="text-xs uppercase tracking-wide text-corrente">Pagamento</p>
      <div className="flex items-center justify-between text-sm">
        <p className="text-luz">Sinal (50%)</p>
        <Pill ok={pedido.pago_sinal} />
      </div>
      <div className="flex items-center justify-between text-sm">
        <p className="text-luz">Restante (50%)</p>
        <Pill ok={false} />
      </div>
      {pedido.pago_sinal && config.data_limite_restante && (
        <p className="text-xs" style={{ color: AVISO }}>
          Prazo para o restante: {fmtData(config.data_limite_restante)}
        </p>
      )}
      <p className="text-[11px] text-corrente">
        Pague via PIX com a liderança — o administrador confirma aqui.
      </p>
    </div>
  );
}

function Pill({ ok }: { ok: boolean }) {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-bold"
      style={
        ok
          ? { color: OK, background: "rgba(18,181,166,0.12)" }
          : { color: ALERTA, background: "rgba(229,86,78,0.1)" }
      }
    >
      {ok ? "✓ Pago" : "Pendente"}
    </span>
  );
}
