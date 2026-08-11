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
  tipo: "inscricao_pendente" | "inscricao_pagar_depois";
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

  const [ocorr, quartos, agendaRes, escalasRes, perfilRes, cfgServosRes] =
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
      supabase.from("app_config").select("value").eq("key", "servos").maybeSingle(),
    ]);

  const escalas: EscalaItem[] = (escalasRes.data ?? []).map((e) => ({
    dia: e.dia,
    periodo: e.periodo,
    // relação por FK única vem como objeto
    funcao: (e.funcoes as unknown as { nome: string } | null)?.nome ?? "—",
  }));

  // ---- banners de pendência (porta dos slides do carrossel do original) ----
  const banners: BannerPendencia[] = [];

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

  return {
    ocorrencias: ocorr.count ?? 0,
    quartos: quartos.count ?? 0,
    // ordena quinta→domingo, depois por hora (mesma regra da tela de Agenda)
    agenda: ordenarAgenda(agendaRes.data ?? []),
    escalas,
    banners,
  };
}
