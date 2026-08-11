"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Auto-cadastro público de servo: cria a conta com a senha escolhida pelo
// próprio servo, mas com aprovado=false — ele só acessa o app depois que o
// admin aprovar na tela de Servos. Roda com service role (server-only)
// para não depender da configuração de confirmação de e-mail do Supabase.

export interface CadastroServoInput {
  nome: string;
  email: string;
  cpf: string; // pode vir com máscara
  nascimento: string; // YYYY-MM-DD
  sexo: "masculino" | "feminino" | "";
  senha: string;
}

export async function cadastrarServoPublico(input: CadastroServoInput) {
  const nome = input.nome.trim();
  const email = input.email.trim().toLowerCase();
  const cpf = (input.cpf || "").replace(/\D/g, "");

  if (!nome || nome.split(/\s+/).length < 2)
    return { ok: false, erro: "Informe seu nome completo." };
  if (!email.includes("@")) return { ok: false, erro: "E-mail inválido." };
  if (cpf.length !== 11) return { ok: false, erro: "CPF inválido — precisa ter 11 dígitos." };
  if (!input.nascimento) return { ok: false, erro: "Informe a data de nascimento." };
  if (input.sexo !== "masculino" && input.sexo !== "feminino")
    return { ok: false, erro: "Selecione o sexo." };
  if (input.senha.length < 6)
    return { ok: false, erro: "A senha precisa ter ao menos 6 caracteres." };

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey)
    return { ok: false, erro: "Cadastro indisponível no momento. Fale com o administrador." };

  const admin = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: criado, error: erroAuth } = await admin.auth.admin.createUser({
    email,
    password: input.senha,
    email_confirm: true,
    user_metadata: { nome },
  });

  if (erroAuth) {
    const msg = erroAuth.message.includes("already")
      ? "Já existe uma conta com este e-mail. Tente entrar ou fale com o administrador."
      : "Não foi possível concluir o cadastro. Tente novamente.";
    return { ok: false, erro: msg };
  }

  // completa o profile criado pelo trigger. primeiro=false: a senha já é dele.
  // aprovado fica false (default) — o admin libera na tela de Servos.
  const { error: erroPerfil } = await admin
    .from("profiles")
    .update({
      cpf,
      nascimento: input.nascimento,
      sexo: input.sexo,
      role: "servo",
      primeiro: false,
      aprovado: false,
    })
    .eq("id", criado.user.id);

  if (erroPerfil)
    return { ok: false, erro: "Cadastro criado, mas houve um erro ao salvar os dados. Fale com o administrador." };

  return { ok: true };
}
