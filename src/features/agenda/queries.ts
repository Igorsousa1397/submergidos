import { createClient } from "@/lib/supabase/server";
import { ordenarAgenda, type AgendaRow } from "./shared";

// Camada de leitura — Server-only. Constantes/tipos vivem em shared.ts
// (importável por client components sem arrastar next/headers).
export async function getAgenda(): Promise<AgendaRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("agenda")
    .select("id, dia, hora, ordem, titulo, ministrante, descricao, aviso");

  if (error) throw new Error(`Erro ao carregar agenda: ${error.message}`);
  return ordenarAgenda(data ?? []);
}
