"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/permissions";
import { DIAS_ESCALA, TELAS } from "./shared";

// Back Office é exclusivo de admin/líder geral (como no original).
async function exigirAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Não autenticado.";
  const { data: perfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!perfil || !isAdmin(perfil.role))
    return "Apenas administradores acessam o Back Office.";
  return null;
}

function revalidar() {
  revalidatePath("/back-office");
  revalidatePath("/dashboard"); // home do servo mostra escalas
  revalidatePath("/servos");
}

// ============ Perfil do usuário ============

export async function mudarPerfil(userId: string, roleSlug: string) {
  const supabase = await createClient();
  const erroAdmin = await exigirAdmin(supabase);
  if (erroAdmin) return { ok: false, erro: erroAdmin };
  if (roleSlug === "admin") return { ok: false, erro: "Não é possível promover a admin por aqui." };

  const { data: role } = await supabase.from("roles").select("slug").eq("slug", roleSlug).single();
  if (!role) return { ok: false, erro: "Perfil inexistente." };

  const { error } = await supabase.from("profiles").update({ role: roleSlug }).eq("id", userId);
  if (error) return { ok: false, erro: error.message };
  revalidar();
  return { ok: true };
}

export async function definirLiderCelula(userId: string, valor: boolean) {
  const supabase = await createClient();
  const erroAdmin = await exigirAdmin(supabase);
  if (erroAdmin) return { ok: false, erro: erroAdmin };

  const patch: { lider_celula: boolean; celula?: null } = { lider_celula: valor };
  if (!valor) patch.celula = null; // desmarcar limpa a célula (regra do original)

  const { error } = await supabase.from("profiles").update(patch).eq("id", userId);
  if (error) return { ok: false, erro: error.message };
  revalidar();
  return { ok: true };
}

export async function definirCelula(userId: string, celula: string) {
  const supabase = await createClient();
  const erroAdmin = await exigirAdmin(supabase);
  if (erroAdmin) return { ok: false, erro: erroAdmin };

  const { error } = await supabase
    .from("profiles")
    .update({ celula: celula || null })
    .eq("id", userId);
  if (error) return { ok: false, erro: error.message };
  revalidar();
  return { ok: true };
}

// ============ Escalas ============

export async function adicionarEscala(
  servoId: string,
  funcaoId: string,
  dia: string,
  periodo: string | null,
) {
  const supabase = await createClient();
  const erroAdmin = await exigirAdmin(supabase);
  if (erroAdmin) return { ok: false as const, erro: erroAdmin };
  if (!DIAS_ESCALA.includes(dia as (typeof DIAS_ESCALA)[number]))
    return { ok: false as const, erro: "Dia inválido." };

  // devolve o id para a UI atualizar sem recarregar a página
  const { data, error } = await supabase
    .from("escalas")
    .insert({ servo_id: servoId, funcao_id: funcaoId, dia, periodo })
    .select("id")
    .single();

  if (error) {
    // trigger do banco: Servo de Quarto × Templo/Som/Cozinha
    if (error.message.includes("Conflito"))
      return { ok: false as const, erro: error.message.replace(/^.*Conflito:/, "Conflito:") };
    if (error.code === "23505")
      return { ok: false as const, erro: "Este servo já está nessa função nesse dia." };
    return { ok: false as const, erro: error.message };
  }
  revalidar();
  return { ok: true as const, id: data.id };
}

export async function removerEscala(escalaId: string) {
  const supabase = await createClient();
  const erroAdmin = await exigirAdmin(supabase);
  if (erroAdmin) return { ok: false, erro: erroAdmin };

  const { error } = await supabase.from("escalas").delete().eq("id", escalaId);
  if (error) return { ok: false, erro: error.message };
  revalidar();
  return { ok: true };
}

// ============ Funções ============

export async function criarFuncao(nome: string, temPeriodo: boolean) {
  const supabase = await createClient();
  const erroAdmin = await exigirAdmin(supabase);
  if (erroAdmin) return { ok: false, erro: erroAdmin };

  const limpo = nome.trim();
  if (!limpo) return { ok: false, erro: "Informe o nome da função." };

  const { data: existente } = await supabase
    .from("funcoes")
    .select("id")
    .ilike("nome", limpo)
    .maybeSingle();
  if (existente) return { ok: false, erro: "Essa função já existe." };

  const { error } = await supabase
    .from("funcoes")
    .insert({ nome: limpo, periodo: temPeriodo ? "almoco_jantar" : null, is_sistema: false });
  if (error) return { ok: false, erro: error.message };
  revalidar();
  return { ok: true };
}

