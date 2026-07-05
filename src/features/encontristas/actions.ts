"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

// O types gerado pelo Supabase não exporta um alias solto; derivamos do enum.
type EncontristaStatus = Database["public"]["Enums"]["encontrista_status"];

// Mutations como Server Actions. RLS garante que só admin/líderes escrevem.

export async function atualizarStatus(id: string, status: EncontristaStatus) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("encontristas")
    .update({ status })
    .eq("id", id);

  if (error) return { ok: false, erro: error.message };
  return { ok: true };
}

export async function fazerCheckin(id: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("encontristas")
    .update({ chegou: true, checkin_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return { ok: false, erro: error.message };
  revalidatePath("/check-in");
  revalidatePath("/encontristas");
  return { ok: true };
}

// Abre/fecha inscrições (app_config key='inscricoes' → {bloqueadas: bool}).
export async function alternarInscricoes(bloquear: boolean) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("app_config")
    .update({ value: { bloqueadas: bloquear } })
    .eq("key", "inscricoes");

  if (error) return { ok: false, erro: error.message };
  revalidatePath("/encontristas");
  return { ok: true };
}

export async function salvarPagarDepois(id: string, data: string) {
  const supabase = await createClient();
  await supabase
    .from("encontristas")
    .update({ status: "pagar_depois", pagar_depois_data: data || null })
    .eq("id", id);
}
