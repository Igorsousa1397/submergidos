import { createClient } from "@/lib/supabase/server";

export interface AchadoRow {
  id: string;
  item: string;
  local: string | null;
  dono: string | null;
  entregue: boolean;
  entregue_at: string | null;
  criado_por_nome: string | null;
  created_at: string | null;
}

// Todos os logados leem — a lista existe pra devolver as coisas aos donos.
export async function getAchados(): Promise<AchadoRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("achados")
    .select("id, item, local, dono, entregue, entregue_at, created_at, profiles(nome)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Erro ao carregar achados: ${error.message}`);

  return (data ?? []).map((a) => ({
    id: a.id,
    item: a.item,
    local: a.local,
    dono: a.dono,
    entregue: a.entregue,
    entregue_at: a.entregue_at,
    criado_por_nome: (a.profiles as unknown as { nome: string } | null)?.nome ?? null,
    created_at: a.created_at,
  }));
}
