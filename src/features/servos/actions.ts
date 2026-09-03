"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/permissions";

// Perfis que podem ser escolhidos AO CRIAR um servo (regra do original:
// perfis de líder só são atribuídos depois, no Back Office).
const ROLES_CADASTRO = ["pastor", "pastor_auxiliar", "cozinha", "staff", "servo"];

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
  if (!perfil || !isAdmin(perfil.role)) return "Apenas administradores podem gerenciar servos.";
  return null;
}

function revalidar() {
  revalidatePath("/servos");
  revalidatePath("/dashboard");
}

export async function alternarAtivo(id: string, ativo: boolean) {
  const supabase = await createClient();
  const erroAdmin = await exigirAdmin(supabase);
  if (erroAdmin) return { ok: false, erro: erroAdmin };

  const { error } = await supabase.from("profiles").update({ ativo }).eq("id", id);
  if (error) return { ok: false, erro: error.message };
  revalidar();
  return { ok: true };
}

// Abona (isenta) o servo ou desfaz o abono.
export async function abonarServo(id: string, abonar: boolean) {
  const supabase = await createClient();
  const erroAdmin = await exigirAdmin(supabase);
  if (erroAdmin) return { ok: false, erro: erroAdmin };

  const { error } = await supabase
    .from("profiles")
    .update({ pagamento: abonar ? "abonado" : "pendente" })
    .eq("id", id);
  if (error) return { ok: false, erro: error.message };
  revalidar();
  return { ok: true };
}

// "Pagar depois" com data combinada e observação (os dois opcionais no original,
// mas a data é o que dá sentido ao status — exigimos ela).
export async function salvarServoPagarDepois(id: string, data: string, obs: string) {
  const supabase = await createClient();
  const erroAdmin = await exigirAdmin(supabase);
  if (erroAdmin) return { ok: false, erro: erroAdmin };
  if (!data) return { ok: false, erro: "Informe a data combinada." };

  const { error } = await supabase
    .from("profiles")
    .update({
      pagamento: "pagar_depois",
      pagar_depois_data: data,
      pagar_depois_obs: obs.trim() || null,
    })
    .eq("id", id);
  if (error) return { ok: false, erro: error.message };
  revalidar();
  return { ok: true };
}

export async function removerServoPagarDepois(id: string) {
  const supabase = await createClient();
  const erroAdmin = await exigirAdmin(supabase);
  if (erroAdmin) return { ok: false, erro: erroAdmin };

  const { error } = await supabase
    .from("profiles")
    .update({ pagamento: "pendente", pagar_depois_data: null, pagar_depois_obs: null })
    .eq("id", id);
  if (error) return { ok: false, erro: error.message };
  revalidar();
  return { ok: true };
}

// Baixa MANUAL do pagamento (PIX direto com a liderança, dinheiro, etc.).
// O servo também pode pagar pelo gateway — nesse caso quem marca é o
// webhook-pagamento. `pagamento_via` separa os dois casos: sem ele não dá
// para saber se um "pago" veio do Mercado Pago ou de um clique aqui.
export async function marcarServoPago(id: string) {
  const supabase = await createClient();
  const erroAdmin = await exigirAdmin(supabase);
  if (erroAdmin) return { ok: false, erro: erroAdmin };

  const { error } = await supabase
    .from("profiles")
    .update({
      pagamento: "pago",
      pago_em: new Date().toISOString(),
      pagamento_via: "manual",
      pagamento_id: null,
    })
    .eq("id", id);
  if (error) return { ok: false, erro: error.message };
  revalidar();
  return { ok: true };
}

export async function reverterServoPago(id: string) {
  const supabase = await createClient();
  const erroAdmin = await exigirAdmin(supabase);
  if (erroAdmin) return { ok: false, erro: erroAdmin };

  const { error } = await supabase
    .from("profiles")
    .update({ pagamento: "pendente", pago_em: null, pagamento_id: null, pagamento_via: null })
    .eq("id", id);
  if (error) return { ok: false, erro: error.message };
  revalidar();
  return { ok: true };
}

