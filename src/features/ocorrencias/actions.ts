"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Ocorrências são de TODOS: qualquer servo logado registra e resolve
// (regra do original; o RLS ocorr_write/ocorr_update já permite).

function revalidar() {
  revalidatePath("/ocorrencias");
  revalidatePath("/dashboard"); // contadores (admin e home do servo)
}

export async function registrarOcorrencia(tipo: string, local: string, descricao: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Não autenticado." };
  if (!tipo.trim()) return { ok: false, erro: "Selecione o tipo da ocorrência." };

  const { error } = await supabase.from("ocorrencias").insert({
    tipo: tipo.trim(),
    local: local.trim() || null,
    descricao: descricao.trim() || null,
  });
  if (error) return { ok: false, erro: error.message };
  revalidar();
  return { ok: true };
}

// Marca como resolvida (com autor/hora) ou reabre.
export async function alternarResolvida(id: string, resolver: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Não autenticado." };

  const { error } = await supabase
    .from("ocorrencias")
    .update({
      resolvido: resolver,
      resolvido_por: resolver ? user.id : null,
      resolvido_at: resolver ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) return { ok: false, erro: error.message };
  revalidar();
  return { ok: true };
}
