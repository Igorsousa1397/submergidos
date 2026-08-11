"use server";

// Auto-cadastro público de servo. A criação da conta acontece na Edge
// Function `cadastrar-servo`, que roda no Supabase e já tem a service_role
// no ambiente — assim o app não depende de configurar a chave na Vercel.

export interface CadastroServoInput {
  nome: string;
  email: string;
  cpf: string; // pode vir com máscara
  nascimento: string; // YYYY-MM-DD
  sexo: "masculino" | "feminino" | "";
  senha: string;
}

export async function cadastrarServoPublico(input: CadastroServoInput) {
  // validações de forma (a Edge Function revalida tudo do lado do servidor)
  const nome = input.nome.trim();
  const cpf = (input.cpf || "").replace(/\D/g, "");
  if (!nome || nome.split(/\s+/).length < 2)
    return { ok: false, erro: "Informe seu nome completo." };
  if (!input.email.includes("@")) return { ok: false, erro: "E-mail inválido." };
  if (cpf.length !== 11)
    return { ok: false, erro: "CPF inválido — precisa ter 11 dígitos." };
  if (!input.nascimento) return { ok: false, erro: "Informe a data de nascimento." };
  if (input.sexo !== "masculino" && input.sexo !== "feminino")
    return { ok: false, erro: "Selecione o sexo." };
  if (input.senha.length < 6)
    return { ok: false, erro: "A senha precisa ter ao menos 6 caracteres." };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon)
    return { ok: false, erro: "Cadastro indisponível no momento. Fale com o administrador." };

  try {
    const res = await fetch(`${url}/functions/v1/cadastrar-servo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: anon,
        Authorization: `Bearer ${anon}`,
      },
      body: JSON.stringify({
        nome,
        email: input.email,
        cpf,
        nascimento: input.nascimento,
        sexo: input.sexo,
        senha: input.senha,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok)
      return { ok: false, erro: data.erro ?? "Não foi possível concluir o cadastro." };
    return { ok: true };
  } catch {
    return { ok: false, erro: "Não foi possível concluir o cadastro. Tente novamente." };
  }
}
