"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { podeVerTela } from "@/lib/permissions";

// Gate: gestão ou tela 'saude' concedida (o RLS pode_saude() reforça no banco).
async function exigirSaude(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { user: null, erro: "Não autenticado." };

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role, telas_extra, roles(telas)")
    .eq("id", user.id)
    .single();
  const telasRole =
    (perfil?.roles as unknown as { telas: string[] } | null)?.telas ?? [];
  if (!podeVerTela("saude", perfil?.role ?? "servo", telasRole, perfil?.telas_extra ?? []))
    return { user: null, erro: "Sem acesso ao módulo de saúde." };
  return { user, erro: null };
}

function revalidar() {
  revalidatePath("/saude");
}

export async function criarRegistroSaude(
  nome: string,
  quarto: string,
  condicao: string,
  obs: string,
) {
  const supabase = await createClient();
  const { user, erro } = await exigirSaude(supabase);
  if (erro || !user) return { ok: false, erro: erro ?? "Não autorizado." };

  if (!nome.trim()) return { ok: false, erro: "Informe o nome." };
  if (!condicao.trim()) return { ok: false, erro: "Informe a condição." };

  const { error } = await supabase.from("saude_registros").insert({
    nome: nome.trim(),
    quarto: quarto.trim() || null,
    condicao: condicao.trim(),
    obs: obs.trim() || null,
    criado_por: user.id,
  });
  if (error) return { ok: false, erro: error.message };
  revalidar();
  return { ok: true };
}

export async function removerRegistroSaude(id: string) {
  const supabase = await createClient();
  const { erro } = await exigirSaude(supabase);
  if (erro) return { ok: false, erro };

  const { error } = await supabase.from("saude_registros").delete().eq("id", id);
  if (error) return { ok: false, erro: error.message };
  revalidar();
  return { ok: true };
}
