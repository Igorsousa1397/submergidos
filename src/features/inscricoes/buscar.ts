"use server";

import { createClient } from "@/lib/supabase/server";
import type { EncontristaStatus } from "@/lib/database.types";

export interface InscricaoEncontrada {
  id: string;
  nome: string;
  igreja: string | null;
  celula: string | null;
  status: EncontristaStatus;
}

export type BuscaResult =
  | { ok: true; enc: InscricaoEncontrada }
  | { ok: false; erro: string };

export async function buscarInscricao(documento: string): Promise<BuscaResult> {
  const doc = (documento || "").replace(/\D/g, "");
  if (doc.length < 10)
    return { ok: false, erro: "Informe um CPF ou WhatsApp válido." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("buscar_inscricao", {
    documento: doc,
  });

  if (error) return { ok: false, erro: "Erro ao buscar inscrição." };

  const enc = (Array.isArray(data) ? data[0] : data) as
    | InscricaoEncontrada
    | undefined;

  if (!enc)
    return {
      ok: false,
      erro: "Inscrição não encontrada. Verifique o CPF ou WhatsApp informado.",
    };

  return { ok: true, enc };
}
