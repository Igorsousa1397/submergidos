import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

export type ServoPagamento = Database["public"]["Enums"]["servo_pagamento"];

export interface ServoRow {
  id: string;
  nome: string;
  email: string | null;
  cpf: string | null;
  nascimento: string | null;
  sexo: "masculino" | "feminino" | null;
  role: string;
  ativo: boolean;
  primeiro: boolean;
  aprovado: boolean;
  pagamento: ServoPagamento;
  pagar_depois_data: string | null;
  pagar_depois_obs: string | null;
}

export interface RoleInfo {
  slug: string;
  nome: string;
  cor: string;
  isento_pagamento: boolean;
}

export interface ServosData {
  servos: ServoRow[];
  roles: RoleInfo[];
  dataLimitePagamento: string | null; // app_config key 'servos'
}

// Camada de leitura — Server-only.
// A tela não lista o perfil `admin` (regra do original: admin não é "servo").
export async function getServosData(): Promise<ServosData> {
  const supabase = await createClient();

  const [servosRes, rolesRes, configRes] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, nome, email, cpf, nascimento, sexo, role, ativo, primeiro, aprovado, pagamento, pagar_depois_data, pagar_depois_obs",
      )
      .neq("role", "admin")
      .order("nome", { ascending: true }),
    supabase
      .from("roles")
      .select("slug, nome, cor, isento_pagamento")
      .order("ordem", { ascending: true }),
    supabase.from("app_config").select("value").eq("key", "servos").maybeSingle(),
  ]);

  if (servosRes.error) throw new Error(`Erro ao carregar servos: ${servosRes.error.message}`);
  if (rolesRes.error) throw new Error(`Erro ao carregar perfis: ${rolesRes.error.message}`);

  const dataLimite =
    (configRes.data?.value as { data_limite_pagamento?: string | null } | null)
      ?.data_limite_pagamento ?? null;

  return {
    servos: (servosRes.data ?? []) as ServoRow[],
    roles: (rolesRes.data ?? []).map((r) => ({ ...r, cor: r.cor ?? "#6b7280" })),
    dataLimitePagamento: dataLimite,
  };
}
