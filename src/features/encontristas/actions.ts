"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/permissions";
import type { Database } from "@/lib/database.types";

// O types gerado pelo Supabase não exporta um alias solto; derivamos do enum.
type EncontristaStatus = Database["public"]["Enums"]["encontrista_status"];

// Mutations como Server Actions. RLS garante que só admin/líderes escrevem.

// Marca como "pago" manualmente — SÓ admin. O fluxo normal é o webhook do
// Mercado Pago; esta action existe para ajustes (PIX por fora, acordo pago, etc.).
// A checagem de role aqui é defesa em profundidade: a UI já esconde o botão,
// mas o servidor é a fonte da verdade (não confia no cliente).
export async function marcarComoPago(id: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Não autenticado." };

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!perfil || !isAdmin(perfil.role))
    return { ok: false, erro: "Apenas administradores podem marcar como pago." };

  const { error } = await supabase
    .from("encontristas")
    .update({ status: "pago" })
    .eq("id", id);

  if (error) return { ok: false, erro: error.message };
  return { ok: true };
}

// Reverte um "pago" para "pendente" — SÓ admin. Para corrigir marcações
// erradas (ex.: registro trocado) sem precisar ir no SQL do banco.
export async function reverterPago(id: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Não autenticado." };

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!perfil || !isAdmin(perfil.role))
    return { ok: false, erro: "Apenas administradores podem reverter o pagamento." };

  const { error } = await supabase
    .from("encontristas")
    .update({ status: "pendente" })
    .eq("id", id);

  if (error) return { ok: false, erro: error.message };
  return { ok: true };
}

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

export async function salvarAcordo(id: string, valor: number | null) {
  const supabase = await createClient();
  await supabase
    .from("encontristas")
    .update({ acordo_valor: valor })
    .eq("id", id);
}