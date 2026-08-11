"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { podeGerenciarQuartos } from "@/lib/permissions";

export interface QuartoInput {
  numero: string;
  genero: "masculino" | "feminino";
  is_maes: boolean;
  limite_encontristas: number;
  limite_servos: number;
}

// Gate no servidor (defesa em profundidade; o RLS quartos_admin já restringe).
async function exigirGestor(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return "Não autenticado.";
  const { data: perfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!perfil || !podeGerenciarQuartos(perfil.role))
    return "Apenas administradores e o líder de quartos podem editar.";
  return null;
}

function validar(input: QuartoInput) {
  if (!input.numero.trim()) return "Informe o número do quarto.";
  if (input.genero !== "masculino" && input.genero !== "feminino") return "Selecione o gênero.";
  if (input.limite_encontristas < 0 || input.limite_servos < 0) return "Limites inválidos.";
  // Quarto Mães é um conceito feminino (mães acompanhando encontristas)
  if (input.is_maes && input.genero !== "feminino")
    return "O Quarto Mães é da ala feminina.";
  return null;
}

function revalidar() {
  revalidatePath("/quartos");
  revalidatePath("/dashboard");
}

export async function criarQuarto(input: QuartoInput) {
  const supabase = await createClient();
  const erroGestor = await exigirGestor(supabase);
  if (erroGestor) return { ok: false, erro: erroGestor };
  const erroVal = validar(input);
  if (erroVal) return { ok: false, erro: erroVal };

  // evita número duplicado dentro do mesmo gênero (o original não validava)
  const { count } = await supabase
    .from("quartos")
    .select("id", { count: "exact", head: true })
    .eq("genero", input.genero)
    .eq("numero", input.numero.trim());
  if ((count ?? 0) > 0) return { ok: false, erro: "Já existe um quarto com este número." };

  const { error } = await supabase.from("quartos").insert({
    numero: input.numero.trim(),
    genero: input.genero,
    is_maes: input.is_maes,
    limite_encontristas: input.limite_encontristas,
    limite_servos: input.limite_servos,
  });
  if (error) return { ok: false, erro: error.message };
  revalidar();
  return { ok: true };
}

export async function atualizarQuarto(id: string, input: QuartoInput) {
  const supabase = await createClient();
  const erroGestor = await exigirGestor(supabase);
  if (erroGestor) return { ok: false, erro: erroGestor };
  const erroVal = validar(input);
  if (erroVal) return { ok: false, erro: erroVal };

  const { error } = await supabase
    .from("quartos")
    .update({
      numero: input.numero.trim(),
      is_maes: input.is_maes,
      limite_encontristas: input.limite_encontristas,
      limite_servos: input.limite_servos,
    })
    .eq("id", id);
  if (error) return { ok: false, erro: error.message };
  revalidar();
  return { ok: true };
}

export async function removerQuarto(id: string) {
  const supabase = await createClient();
  const erroGestor = await exigirGestor(supabase);
  if (erroGestor) return { ok: false, erro: erroGestor };

  // as junções têm ON DELETE CASCADE — remover o quarto libera os ocupantes
  const { error } = await supabase.from("quartos").delete().eq("id", id);
  if (error) return { ok: false, erro: error.message };
  revalidar();
  return { ok: true };
}

// ============ Ocupantes ============

export async function adicionarServoQuarto(quartoId: string, servoId: string) {
  const supabase = await createClient();
  const erroGestor = await exigirGestor(supabase);
  if (erroGestor) return { ok: false, erro: erroGestor };

  const { error } = await supabase
    .from("quarto_servos")
    .insert({ quarto_id: quartoId, servo_id: servoId });
  if (error) {
    if (error.code === "23505") return { ok: false, erro: "Este servo já está neste quarto." };
    return { ok: false, erro: error.message };
  }
  revalidar();
  return { ok: true };
}

export async function removerServoQuarto(quartoId: string, servoId: string) {
  const supabase = await createClient();
  const erroGestor = await exigirGestor(supabase);
  if (erroGestor) return { ok: false, erro: erroGestor };

  const { error } = await supabase
    .from("quarto_servos")
    .delete()
    .eq("quarto_id", quartoId)
    .eq("servo_id", servoId);
  if (error) return { ok: false, erro: error.message };
  revalidar();
  return { ok: true };
}

export async function adicionarEncQuarto(quartoId: string, encontristaId: string) {
  const supabase = await createClient();
  const erroGestor = await exigirGestor(supabase);
  if (erroGestor) return { ok: false, erro: erroGestor };

  const { error } = await supabase
    .from("quarto_encontristas")
    .insert({ quarto_id: quartoId, encontrista_id: encontristaId });
  if (error) {
    if (error.code === "23505")
      return { ok: false, erro: "Este encontrista já está neste quarto." };
    return { ok: false, erro: error.message };
  }
  revalidar();
  return { ok: true };
}

export async function removerEncQuarto(quartoId: string, encontristaId: string) {
  const supabase = await createClient();
  const erroGestor = await exigirGestor(supabase);
  if (erroGestor) return { ok: false, erro: erroGestor };

  const { error } = await supabase
    .from("quarto_encontristas")
    .delete()
    .eq("quarto_id", quartoId)
    .eq("encontrista_id", encontristaId);
  if (error) return { ok: false, erro: error.message };
  revalidar();
  return { ok: true };
}
