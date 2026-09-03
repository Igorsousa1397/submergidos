import { createClient } from "@/lib/supabase/server";
import { STATUS_CONFIRMADOS_CHECKIN } from "@/lib/constants";

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

export const META_ENCONTRISTAS = 120;
export const VALOR_PADRAO = 360; // R$ por encontrista

const VALOR_COZINHA = 100;
const VALOR_SERVO = 220;

export type DiaCount = { dia: string; iso: string; qtd: number };
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
  itajai: number; // encontristas da Fonte Itajaí (pagam R$ 200)
  // financeiro encontristas
  arrecadado: number;
  aReceber: number; // total a receber (pendentes + pagar depois)
  aReceberPendente: number;
  aReceberPagarDepois: number;
  previsaoTotal: number;
  // servos
  servosTotal: number;
  servosPagos: number;
  servosPendentes: number;
  servosPagarDepois: number;
  servosAbonados: number;
  servosArrecadado: number;
  servosAReceber: number; // total a receber (pendentes + pagar depois)
  servosAReceberPendente: number;
  servosAReceberPagarDepois: number;
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
  const [checkin, quartos, ocorrencias, onibusList, passageiros, servos, roles, encs] =
    await Promise.all([
      // check-in só vale para quem tem pagamento confirmado (mesma regra da tela)
      supabase
        .from("encontristas")
        .select("id", { count: "exact", head: true })
        .eq("chegou", true)
        .in("status", STATUS_CONFIRMADOS_CHECKIN),
      supabase.from("quartos").select("id", { count: "exact", head: true }),
      // como no original: o contador é de ocorrências NÃO resolvidas
      supabase
        .from("ocorrencias")
        .select("id", { count: "exact", head: true })
        .eq("resolvido", false),
      supabase.from("onibus").select("id, capacidade"),
      // ônibus como no original: passageiros atribuídos / capacidade total
      supabase
        .from("encontristas")
        .select("id", { count: "exact", head: true })
        .not("onibus_id", "is", null),
      supabase.from("profiles").select("role, pagamento, ativo"),
      supabase.from("roles").select("slug, isento_pagamento"),
      supabase.from("encontristas").select("created_at, celula, status, acordo_valor, igreja"),
    ]);

  const checkinFeitos = checkin.count ?? 0;
  // denominador do card: quem pode fazer check-in (pago ou pagar depois)
  const checkinTotal = (encs.data ?? []).filter((e) =>
    (STATUS_CONFIRMADOS_CHECKIN as string[]).includes(e.status),
  ).length;
  const onibusTotal = (onibusList.data ?? []).reduce((s, o) => s + (o.capacidade ?? 0), 0);

  // financeiro encontristas
  // Considera acordos: quem tem acordo_valor conta com esse valor no lugar do padrão.
  // Itajaí paga R$ 200 (regra do original).
  // "a receber" fica separado por status: pendente é cobrança em aberto,
  // pagar depois é prazo já combinado com a liderança — a liderança precisa
  // distinguir os dois para saber o que cobrar hoje.
  let arrecadado = 0;
  let aReceberPendente = 0;
  let aReceberPagarDepois = 0;
  let itajai = 0;
  for (const e of encs.data ?? []) {
    const ehItajai = e.igreja === "Fonte Itajaí";
    if (ehItajai && e.status !== "desistiu") itajai += 1;
    const valor = e.acordo_valor ?? (ehItajai ? 200 : VALOR_PADRAO);
    if (e.status === "pago") arrecadado += valor;
    else if (e.status === "pendente") aReceberPendente += valor;
    else if (e.status === "pagar_depois") aReceberPagarDepois += valor;
  }
  const aReceber = aReceberPendente + aReceberPagarDepois;
  // previsão da meta: Itajaí entra com R$ 200 (nota exibida no card)
  const previsaoTotal =
    Math.max(0, META_ENCONTRISTAS - itajai) * VALOR_PADRAO + itajai * 200;

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
  let servosPagarDepois = 0;
  let servosAbonados = 0;
  let servosArrecadado = 0;
  let servosAReceberPendente = 0;
  let servosAReceberPagarDepois = 0;

  for (const s of servosAtivos) {
    // abonado por perfil (isento) OU abonado manualmente — fora do financeiro
    const isento = (isentaPorSlug.get(s.role) ?? false) || s.pagamento === "abonado";
    if (isento) {
      servosAbonados += 1;
      continue;
    }
    const valor = s.role === "cozinha" ? VALOR_COZINHA : VALOR_SERVO;
    if (s.pagamento === "pago") {
      servosPagos += 1;
      servosArrecadado += valor;
    } else if (s.pagamento === "pagar_depois") {
      servosPagarDepois += 1;
      servosAReceberPagarDepois += valor;
    } else {
      servosPendentes += 1;
      servosAReceberPendente += valor;
    }
  }
  const servosAReceber = servosAReceberPendente + servosAReceberPagarDepois;

  // ---- cadastros por dia (encontristas.created_at) ----
  // chaveado pelo ISO (permite filtrar 7d/14d/30d e ordenar de verdade)
  const contagemDia = new Map<string, number>();
  for (const e of encs.data ?? []) {
    if (!e.created_at) continue;
    const iso = e.created_at.slice(0, 10);
    contagemDia.set(iso, (contagemDia.get(iso) ?? 0) + 1);
  }
  const cadastrosPorDia: DiaCount[] = [...contagemDia.entries()]
    .map(([iso, qtd]) => ({
      iso,
      dia: `${iso.slice(8, 10)}/${iso.slice(5, 7)}`,
      qtd,
    }))
    .sort((a, b) => a.iso.localeCompare(b.iso));

  // ---- por célula ----
  const contagemCel = new Map<string, number>();
  for (const e of encs.data ?? []) {
    const nome = e.celula || "Sem célula";
    contagemCel.set(nome, (contagemCel.get(nome) ?? 0) + 1);
  }
  const porCelula: CelulaCount[] = [...contagemCel.entries()]
    .map(([nome, qtd]) => ({ nome, qtd }))
    .sort((a, b) => b.qtd - a.qtd);

  return {
    checkinFeitos,
    checkinTotal,
    onibusOcupados: passageiros.count ?? 0,
    onibusTotal,
    quartos: quartos.count ?? 0,
    ocorrencias: ocorrencias.count ?? 0,
    total,
    pagos,
    pendentes,
    pagarDepois,
    desistencias,
    meta: META_ENCONTRISTAS,
    itajai,
    arrecadado,
    aReceber,
    aReceberPendente,
    aReceberPagarDepois,
    previsaoTotal,
    servosTotal: servosAtivos.length,
    servosPagos,
    servosPendentes,
    servosPagarDepois,
    servosAbonados,
    servosArrecadado,
    servosAReceber,
    servosAReceberPendente,
    servosAReceberPagarDepois,
    cadastrosPorDia,
    porCelula,
  };
}
