import { createClient } from "@/lib/supabase/server";
import { ordenarAgenda } from "@/features/agenda/shared";

export interface AgendaItem {
  id: string;
  dia: string | null;
  hora: string | null;
  titulo: string;
  ministrante: string | null;
  descricao: string | null;
  aviso: string | null;
}

export interface EscalaItem {
  dia: string;
  periodo: string | null;
  funcao: string;
}

// Banners de pendência exibidos acima da agenda (no original era um carrossel)
export interface BannerPendencia {
  tipo: "inscricao_pendente" | "inscricao_pagar_depois" | "uniforme_sem_pedido" | "uniforme_sem_sinal" | "uniforme_falta_restante";
  href: string;
  valor?: number;
  prazo?: string | null;
}

export interface ServoHomeData {
  ocorrencias: number;
  quartos: number;
  agenda: AgendaItem[];
  escalas: EscalaItem[];
  banners: BannerPendencia[];
}

// Home do servo — contadores + agenda publicada + escalas DO próprio servo.
export async function getServoHome(userId: string): Promise<ServoHomeData> {
  const supabase = await createClient();

  const [ocorr, quartos, agendaRes, escalasRes, perfilRes, uniformeRes, cfgServosRes, cfgUniRes] =
    await Promise.all([
      // como no original: conta só as NÃO resolvidas
      supabase
        .from("ocorrencias")
        .select("id", { count: "exact", head: true })
        .eq("resolvido", false),
      supabase.from("quartos").select("id", { count: "exact", head: true }),
      supabase
        .from("agenda")
        .select("id, dia, hora, ordem, titulo, ministrante, descricao, aviso"),
      supabase
        .from("escalas")
        .select("dia, periodo, funcoes(nome)")
        .eq("servo_id", userId),
      supabase
        .from("profiles")
        .select("role, pagamento, pagar_depois_data, roles(isento_pagamento)")
        .eq("id", userId)
        .single(),
      supabase.from("uniformes").select("*").eq("servo_id", userId).maybeSingle(),
      supabase.from("app_config").select("value").eq("key", "servos").maybeSingle(),
      supabase.from("app_config").select("value").eq("key", "uniformes").maybeSingle(),
    ]);

  const escalas: EscalaItem[] = (escalasRes.data ?? []).map((e) => ({
    dia: e.dia,
    periodo: e.periodo,
    // relação por FK única vem como objeto
    funcao: (e.funcoes as unknown as { nome: string } | null)?.nome ?? "—",
  }));

  // ---- banners de pendência (porta dos slides do carrossel do original) ----
  const banners: BannerPendencia[] = [];
  const hoje = new Date().toISOString().slice(0, 10);

  const perfil = perfilRes.data;
  const isento =
    (perfil?.roles as unknown as { isento_pagamento: boolean } | null)?.isento_pagamento ??
    false;
  const dataLimitePag =
    (cfgServosRes.data?.value as { data_limite_pagamento?: string | null } | null)
      ?.data_limite_pagamento ?? null;

  if (perfil && !isento) {
    const valor = perfil.role === "cozinha" ? 100 : 220;
    if (perfil.pagamento === "pendente")
      banners.push({ tipo: "inscricao_pendente", href: "/perfil", valor, prazo: dataLimitePag });
    else if (perfil.pagamento === "pagar_depois")
      banners.push({
        tipo: "inscricao_pagar_depois",
        href: "/perfil",
        valor,
        prazo: perfil.pagar_depois_data,
      });
  }

  const uniLimite =
    (cfgUniRes.data?.value as { data_limite?: string | null } | null)?.data_limite ?? null;
  if (uniLimite && hoje <= uniLimite) {
    const uni = uniformeRes.data;
    if (!uni)
      banners.push({ tipo: "uniforme_sem_pedido", href: "/uniformes", prazo: uniLimite });
    else if (!uni.nao_quer && !uni.pago_sinal && !uni.pago_integral)
      banners.push({
        tipo: "uniforme_sem_sinal",
        href: "/uniformes",
        valor: Number(uni.valor_total) / 2,
      });
    else if (!uni.nao_quer && uni.pago_sinal && !uni.pago_integral)
      banners.push({
        tipo: "uniforme_falta_restante",
        href: "/uniformes",
        valor: Number(uni.valor_total) / 2,
      });
  }

  return {
    ocorrencias: ocorr.count ?? 0,
    quartos: quartos.count ?? 0,
    // ordena quinta→domingo, depois por hora (mesma regra da tela de Agenda)
    agenda: ordenarAgenda(agendaRes.data ?? []),
    escalas,
    banners,
  };
}
