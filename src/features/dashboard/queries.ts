import { createClient } from "@/lib/supabase/server";

// ============================================================
//  Dados do Dashboard — Server-only.
//  Espelha o painel do Encontro com Deus: contadores de topo,
//  encontristas (meta), financeiro, servos, cadastros/dia e por célula.
//
//  Financeiro encontristas: valor PADRÃO por cabeça (a tabela não guarda
//  igreja/forma de pagamento; desconto Itajaí fica pra fase futura).
//  Financeiro servos: R$220 (staff/líder/servo) e R$100 (cozinha);
//  roles isentas (isento_pagamento) não contabilizam.
// ============================================================

export const META_ENCONTRISTAS = 140;
export const VALOR_PADRAO = 360; // R$ por encontrista

const VALOR_COZINHA = 100;
const VALOR_SERVO = 220;

export type DiaCount = { dia: string; qtd: number };
export type CelulaCount = { nome: string; qtd: number };

export type DashboardData = {
  // topo
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
  // financeiro encontristas
  arrecadado: number;
  aReceber: number;
  previsaoTotal: number;
  // servos
  servosTotal: number;
  servosPagos: number;
  servosPendentes: number;
  servosAbonados: number;
  servosArrecadado: number;
  servosAReceber: number;
  // gráficos
  cadastrosPorDia: DiaCount[];
  porCelula: CelulaCount[];
};

export async function getDashboard(): Promise<DashboardData> {
  const supabase = await createClient();

  // ---- encontristas: contagens por status ----
  const { data: resumo } = await supabase
    .from("financeiro_resumo")
    .select("*")
    .single();

  const pagos = resumo?.qtd_pagos ?? 0;
  const pendentes = resumo?.qtd_pendentes ?? 0;
  const pagarDepois = resumo?.qtd_pagar_depois ?? 0;
  const desistencias = resumo?.qtd_desistencias ?? 0;
  const total = resumo?.total_geral ?? 0;

  // ---- contadores de topo + dados brutos p/ agregações ----
  const [checkin, quartos, ocorrencias, onibusList, servos, roles, encs, celulas] =
    await Promise.all([
      supabase.from("encontristas").select("id", { count: "exact", head: true }).eq("chegou", true),
      supabase.from("quartos").select("id", { count: "exact", head: true }),
      supabase.from("ocorrencias").select("id", { count: "exact", head: true }),
      supabase.from("onibus").select("id"),
      supabase.from("profiles").select("role, pago, ativo"),
      supabase.from("roles").select("slug, isento_pagamento"),
      supabase.from("encontristas").select("created_at, celula_id"),
      supabase.from("celulas").select("id, nome"),
    ]);

  const checkinFeitos = checkin.count ?? 0;
  const onibusTotal = onibusList.data?.length ?? 0;

  // financeiro encontristas
  const arrecadado = pagos * VALOR_PADRAO;
  const aReceber = (pendentes + pagarDepois) * VALOR_PADRAO;
  const previsaoTotal = META_ENCONTRISTAS * VALOR_PADRAO;

  // ---- servos ----
  const isentaPorSlug = new Map<string, boolean>(
    (roles.data ?? []).map((r) => [r.slug, r.isento_pagamento]),
  );
  // Perfis de gestão não são "servos" que pagam inscrição — ficam fora da conta.
  const ROLES_GESTAO = new Set(["admin", "lider_geral"]);
  const servosAtivos = (servos.data ?? []).filter(
    (s) => s.ativo && !ROLES_GESTAO.has(s.role),
  );

  let servosPagos = 0;
  let servosPendentes = 0;
  let servosAbonados = 0;
  let servosArrecadado = 0;
  let servosAReceber = 0;

  for (const s of servosAtivos) {
    const isento = isentaPorSlug.get(s.role) ?? false;
    if (isento) {
      servosAbonados += 1;
      continue; // abonados não contam no financeiro
    }
    const valor = s.role === "cozinha" ? VALOR_COZINHA : VALOR_SERVO;
    if (s.pago) {
      servosPagos += 1;
      servosArrecadado += valor;
    } else {
      servosPendentes += 1;
      servosAReceber += valor;
    }
  }

  // ---- cadastros por dia (encontristas.created_at) ----
  const contagemDia = new Map<string, number>();
  for (const e of encs.data ?? []) {
    if (!e.created_at) continue;
    const dia = new Date(e.created_at).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    });
    contagemDia.set(dia, (contagemDia.get(dia) ?? 0) + 1);
  }
  const cadastrosPorDia: DiaCount[] = [...contagemDia.entries()]
    .map(([dia, qtd]) => ({ dia, qtd }))
    .sort((a, b) => a.dia.localeCompare(b.dia));

  // ---- por célula ----
  const nomePorId = new Map<string, string>(
    (celulas.data ?? []).map((c) => [c.id, c.nome]),
  );
  const contagemCel = new Map<string, number>();
  for (const e of encs.data ?? []) {
    const nome = e.celula_id ? nomePorId.get(e.celula_id) ?? "—" : "Sem célula";
    contagemCel.set(nome, (contagemCel.get(nome) ?? 0) + 1);
  }
  const porCelula: CelulaCount[] = [...contagemCel.entries()]
    .map(([nome, qtd]) => ({ nome, qtd }))
    .sort((a, b) => b.qtd - a.qtd);

  return {
    checkinFeitos,
    checkinTotal: total,
    onibusOcupados: 0,
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
    servosTotal: servosAtivos.length,
    servosPagos,
    servosPendentes,
    servosAbonados,
    servosArrecadado,
    servosAReceber,
    cadastrosPorDia,
    porCelula,
  };
}
