import { createClient } from "@/lib/supabase/server";
import { ordenarAgenda } from "@/features/agenda/shared";
import { LIDER_MAP_DEFAULT } from "@/features/backoffice/shared";
import type { MinistracaoRow } from "@/features/ministracoes/shared";
import { getMinistracoes } from "@/features/ministracoes/queries";

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
  lideres: string[]; // responsáveis pela função (lider_map)
  colegas: { nome: string; euMesmo: boolean }[]; // quem serve junto no dia
  meuQuarto: string | null; // preenchido quando a função é "Servo de Quarto"
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
  ministracoes: MinistracaoRow[];
  banners: BannerPendencia[];
}

// Home do servo — contadores + agenda publicada + escalas DO próprio servo.
export async function getServoHome(userId: string): Promise<ServoHomeData> {
  const supabase = await createClient();

  const [
    ocorr,
    quartos,
    agendaRes,
    escalasRes,
    perfilRes,
    cfgServosRes,
    todasEscalasRes,
    pessoasRes,
    liderMapRes,
    meuQuartoRes,
    ministracoesRes,
  ] = await Promise.all([
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
        .select("dia, periodo, funcao_id, funcoes(nome)")
        .eq("servo_id", userId),
      supabase
        .from("profiles")
        .select("role, sexo, pagamento, pagar_depois_data, roles(isento_pagamento)")
        .eq("id", userId)
        .single(),
      supabase.from("app_config").select("value").eq("key", "servos").maybeSingle(),
      // quem mais está escalado (para a lista "Equipe")
      supabase.from("escalas").select("servo_id, dia, funcao_id, profiles(nome, sexo, ativo)"),
      // pessoas ativas, para resolver os líderes a partir do perfil
      supabase.from("profiles").select("nome, role").eq("ativo", true),
      // responsáveis por função (overrides do Back Office)
      supabase.from("app_config").select("value").eq("key", "lider_map").maybeSingle(),
      // quarto do servo (usado quando a função é "Servo de Quarto")
      supabase
        .from("quarto_servos")
        .select("quartos(numero, is_maes)")
        .eq("servo_id", userId)
        .maybeSingle(),
      // cronograma das ministrações (aba "Ministrações") — horário e
      // ministrante já resolvidos a partir da agenda
      getMinistracoes(),
    ]);

  // ---- escalas do servo, com líderes e equipe (como no original) ----
  const meuSexo = perfilRes.data?.sexo ?? null;
  const liderMap =
    (liderMapRes.data?.value as Record<string, string[]> | null) ?? {};
  const pessoas = pessoasRes.data ?? [];
  const quartoRel = meuQuartoRes.data?.quartos as unknown as
    | { numero: string; is_maes: boolean }
    | null;
  const meuQuartoNome = quartoRel
    ? quartoRel.is_maes
      ? "Mães"
      : `Quarto ${quartoRel.numero}`
    : null;

  const escalas: EscalaItem[] = (escalasRes.data ?? []).map((e) => {
    const funcao = (e.funcoes as unknown as { nome: string } | null)?.nome ?? "—";
    // responsáveis: override do Back Office → padrão do original → líder staff
    const perfisLider = liderMap[funcao] ?? LIDER_MAP_DEFAULT[funcao] ?? ["lider_staff"];
    const lideres = pessoas
      .filter((p) => perfisLider.includes(p.role))
      .map((p) => p.nome)
      .sort((a, b) => a.localeCompare(b, "pt-BR"));

    // equipe do mesmo dia e função; "Servo de Quarto" só lista o mesmo sexo
    const colegas = (todasEscalasRes.data ?? [])
      .filter((x) => x.dia === e.dia && x.funcao_id === e.funcao_id)
      .map((x) => ({
        servo_id: x.servo_id,
        p: x.profiles as unknown as { nome: string; sexo: string | null; ativo: boolean } | null,
      }))
      .filter(({ p }) => p && p.ativo)
      .filter(({ p }) => funcao !== "Servo de Quarto" || p!.sexo === meuSexo)
      .map(({ servo_id, p }) => ({ nome: p!.nome, euMesmo: servo_id === userId }))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

    return {
      dia: e.dia,
      periodo: e.periodo,
      funcao,
      lideres,
      colegas,
      meuQuarto: funcao === "Servo de Quarto" ? meuQuartoNome : null,
    };
  });

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
    ministracoes: ministracoesRes,
    banners,
  };
}
