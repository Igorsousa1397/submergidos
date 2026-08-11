"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/permissions";
import { DIAS_AGENDA } from "./shared";

export interface AgendaInput {
  titulo: string;
  dia: string;
  hora: string; // "HH:MM" (ou "" = sem hora)
  ministrante: string;
  descricao: string;
  aviso: string;
}

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
  if (!perfil || !isAdmin(perfil.role)) return "Apenas administradores podem editar a agenda.";
  return null;
}

function validar(input: AgendaInput) {
  if (!input.titulo.trim()) return "Informe o título da atividade.";
  if (!DIAS_AGENDA.includes(input.dia as (typeof DIAS_AGENDA)[number]))
    return "Selecione o dia.";
  return null;
}

function payload(input: AgendaInput) {
  return {
    titulo: input.titulo.trim(),
    dia: input.dia,
    hora: input.hora || null,
    ministrante: input.ministrante.trim() || null,
    descricao: input.descricao.trim() || null,
    aviso: input.aviso.trim() || null,
  };
}

function revalidar() {
  revalidatePath("/agenda");
  revalidatePath("/dashboard"); // home do servo mostra a agenda
}

export async function criarItemAgenda(input: AgendaInput) {
  const supabase = await createClient();
  const erroAdmin = await exigirAdmin(supabase);
  if (erroAdmin) return { ok: false, erro: erroAdmin };
  const erroVal = validar(input);
  if (erroVal) return { ok: false, erro: erroVal };

  const { error } = await supabase.from("agenda").insert(payload(input));
  if (error) return { ok: false, erro: error.message };
  revalidar();
  return { ok: true };
}

export async function atualizarItemAgenda(id: string, input: AgendaInput) {
  const supabase = await createClient();
  const erroAdmin = await exigirAdmin(supabase);
  if (erroAdmin) return { ok: false, erro: erroAdmin };
  const erroVal = validar(input);
  if (erroVal) return { ok: false, erro: erroVal };

  const { error } = await supabase.from("agenda").update(payload(input)).eq("id", id);
  if (error) return { ok: false, erro: error.message };
  revalidar();
  return { ok: true };
}

export async function removerItemAgenda(id: string) {
  const supabase = await createClient();
  const erroAdmin = await exigirAdmin(supabase);
  if (erroAdmin) return { ok: false, erro: erroAdmin };

  const { error } = await supabase.from("agenda").delete().eq("id", id);
  if (error) return { ok: false, erro: error.message };
  revalidar();
  return { ok: true };
}
