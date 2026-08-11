// supabase/functions/remover-servo/index.ts
// Remove a conta de um servo que ainda NÃO foi aprovado (recusa do
// auto-cadastro). Roda no Supabase, que já tem a service_role — deletar
// usuário é operação administrativa do Auth, indisponível pelo RLS.
//
// Deploy: supabase functions deploy remover-servo --no-verify-jwt

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

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ erro: "Method Not Allowed" }, 405);

  const { servoId } = await req.json().catch(() => ({}));
  if (!servoId) return json({ erro: "servoId obrigatório" }, 400);

  const url = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // exige admin autenticado
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token || token === anonKey) return json({ erro: "Não autorizado." }, 401);
  const { data: auth } = await createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  }).auth.getUser();
  if (!auth?.user) return json({ erro: "Não autorizado." }, 401);

  const { data: quemChama } = await admin
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .single();
  if (quemChama?.role !== "admin" && quemChama?.role !== "lider_geral")
    return json({ erro: "Apenas administradores podem remover." }, 403);

  // trava: só remove quem ainda não foi aprovado
  const { data: alvo } = await admin
    .from("profiles")
    .select("aprovado")
    .eq("id", servoId)
    .single();
  if (!alvo) return json({ erro: "Cadastro não encontrado." }, 404);
  if (alvo.aprovado)
    return json({ erro: "Este servo já foi aprovado — desative-o em vez de remover." }, 400);

  const { error } = await admin.auth.admin.deleteUser(servoId);
  if (error) return json({ erro: error.message }, 500);
  return json({ ok: true });
});