export async function removerFuncao(id: string) {
  const supabase = await createClient();
  const erroAdmin = await exigirAdmin(supabase);
  if (erroAdmin) return { ok: false, erro: erroAdmin };

  const { data: fn } = await supabase
    .from("funcoes")
    .select("is_sistema")
    .eq("id", id)
    .single();
  if (!fn) return { ok: false, erro: "Função não encontrada." };
  // No original, "excluir" função nativa não persistia (voltava no reload).
  // Aqui é explícito: funções base não podem ser removidas.
  if (fn.is_sistema)
    return { ok: false, erro: "Funções base do encontro não podem ser removidas." };

  const { count } = await supabase
    .from("escalas")
    .select("id", { count: "exact", head: true })
    .eq("funcao_id", id);
  if ((count ?? 0) > 0)
    return { ok: false, erro: "Há servos escalados nesta função — remova as escalas antes." };

  const { error } = await supabase.from("funcoes").delete().eq("id", id);
  if (error) return { ok: false, erro: error.message };
  revalidar();
  return { ok: true };
}

// Líderes responsáveis por uma função (app_config key='lider_map').
export async function salvarLideresFuncao(funcaoNome: string, slugs: string[]) {
  const supabase = await createClient();
  const erroAdmin = await exigirAdmin(supabase);
  if (erroAdmin) return { ok: false, erro: erroAdmin };

  // nunca deixa uma função sem responsável (regra do original)
  const final = slugs.length > 0 ? slugs : ["lider_staff"];

  const { data: atual } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", "lider_map")
    .maybeSingle();
  const mapa = (atual?.value as Record<string, string[]> | null) ?? {};
  mapa[funcaoNome] = final;

  const { error } = await supabase.from("app_config").upsert({ key: "lider_map", value: mapa });
  if (error) return { ok: false, erro: error.message };
  revalidar();
  return { ok: true };
}

// ============ Perfis (roles) ============

const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

export async function criarPerfil(nome: string, cor: string) {
  const supabase = await createClient();
  const erroAdmin = await exigirAdmin(supabase);
  if (erroAdmin) return { ok: false, erro: erroAdmin };

  const limpo = nome.trim();
  const slug = slugify(limpo);
  if (!limpo || !slug) return { ok: false, erro: "Nome inválido." };

  const { data: existente } = await supabase
    .from("roles")
    .select("slug")
    .eq("slug", slug)
    .maybeSingle();
  if (existente) return { ok: false, erro: "Já existe um perfil com esse nome." };

  const { error } = await supabase
    .from("roles")
    .insert({ slug, nome: limpo, cor, is_sistema: false, ordem: 90 });
  if (error) return { ok: false, erro: error.message };
  revalidar();
  return { ok: true };
}

export async function alternarTelaPerfil(slug: string, tela: string) {
  const supabase = await createClient();
  const erroAdmin = await exigirAdmin(supabase);
  if (erroAdmin) return { ok: false, erro: erroAdmin };
  if (!TELAS.some((t) => t.id === tela)) return { ok: false, erro: "Tela inválida." };
  if (slug === "admin") return { ok: false, erro: "Admin já vê tudo." };

  const { data: role } = await supabase.from("roles").select("telas").eq("slug", slug).single();
  if (!role) return { ok: false, erro: "Perfil não encontrado." };

  const telas = role.telas.includes(tela)
    ? role.telas.filter((t) => t !== tela)
    : [...role.telas, tela];

  const { error } = await supabase.from("roles").update({ telas }).eq("slug", slug);
  if (error) return { ok: false, erro: error.message };
  revalidar();
  return { ok: true };
}

export async function alternarTelaExtra(userId: string, tela: string) {
  const supabase = await createClient();
  const erroAdmin = await exigirAdmin(supabase);
  if (erroAdmin) return { ok: false, erro: erroAdmin };
  if (!TELAS.some((t) => t.id === tela)) return { ok: false, erro: "Tela inválida." };

  const { data: perfil } = await supabase
    .from("profiles")
    .select("telas_extra")
    .eq("id", userId)
    .single();
  if (!perfil) return { ok: false, erro: "Usuário não encontrado." };

  const telas = perfil.telas_extra.includes(tela)
    ? perfil.telas_extra.filter((t) => t !== tela)
    : [...perfil.telas_extra, tela];

  const { error } = await supabase.from("profiles").update({ telas_extra: telas }).eq("id", userId);
  if (error) return { ok: false, erro: error.message };
  revalidar();
  return { ok: true };
}
