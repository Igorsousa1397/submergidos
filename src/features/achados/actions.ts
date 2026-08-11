"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/permissions";

// Padrão de ocorrências: qualquer servo logado registra o item que achou
// e marca a entrega ao dono; excluir é só admin (RLS espelha as regras).

function revalidar() {
  revalidatePath("/achados");
}

export async function registrarAchado(item: string, local: string, dono: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Não autenticado." };
  if (!item.trim()) return { ok: false, erro: "Informe o item." };

  const { error } = await supabase.from("achados").insert({
    item: item.trim(),
    local: local.trim() || null,
    dono: dono.trim() || null,
    criado_por: user.id,
  });
  if (error) return { ok: false, erro: error.message };
  revalidar();
  return { ok: true };
}

export async function alternarEntregue(id: string, entregue: boolean) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, erro: "Não autenticado." };

  const { error } = await supabase
    .from("achados")
    .update({ entregue, entregue_at: entregue ? new Date().toISOString() : null })
    .eq("id", id);
  if (error) return { ok: false, erro: error.message };
  revalidar();
  return { ok: true };
}

export async function removerAchado(id: string) {
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
    return { ok: false, erro: "Apenas administradores removem itens." };

  const { error } = await supabase.from("achados").delete().eq("id", id);
  if (error) return { ok: false, erro: error.message };
  revalidar();
  return { ok: true };
}
