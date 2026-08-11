"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

type AvisoPublico = Database["public"]["Enums"]["aviso_publico"];
const PUBLICOS: AvisoPublico[] = ["todos", "homens", "mulheres"];

// Gate no servidor: roles.pode_avisos (o RLS avisos_insert/avisos_delete
// já garante via pode_avisos(); aqui devolvemos mensagem amigável).
async function exigirPodeAvisos(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, erro: "Não autenticado." };
  const { data: perfil } = await supabase
    .from("profiles")
    .select("roles(pode_avisos)")
    .eq("id", user.id)
    .single();
  const pode =
    (perfil?.roles as unknown as { pode_avisos: boolean } | null)?.pode_avisos ?? false;
  if (!pode) return { user: null, erro: "Seu perfil não pode publicar avisos." };
  return { user, erro: null };
}

function revalidar() {
  revalidatePath("/avisos");
}

export async function criarAviso(texto: string, publico: AvisoPublico) {
  const supabase = await createClient();
  const { user, erro } = await exigirPodeAvisos(supabase);
  if (erro || !user) return { ok: false, erro: erro ?? "Não autorizado." };

  const txt = texto.trim();
  if (!txt) return { ok: false, erro: "Escreva o aviso." };
  if (!PUBLICOS.includes(publico)) return { ok: false, erro: "Público inválido." };

  const { error } = await supabase
    .from("avisos")
    .insert({ texto: txt, publico, autor_id: user.id });
  if (error) return { ok: false, erro: error.message };
  revalidar();
  return { ok: true };
}

export async function removerAviso(id: string) {
  const supabase = await createClient();
  const { erro } = await exigirPodeAvisos(supabase);
  if (erro) return { ok: false, erro };

  const { error } = await supabase.from("avisos").delete().eq("id", id);
  if (error) return { ok: false, erro: error.message };
  revalidar();
  return { ok: true };
}
