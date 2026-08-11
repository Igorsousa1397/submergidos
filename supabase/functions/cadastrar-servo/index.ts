// supabase/functions/cadastrar-servo/index.ts
// Cria a conta de um servo. Roda no Supabase, que já tem a service_role no
// ambiente — assim o app na Vercel não precisa da chave configurada lá.
//
// Dois modos:
//   público  (sem Authorization de admin): auto-cadastro. role=servo,
//            aprovado=false (o admin libera depois), senha vinda do form.
//   admin    (Authorization: Bearer <jwt de admin>): cadastro pela tela de
//            Servos. role escolhido, aprovado=true, senha temporária gerada
//            e devolvida para o admin repassar.
//
// Deploy: supabase functions deploy cadastrar-servo --no-verify-jwt

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

const ROLES_CADASTRO = ["pastor", "pastor_auxiliar", "cozinha", "staff", "servo"];
const ALFABETO = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";

function senhaTemporaria(tamanho = 10) {
  const bytes = new Uint32Array(tamanho);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ erro: "Method Not Allowed" }, 405);

  const body = await req.json().catch(() => ({}));
  const nome = String(body.nome ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const cpf = String(body.cpf ?? "").replace(/\D/g, "");
  const nascimento = String(body.nascimento ?? "");
  const sexo = String(body.sexo ?? "");

  // ---- validações (o servidor é a fonte da verdade) ----
  if (!nome || nome.split(/\s+/).length < 2)
    return json({ erro: "Informe seu nome completo." }, 400);
  if (!email.includes("@")) return json({ erro: "E-mail inválido." }, 400);
  if (cpf.length !== 11)
    return json({ erro: "CPF inválido — precisa ter 11 dígitos." }, 400);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nascimento))
    return json({ erro: "Informe a data de nascimento." }, 400);
  if (sexo !== "masculino" && sexo !== "feminino")
    return json({ erro: "Selecione o sexo." }, 400);

  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // ---- quem está chamando? admin autenticado ou cadastro público ----
  let ehAdmin = false;
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  if (token && token !== anonKey) {
    const { data: auth } = await createClient(url, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    }).auth.getUser();
    if (auth?.user) {
      const { data: perfil } = await admin
        .from("profiles")
        .select("role")
        .eq("id", auth.user.id)
        .single();
      ehAdmin = perfil?.role === "admin" || perfil?.role === "lider_geral";
    }
  }

  const role = ehAdmin && ROLES_CADASTRO.includes(String(body.role)) ? String(body.role) : "servo";
  const senha = ehAdmin ? senhaTemporaria() : String(body.senha ?? "");
  if (!ehAdmin && senha.length < 6)
    return json({ erro: "A senha precisa ter ao menos 6 caracteres." }, 400);

  const { data: criado, error: erroAuth } = await admin.auth.admin.createUser({
    email,
    password: senha,
    email_confirm: true, // sem e-mail de confirmação: o acesso é liberado pelo admin
    user_metadata: { nome },
  });

  if (erroAuth) {
    const msg = erroAuth.message.includes("already")
      ? "Já existe uma conta com este e-mail."
      : "Não foi possível concluir o cadastro. Tente novamente.";
    return json({ erro: msg }, 400);
  }

  // o trigger handle_new_user já criou o profile — completa os dados
  const { error: erroPerfil } = await admin
    .from("profiles")
    .update({
      nome,
      cpf,
      nascimento,
      sexo,
      role,
      primeiro: false, // a senha já é do próprio servo (ou temporária, repassada)
      aprovado: ehAdmin, // auto-cadastro espera aprovação
    })
    .eq("id", criado.user.id);

  if (erroPerfil) return json({ erro: "Cadastro criado, mas houve erro ao salvar os dados." }, 500);

  return json({ ok: true, senhaTemporaria: ehAdmin ? senha : undefined });
});
