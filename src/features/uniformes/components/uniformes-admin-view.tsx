"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Shirt, ChevronDown, ChevronUp } from "lucide-react";
import { decidirAlteracao, definirPagamentoUniforme, salvarDatasUniformes } from "../actions";
import { ITEM_LABEL, TAMANHOS_UNIFORME, brl, type ItemUniforme } from "../shared";
import type { UniformeRow, UniformesConfig } from "../queries";

const OK = "#12b5a6";
const AVISO = "#e0a23c";
const ALERTA = "#e5564e";
const LARANJA = "#ff9f0a";

const cardCls = "rounded-card border border-[rgba(164,214,232,0.12)] bg-[rgba(0,14,33,0.5)]";
const inputCls =
  "w-full rounded-control border border-[rgba(164,214,232,0.18)] bg-[rgba(0,14,33,0.6)] px-3 py-2.5 text-sm text-luz outline-none placeholder:text-corrente focus:border-raso";

export function UniformesAdminView({
  pedidos,
  config,
}: {
  pedidos: UniformeRow[];
  config: UniformesConfig;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState("");
  const [datas, setDatas] = useState(config);
  const [expandido, setExpandido] = useState<string | null>(null);

  const rodar = (fn: () => Promise<{ ok: boolean; erro?: string }>) => {
    setErro("");
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setErro(res.erro ?? "Não foi possível salvar.");
      router.refresh();
    });
  };

  const reais = useMemo(() => pedidos.filter((p) => !p.nao_quer), [pedidos]);
  const pendentes = reais.filter((p) => p.status === "pendente").length;

  // totais por tamanho por item
  const resumoTamanhos = useMemo(() => {
    const soma = (item: ItemUniforme) => {
      const mapa = new Map<string, number>();
      for (const p of reais) {
        const tam = item === "camisa" ? p.camisa : item === "calca" ? p.calca : p.blusa;
        const qtd =
          item === "camisa" ? p.qtd_camisas : item === "calca" ? p.qtd_calcas : p.qtd_blusas;
        if (tam) mapa.set(tam, (mapa.get(tam) ?? 0) + qtd);
      }
      return mapa;
    };
    return { camisa: soma("camisa"), calca: soma("calca"), blusa: soma("blusa") };
  }, [reais]);

  // financeiro (regra do original: integral = tudo; sinal = 50% pago, 50% a receber)
  const financeiro = useMemo(() => {
    let arrecadado = 0;
    let aReceber = 0;
    let esperado = 0;
    for (const p of reais) {
      esperado += p.valor_total;
      if (p.pago_integral) arrecadado += p.valor_total;
      else if (p.pago_sinal) {
        arrecadado += p.valor_total / 2;
        aReceber += p.valor_total / 2;
      } else aReceber += p.valor_total;
    }
    return { arrecadado, aReceber, esperado };
  }, [reais]);

  // Export fornecedor: só pedidos com sinal/integral pagos.
  // SERVO = perfis servo/cozinha; STAFF = demais (regra do original).
  const exportarCSV = () => {
    const pagos = reais.filter((p) => p.pago_sinal || p.pago_integral);
    const cab = ["Grupo", "Item", "Tamanho", "Nome", "Qtd"];
    const linhas: string[][] = [];
    for (const p of [...pagos].sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))) {
      const grupo = p.role === "servo" || p.role === "cozinha" ? "SERVO" : "STAFF";
      if (p.camisa)
        linhas.push([grupo, "Camiseta", p.camisa, p.nome_camiseta || p.nome, String(p.qtd_camisas)]);
      if (p.blusa) linhas.push([grupo, "Blusa de Frio", p.blusa, p.nome, String(p.qtd_blusas)]);
      if (p.calca) linhas.push([grupo, "Calça", p.calca, p.nome, String(p.qtd_calcas)]);
    }
    const csv = [cab, ...linhas]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "uniformes-fornecedor.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const corPedido = (p: UniformeRow) =>
    p.pago_integral ? OK : p.pago_sinal ? LARANJA : ALERTA;

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <div className={`${cardCls} flex items-center justify-between p-4`}>
        <div className="flex items-center gap-2">
          <Shirt size={20} className="text-raso" />
          <h1 className="font-display text-lg font-bold text-luz">Uniformes</h1>
        </div>
        <span className="text-xs text-corrente">{reais.length} pedidos</span>
      </div>

      {erro && (
        <div
          className="rounded-card border px-4 py-3 text-sm"
          style={{ borderColor: "rgba(229,86,78,0.3)", background: "rgba(229,86,78,0.1)", color: "#f0a39e" }}
        >
          {erro}
        </div>
      )}

      {/* datas */}
      <div className={`${cardCls} space-y-3 p-4`}>
        <p className="text-xs uppercase tracking-wide text-corrente">Datas do módulo</p>
        {([
          ["data_limite", "Limite para solicitações (libera a tela do servo)"],
          ["data_limite_pedido", "Prazo do pedido (informativo)"],
          ["data_limite_restante", "Prazo do restante 50% (informativo)"],
        ] as [keyof UniformesConfig, string][]).map(([campo, label]) => (
          <div key={campo}>
            <p className="mb-1 text-[11px] text-corrente">{label}</p>
            <input
              type="date"
              value={datas[campo] ?? ""}
              onChange={(e) => setDatas((v) => ({ ...v, [campo]: e.target.value || null }))}
              style={{ colorScheme: "dark" }}
              className={inputCls}
            />
          </div>
        ))}
        <button
          onClick={() => rodar(() => salvarDatasUniformes(datas))}
          disabled={pending}
          className="w-full rounded-control py-2.5 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
          style={{ background: OK }}
        >
          Salvar datas
        </button>
        {!datas.data_limite && (
          <p className="text-[11px] text-corrente">
            Defina a data limite para liberar as solicitações aos servos.
          </p>
        )}
      </div>

      {/* alerta pendentes */}
      {pendentes > 0 && (
        <div
          className="rounded-card border px-4 py-3 text-sm font-semibold"
          style={{ borderColor: "rgba(224,162,60,0.45)", background: "rgba(224,162,60,0.08)", color: AVISO }}
        >
          ⏳ {pendentes} solicitação{pendentes > 1 ? "ões" : ""} de alteração pendente
          {pendentes > 1 ? "s" : ""}
        </div>
      )}

      {/* resumo */}
      <div className={`${cardCls} space-y-3 p-4`}>
        <p className="text-xs uppercase tracking-wide text-corrente">Resumo ({reais.length} pedidos)</p>
        {(["camisa", "calca", "blusa"] as ItemUniforme[]).map((item) => {
          const mapa = resumoTamanhos[item];
          if (mapa.size === 0) return null;
          return (
            <div key={item}>
              <p className="mb-1 text-xs font-semibold text-luz">{ITEM_LABEL[item]}</p>
              <div className="flex flex-wrap gap-1.5">
                {TAMANHOS_UNIFORME.filter((t) => mapa.has(t)).map((t) => (
                  <span
                    key={t}
                    className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
                    style={{ color: "#a4d6e8", background: "rgba(164,214,232,0.1)" }}
                  >
                    {t}: {mapa.get(t)}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
        <div className="space-y-1.5 border-t border-[rgba(164,214,232,0.1)] pt-2 text-sm">
          <div className="flex justify-between">
            <span className="text-luz">● Arrecadado</span>
            <span className="font-bold" style={{ color: OK }}>{brl(financeiro.arrecadado)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-luz">● A receber</span>
            <span className="font-bold" style={{ color: AVISO }}>{brl(financeiro.aReceber)}</span>
          </div>
          <div className="flex justify-between border-t border-[rgba(164,214,232,0.1)] pt-1.5">
            <span className="text-corrente">Total esperado</span>
            <span className="font-bold text-raso">{brl(financeiro.esperado)}</span>
          </div>
        </div>
      </div>

      {/* export */}
      <button
        onClick={exportarCSV}
        className="w-full rounded-control py-3 text-sm font-semibold text-white transition active:scale-[0.98]"
        style={{ background: OK }}
      >
        Exportar para Fornecedor (CSV)
      </button>
      <p className="text-center text-[11px] text-corrente">
        * Só entram no export pedidos com sinal ou integral pagos.
      </p>

      {/* lista */}
      <div className="space-y-2">
        {reais.length === 0 ? (
          <p className="py-8 text-center text-sm text-corrente">Nenhum pedido ainda.</p>
        ) : (
          reais.map((p) => {
            const aberto = expandido === p.servo_id;
            const cor = corPedido(p);
            return (
              <div key={p.servo_id} className={cardCls} style={{ borderLeft: `3px solid ${cor}` }}>
                <button
                  onClick={() => setExpandido(aberto ? null : p.servo_id)}
                  className="flex w-full items-center justify-between gap-2 p-4 text-left"
                >
                  <p className="min-w-0 flex-1 truncate font-semibold text-luz">{p.nome}</p>
                  <span className="flex shrink-0 items-center gap-2">
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={
                        p.status === "pendente"
                          ? { color: AVISO, background: "rgba(224,162,60,0.12)" }
                          : p.status === "aberto"
                            ? { color: "#0a84ff", background: "rgba(10,132,255,0.12)" }
                            : { color: "#a4d6e8", background: "rgba(164,214,232,0.1)" }
                      }
                    >
                      {p.status === "pendente"
                        ? "Aguardando aprovação"
                        : p.status === "aberto"
                          ? "Liberado para editar"
                          : "Pedido realizado"}
                    </span>
                    {aberto ? (
                      <ChevronUp size={15} className="text-corrente" />
                    ) : (
                      <ChevronDown size={15} className="text-corrente" />
                    )}
                  </span>
                </button>

                {aberto && (
                  <div className="space-y-3 border-t border-[rgba(164,214,232,0.1)] px-4 py-4">
                    {/* itens */}
                    <div className="flex flex-wrap gap-1.5">
                      {p.camisa && <PillItem texto={`Camiseta ${p.camisa} ×${p.qtd_camisas}`} />}
                      {p.nome_camiseta && (
                        <PillItem texto={`Nome: ${p.nome_camiseta}`} cor={OK} />
                      )}
                      {p.calca && <PillItem texto={`Calça ${p.calca} ×${p.qtd_calcas}`} />}
                      {p.blusa && <PillItem texto={`Blusa ${p.blusa} ×${p.qtd_blusas}`} />}
                      <PillItem texto={brl(p.valor_total)} cor={OK} />
                    </div>

                    {/* pagamento — marcação manual (PIX fora do app) */}
                    <div className="space-y-2">
                      <p className="text-[11px] uppercase tracking-wide text-corrente">
                        Pagamento (PIX manual)
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            if (p.pago_sinal && !confirm("Desfazer o sinal pago?")) return;
                            rodar(() => definirPagamentoUniforme(p.servo_id, "sinal", !p.pago_sinal));
                          }}
                          disabled={pending || p.pago_integral}
                          className="rounded-control border py-2 text-xs font-bold transition disabled:opacity-40"
                          style={
                            p.pago_sinal
                              ? { borderColor: `${LARANJA}66`, color: LARANJA, background: `${LARANJA}12` }
                              : { borderColor: "rgba(164,214,232,0.2)", color: "#8aa9bd" }
                          }
                        >
                          {p.pago_sinal ? "✓ Sinal pago" : "Marcar sinal (50%)"}
                        </button>
                        <button
                          onClick={() => {
                            if (p.pago_integral && !confirm("Desfazer o pagamento integral?")) return;
                            rodar(() =>
                              definirPagamentoUniforme(p.servo_id, "integral", !p.pago_integral),
                            );
                          }}
                          disabled={pending}
                          className="rounded-control border py-2 text-xs font-bold transition disabled:opacity-40"
                          style={
                            p.pago_integral
                              ? { borderColor: `${OK}66`, color: OK, background: `${OK}12` }
                              : { borderColor: "rgba(164,214,232,0.2)", color: "#8aa9bd" }
                          }
                        >
                          {p.pago_integral ? "✓ Integral pago" : "Marcar integral"}
                        </button>
                      </div>
                    </div>

                    {/* aprovação de alteração */}
                    {p.status === "pendente" && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => rodar(() => decidirAlteracao(p.servo_id, true))}
                          disabled={pending}
                          className="flex-1 rounded-control py-2 text-xs font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
                          style={{ background: OK }}
                        >
                          Aprovar alteração
                        </button>
                        <button
                          onClick={() => rodar(() => decidirAlteracao(p.servo_id, false))}
                          disabled={pending}
                          className="rounded-control border px-4 py-2 text-xs font-semibold transition disabled:opacity-50"
                          style={{ borderColor: "rgba(229,86,78,0.5)", color: ALERTA }}
                        >
                          Reprovar
                        </button>
                      </div>
                    )}

                    {p.atualizado_em && (
                      <p className="text-[11px] text-corrente">
                        Salvo em:{" "}
                        {new Date(p.atualizado_em).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function PillItem({ texto, cor = "#a4d6e8" }: { texto: string; cor?: string }) {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ color: cor, background: `${cor}18` }}
    >
      {texto}
    </span>
  );
}
