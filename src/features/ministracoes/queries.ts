import { createClient } from "@/lib/supabase/server";
import type { MinistracaoRow } from "./shared";

// Cronograma das ministrações — leitura para qualquer usuário logado.
export async function getMinistracoes(): Promise<MinistracaoRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ministracoes")
    .select("id, ordem, titulo, quando, ministrante, texto, base, citacao, tema, ato, direcao")
    .order("ordem", { ascending: true });

  if (error) throw new Error(`Erro ao carregar ministrações: ${error.message}`);
  return data ?? [];
}
