import { createClient } from "@/lib/supabase/server";
import type { EncontristaStatus, Sexo } from "@/lib/db-types";

export interface FiltrosEncontristas {
  sexo?: Sexo;
  status?: EncontristaStatus;
  celulaId?: string;
}

// Camada de acesso a dados — Server-only. Toda leitura passa por aqui.
export async function getEncontristas(filtros: FiltrosEncontristas = {}) {
  const supabase = await createClient();

  let query = supabase
    .from("encontristas")
    .select("*")
    .order("nome", { ascending: true });

  if (filtros.sexo) query = query.eq("sexo", filtros.sexo);
  if (filtros.status) query = query.eq("status", filtros.status);
  if (filtros.celulaId) query = query.eq("celula_id", filtros.celulaId);

  const { data, error } = await query;
  if (error) throw new Error(`Erro ao carregar encontristas: ${error.message}`);
  return data;
}

export async function getResumoFinanceiro() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("financeiro_resumo")
    .select("*")
    .single();

  if (error) throw new Error(`Erro ao carregar financeiro: ${error.message}`);
  return data;
}
