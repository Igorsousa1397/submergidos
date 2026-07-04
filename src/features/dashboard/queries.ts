import { createClient } from "@/lib/supabase/server";

// ============================================================
//  Dados do Dashboard (Fase 1) — Server-only.
//  Espelha o painel do Encontro com Deus: contadores de topo +
//  card de encontristas (meta) + financeiro em R$.
//
//  Observação de cálculo: a tabela `encontristas` não guarda igreja
//  nem forma de pagamento, então o financeiro usa o VALOR PADRÃO por
//  cabeça. O desconto de Itajaí (que depende da célula) não é aplicado
//  aqui — refinar numa fase futura se necessário.
// ============================================================

export const META_ENCONTRISTAS = 140;
export const VALOR_PADRAO = 360; // R$ por encontrista (PIX padrão)

export type DashboardData = {
  // contadores de topo
  checkinFeitos: number;
  checkinTotal: number;
  onibusOcupados: number;
  onibusTotal: number;
  quartos: number;
  ocorrencias: number;
  // encontristas
  total: number;
  pagos: number;
  pendentes: number;
  pagarDepois: number;
  desistencias: number;
  meta: number;
  // financeiro (R$)
  arrecadado: number;
  aReceber: number;
  previsaoTotal: number;
};

export async function getDashboard(): Promise<DashboardData> {
  const supabase = await createClient();

  // financeiro_resumo já traz as contagens por status
  const { data: resumo } = await supabase
    .from("financeiro_resumo")
    .select("*")
    .single();

  const pagos = resumo?.qtd_pagos ?? 0;
  const pendentes = resumo?.qtd_pendentes ?? 0;
  const pagarDepois = resumo?.qtd_pagar_depois ?? 0;
  const desistencias = resumo?.qtd_desistencias ?? 0;
  const total = resumo?.total_geral ?? 0;

  // contadores de topo (contagens simples; head:true = só o count)
  const [checkin, quartos, ocorrencias, onibusList] = await Promise.all([
    supabase.from("encontristas").select("id", { count: "exact", head: true }).eq("chegou", true),
    supabase.from("quartos").select("id", { count: "exact", head: true }),
    supabase.from("ocorrencias").select("id", { count: "exact", head: true }),
    supabase.from("onibus").select("id"),
  ]);

  const checkinFeitos = checkin.count ?? 0;
  const onibusTotal = onibusList.data?.length ?? 0;

  // financeiro em R$ (valor padrão por cabeça)
  const arrecadado = pagos * VALOR_PADRAO;
  const aReceber = (pendentes + pagarDepois) * VALOR_PADRAO;
  const previsaoTotal = META_ENCONTRISTAS * VALOR_PADRAO;

  return {
    checkinFeitos,
    checkinTotal: total,
    onibusOcupados: 0, // ocupação por ônibus: fase futura (precisa contar encontristas por onibus_id)
    onibusTotal,
    quartos: quartos.count ?? 0,
    ocorrencias: ocorrencias.count ?? 0,
    total,
    pagos,
    pendentes,
    pagarDepois,
    desistencias,
    meta: META_ENCONTRISTAS,
    arrecadado,
    aReceber,
    previsaoTotal,
  };
}
