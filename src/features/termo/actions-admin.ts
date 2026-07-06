"use server";

import { createClient } from "@/lib/supabase/server";

// Gera uma URL temporária (signed) do PDF no bucket privado "termos".
// O admin está autenticado, então o client do servidor tem permissão de leitura.
export async function gerarUrlPdf(path: string): Promise<string | null> {
  if (!path) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from("termos")
    .createSignedUrl(path, 60); // válida por 60s — tempo de abrir/baixar
  if (error) return null;
  return data?.signedUrl ?? null;
}