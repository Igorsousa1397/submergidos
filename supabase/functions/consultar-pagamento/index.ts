// supabase/functions/consultar-pagamento/index.ts
// Consulta pagamentos no Mercado Pago pelo id e devolve só os campos de
// diagnóstico (status, datas, external_reference, e-mail do pagador).
//
// Existe porque o MP_ACCESS_TOKEN vive só nos secrets do Supabase (não dá
// para lê-lo de volta) — então a consulta roda AQUI, onde o token já está,
// em vez de o token circular pelo terminal de alguém.
//
// Acesso: exige a SERVICE_ROLE no Authorization. Uso interno da liderança
// (terminal / futura tela de admin); nunca chamar do browser.
//
// Deploy:  supabase functions deploy consultar-pagamento --no-verify-jwt
// Uso:     POST { "ids": [176623064500, 176623226506] }

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function json(obj: unknown, status = 200) {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ erro: "Method Not Allowed" }, 405);

  // trava: a chave recebida precisa TER poder de service role — testamos
  // usando-a de verdade (listUsers só passa com service role). Comparar
  // strings com o env falharia entre os formatos de chave (JWT legado x
  // sb_secret_*), e este teste vale para qualquer um dos dois.
  const bearer = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!bearer) return json({ erro: "Não autorizado." }, 401);

  const probe = createClient(Deno.env.get("SUPABASE_URL")!, bearer, {
    auth: { persistSession: false },
  });
  const { error: erroProbe } = await probe.auth.admin.listUsers({ perPage: 1 });
  if (erroProbe) return json({ erro: "Não autorizado.", detalhe: erroProbe.message }, 401);

  const { ids } = await req.json().catch(() => ({}));
  if (!Array.isArray(ids) || ids.length === 0 || ids.length > 20)
    return json({ erro: "ids obrigatório (lista de até 20 ids do MP)" }, 400);

  const MP = Deno.env.get("MP_ACCESS_TOKEN");
  if (!MP) return json({ erro: "MP_ACCESS_TOKEN não configurado" }, 500);

  const pagamentos = [];
  for (const id of ids) {
    const p = await fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
      headers: { Authorization: `Bearer ${MP}` },
    }).then((r) => r.json());

    pagamentos.push({
      id: p.id ?? id,
      status: p.status,
      status_detail: p.status_detail,
      date_created: p.date_created,
      date_approved: p.date_approved,
      external_reference: p.external_reference,
      description: p.description,
      transaction_amount: p.transaction_amount,
      payment_method: p.payment_method_id,
      payer_email: p.payer?.email ?? null,
      erro: p.error ?? p.message ?? null,
    });
  }

  return json({ pagamentos });
});