// Data limite do pagamento do servo (app_config key='servos').
export async function salvarDataLimitePagamento(data: string | null) {
  const supabase = await createClient();
  const erroAdmin = await exigirAdmin(supabase);
  if (erroAdmin) return { ok: false, erro: erroAdmin };

  const { error } = await supabase
    .from("app_config")
    .upsert({ key: "servos", value: { data_limite_pagamento: data } });
  if (error) return { ok: false, erro: error.message };
  revalidar();
  return { ok: true };
}

// ============ Aprovação do auto-cadastro ============

export async function aprovarServo(id: string) {
  const supabase = await createClient();
  const erroAdmin = await exigirAdmin(supabase);
  if (erroAdmin) return { ok: false, erro: erroAdmin };

  const { error } = await supabase.from("profiles").update({ aprovado: true }).eq("id", id);
  if (error) return { ok: false, erro: error.message };
  revalidar();
  return { ok: true };
}

// Recusa o auto-cadastro: apaga a conta inteira (auth.user + profile via cascade).
// Precisa da service role — deletar usuário é operação administrativa do Auth.
export async function recusarServo(id: string) {
  const supabase = await createClient();
  const erroAdmin = await exigirAdmin(supabase);
  if (erroAdmin) return { ok: false, erro: erroAdmin };

  // deletar usuário é operação administrativa do Auth: roda na Edge Function
  // `remover-servo` (que tem a service_role e revalida admin + não-aprovado).
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon || !session)
    return { ok: false, erro: "Sessão expirada. Entre novamente." };

  try {
    const res = await fetch(`${url}/functions/v1/remover-servo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anon,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ servoId: id }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, erro: data.erro ?? "Não foi possível remover." };
    revalidar();
    return { ok: true };
  } catch {
    return { ok: false, erro: "Não foi possível remover. Tente novamente." };
  }
}

// ============ Criar servo (conta de login + profile) ============
//
// Cria o auth.user via service role (o trigger handle_new_user cria o profile)
// e completa cpf/nascimento/sexo/role. Diferença do original: em vez de e-mail
// "crie sua senha" (que depende de SMTP), geramos uma senha temporária que o
// admin repassa ao servo; o primeiro login exige troca (profiles.primeiro).

export interface NovoServoInput {
  nome: string;
  email: string;
  cpf: string; // pode vir com máscara
  nascimento: string; // YYYY-MM-DD
  sexo: "masculino" | "feminino" | "";
  role: string;
}

export async function criarServo(input: NovoServoInput) {
  const supabase = await createClient();
  const erroAdmin = await exigirAdmin(supabase);
  if (erroAdmin) return { ok: false as const, erro: erroAdmin };

  const nome = input.nome.trim();
  const cpf = (input.cpf || "").replace(/\D/g, "");

  if (!nome) return { ok: false as const, erro: "Informe o nome completo." };
  if (!input.email.includes("@")) return { ok: false as const, erro: "E-mail inválido." };
  if (cpf.length !== 11)
    return { ok: false as const, erro: "CPF inválido — precisa ter 11 dígitos." };
  if (!input.nascimento) return { ok: false as const, erro: "Informe a data de nascimento." };
  if (input.sexo !== "masculino" && input.sexo !== "feminino")
    return { ok: false as const, erro: "Selecione o sexo." };
  if (!ROLES_CADASTRO.includes(input.role))
    return { ok: false as const, erro: "Perfil inválido para cadastro." };

  // A conta é criada na Edge Function `cadastrar-servo` (roda no Supabase,
  // que já tem a service_role) — o app não precisa da chave configurada.
  // O JWT do admin vai junto: é ele que libera role escolhido + aprovado.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon || !session)
    return { ok: false as const, erro: "Sessão expirada. Entre novamente." };

  try {
    const res = await fetch(`${url}/functions/v1/cadastrar-servo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anon,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        nome,
        email: input.email,
        cpf,
        nascimento: input.nascimento,
        sexo: input.sexo,
        role: input.role,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.senhaTemporaria)
      return { ok: false as const, erro: data.erro ?? "Não foi possível criar o servo." };

    revalidar();
    return { ok: true as const, senhaTemporaria: data.senhaTemporaria as string };
  } catch {
    return { ok: false as const, erro: "Não foi possível criar o servo. Tente novamente." };
  }
}
