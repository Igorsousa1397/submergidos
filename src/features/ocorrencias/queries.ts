import { createClient } from "@/lib/supabase/server";

export interface OcorrenciaRow {
  id: string;
  tipo: string | null;
  local: string | null;
  descricao: string | null;
  resolvido: boolean;
  resolvido_at: string | null;
  resolvido_por_nome: string | null;
  created_at: string | null;
}

// Todos os logados leem (a tela é aberta a todos, como no original).
export async function getOcorrencias(): Promise<OcorrenciaRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ocorrencias")
    .select("id, tipo, local, descricao, resolvido, resolvido_at, created_at, profiles(nome)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Erro ao carregar ocorrências: ${error.message}`);

  return (data ?? []).map((o) => ({
    id: o.id,
    tipo: o.tipo,
    local: o.local,
    descricao: o.descricao,
    resolvido: o.resolvido,
    resolvido_at: o.resolvido_at,
    resolvido_por_nome: (o.profiles as unknown as { nome: string } | null)?.nome ?? null,
    created_at: o.created_at,
  }));
}
