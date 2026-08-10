"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/permissions";

type OnibusTipo = "feminino" | "masculino" | "servos";
type OnibusPapel = "responsavel" | "servo_templo";

const TIPOS: OnibusTipo[] = ["feminino", "masculino", "servos"];
// máximo de membros por papel na equipe do ônibus (0/2 na tela de referência)
const MAX_POR_PAPEL = 2;

export interface OnibusInput {
  identificacao: string;
  tipo: OnibusTipo;
  capacidade: number | null;
}

// Garante que o chamador é admin (defesa em profundidade; o RLS onibus_admin
// já restringe, mas aqui devolvemos mensagem amigável).
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
  if (!perfil || !isAdmin(perfil.role)) return "Apenas administradores podem gerenciar ônibus.";
  return null;
}

function revalidar() {
  revalidatePath("/onibus");
  revalidatePath("/check-in");
}

export async function criarOnibus(input: OnibusInput) {
  const supabase = await createClient();
  const erroAdmin = await exigirAdmin(supabase);
  if (erroAdmin) return { ok: false as const, erro: erroAdmin };

  const identificacao = input.identificacao.trim();
  if (!identificacao) return { ok: false as const, erro: "Informe o número do ônibus." };
  if (!TIPOS.includes(input.tipo))
    return { ok: false as const, erro: "Selecione o tipo do ônibus." };

  const { data, error } = await supabase
    .from("onibus")
    .insert({ identificacao, tipo: input.tipo, capacidade: input.capacidade })
    .select("id")
    .single();

  if (error) return { ok: false as const, erro: error.message };
  revalidar();
  return { ok: true as const, id: data.id };
}

export async function atualizarOnibus(id: string, input: OnibusInput) {
  const supabase = await createClient();
  const erroAdmin = await exigirAdmin(supabase);
  if (erroAdmin) return { ok: false, erro: erroAdmin };

  const identificacao = input.identificacao.trim();
  if (!identificacao) return { ok: false, erro: "Informe o número do ônibus." };
  if (!TIPOS.includes(input.tipo)) return { ok: false, erro: "Selecione o tipo do ônibus." };

  const { error } = await supabase
    .from("onibus")
    .update({ identificacao, tipo: input.tipo, capacidade: input.capacidade })
    .eq("id", id);

  if (error) return { ok: false, erro: error.message };
  revalidar();
  return { ok: true };
}

// Define de quem são as malas que este ônibus carrega (null = limpar).
export async function definirMalas(id: string, malas: OnibusTipo | null) {
  const supabase = await createClient();
  const erroAdmin = await exigirAdmin(supabase);
  if (erroAdmin) return { ok: false, erro: erroAdmin };

  if (malas !== null && !TIPOS.includes(malas))
    return { ok: false, erro: "Tipo de mala inválido." };

  const { error } = await supabase.from("onibus").update({ malas }).eq("id", id);
  if (error) return { ok: false, erro: error.message };
  revalidar();
  return { ok: true };
}

export async function removerOnibus(id: string) {
  const supabase = await createClient();
  const erroAdmin = await exigirAdmin(supabase);
  if (erroAdmin) return { ok: false, erro: erroAdmin };

  // não deixa remover ônibus com encontristas atribuídos (perderia alocação)
  const { count } = await supabase
    .from("encontristas")
    .select("id", { count: "exact", head: true })
    .eq("onibus_id", id);

  if ((count ?? 0) > 0)
    return {
      ok: false,
      erro: "Este ônibus tem passageiros atribuídos. Esvazie-o no check-in antes de remover.",
    };

  const { error } = await supabase.from("onibus").delete().eq("id", id);
  if (error) return { ok: false, erro: error.message };
  revalidar();
  return { ok: true };
}

// ============ Equipe (responsáveis / servos do templo) ============

export async function adicionarEquipe(onibusId: string, servoId: string, papel: OnibusPapel) {
  const supabase = await createClient();
  const erroAdmin = await exigirAdmin(supabase);
  if (erroAdmin) return { ok: false, erro: erroAdmin };

  // limite de 2 por papel (regra da tela: RESPONSÁVEIS (0/2), SERVOS DO TEMPLO (0/2))
  const { count } = await supabase
    .from("onibus_equipe")
    .select("servo_id", { count: "exact", head: true })
    .eq("onibus_id", onibusId)
    .eq("papel", papel);

  if ((count ?? 0) >= MAX_POR_PAPEL)
    return {
      ok: false,
      erro: papel === "responsavel" ? "Máximo de 2 responsáveis." : "Máximo de 2 servos do templo.",
    };

  const { error } = await supabase
    .from("onibus_equipe")
    .insert({ onibus_id: onibusId, servo_id: servoId, papel });

  if (error) {
    if (error.code === "23505")
      return { ok: false, erro: "Este servo já está nesse papel neste ônibus." };
    return { ok: false, erro: error.message };
  }
  revalidar();
  return { ok: true };
}

export async function removerEquipe(onibusId: string, servoId: string, papel: OnibusPapel) {
  const supabase = await createClient();
  const erroAdmin = await exigirAdmin(supabase);
  if (erroAdmin) return { ok: false, erro: erroAdmin };

  const { error } = await supabase
    .from("onibus_equipe")
    .delete()
    .eq("onibus_id", onibusId)
    .eq("servo_id", servoId)
    .eq("papel", papel);

  if (error) return { ok: false, erro: error.message };
  revalidar();
  return { ok: true };
}
