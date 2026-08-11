import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

type ServoPagamento = Database["public"]["Enums"]["servo_pagamento"];

// Valores da inscrição do servo (mesma regra do dashboard: cozinha 100, demais 220)
export const VALOR_SERVO = 220;
export const VALOR_COZINHA = 100;

export interface MeuPerfil {
  nome: string;
  email: string | null;
  cpf: string | null;
  nascimento: string | null;
  sexo: "masculino" | "feminino" | null;
  celula: string | null;
  lider_celula: boolean;
  roleNome: string;
  roleCor: string;
  roleSlug: string;
  isento: boolean; // roles.isento_pagamento (pastor, pastor aux., líder geral)
  pagamento: ServoPagamento;
  pago_em: string | null;
  pagar_depois_data: string | null;
  pagar_depois_obs: string | null;
  dataLimitePagamento: string | null; // app_config 'servos'
}

export async function getMeuPerfil(userId: string): Promise<MeuPerfil | null> {
  const supabase = await createClient();

  const [perfilRes, configRes] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "nome, email, cpf, nascimento, sexo, celula, lider_celula, role, pagamento, pago_em, pagar_depois_data, pagar_depois_obs, roles(nome, cor, isento_pagamento)",
      )
      .eq("id", userId)
      .single(),
    supabase.from("app_config").select("value").eq("key", "servos").maybeSingle(),
  ]);

  const p = perfilRes.data;
  if (!p) return null;

  const role = p.roles as unknown as {
    nome: string;
    cor: string | null;
    isento_pagamento: boolean;
  } | null;

  return {
    nome: p.nome,
    email: p.email,
    cpf: p.cpf,
    nascimento: p.nascimento,
    sexo: p.sexo,
    celula: p.celula,
    lider_celula: p.lider_celula,
    roleNome: role?.nome ?? p.role,
    roleCor: role?.cor ?? "#6b7280",
    roleSlug: p.role,
    isento: role?.isento_pagamento ?? false,
    pagamento: p.pagamento,
    pago_em: p.pago_em,
    pagar_depois_data: p.pagar_depois_data,
    pagar_depois_obs: p.pagar_depois_obs,
    dataLimitePagamento:
      (configRes.data?.value as { data_limite_pagamento?: string | null } | null)
        ?.data_limite_pagamento ?? null,
  };
}
