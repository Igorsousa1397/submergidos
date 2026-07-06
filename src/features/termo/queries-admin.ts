import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

type Sexo = Database["public"]["Enums"]["sexo"];

export interface TermoRow {
  id: string;
  nome: string;
  sexo: Sexo | null;
  igreja: string | null;
  termo_assinado_at: string | null;
  termo_pdf_path: string | null;
}

// Lista todos os encontristas com os campos de termo. RLS garante admin/líderes.
export async function getTermos(): Promise<TermoRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("encontristas")
    .select("id, nome, sexo, igreja, termo_assinado_at, termo_pdf_path")
    .order("nome", { ascending: true });

  if (error) throw new Error(`Erro ao carregar termos: ${error.message}`);
  return data ?? [];
}