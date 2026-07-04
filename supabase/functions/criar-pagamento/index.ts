// supabase/functions/criar-pagamento/index.ts
// Port da Cloud Function `criarPagamento` (Firebase) → Edge Function (Deno).
// Cria uma preferência de checkout no Mercado Pago e devolve o init_point.
//
// Deploy:  supabase functions deploy criar-pagamento --no-verify-jwt
// Secret:  supabase secrets set MP_ACCESS_TOKEN=...   APP_URL=https://seu-app.vercel.app

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
  if (req.method !== "POST")
    return json({ error: "Method Not Allowed" }, 405);

  const { encontristaId, nome, email, tipo, valor } = await req
    .json()
    .catch(() => ({}));

  if (!encontristaId) return json({ error: "encontristaId obrigatório" }, 400);

  // mesma regra do original
  const isCredito = typeof tipo === "string" && tipo.includes("credito");
  const unitPrice = Number(valor) || (isCredito ? 378.0 : 360.0);

  const TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
  const APP_URL = Deno.env.get("APP_URL") ?? "https://submergidos.vercel.app";
  const WEBHOOK = `${Deno.env.get("SUPABASE_URL")}/functions/v1/webhook-pagamento`;

  const body = {
    items: [
      {
        title: "Inscrição — Submergidos",
        quantity: 1,
        unit_price: unitPrice,
        currency_id: "BRL",
      },
    ],
    payer: {
      name: nome || "Encontrista",
      email: email || "inscricao@submergidos.app",
    },
    external_reference: encontristaId,
    back_urls: {
      success: `${APP_URL}/pagamento?pago=true&id=${encontristaId}`,
      failure: `${APP_URL}/pagamento?pago=false&id=${encontristaId}`,
      pending: `${APP_URL}/pagamento?pago=pending&id=${encontristaId}`,
    },
    auto_return: "all",
    payment_methods: {
      excluded_payment_types: isCredito
        ? [{ id: "ticket" }, { id: "digital_currency" }, { id: "digital_wallet" }]
        : [{ id: "credit_card" }, { id: "digital_currency" }, { id: "digital_wallet" }],
      installments: isCredito ? 12 : 1,
    },
    notification_url: WEBHOOK,
  };

  const mpRes = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify(body),
  });

  const data = await mpRes.json();
  if (data.init_point) return json({ init_point: data.init_point, id: data.id });
  return json({ error: "init_point não retornado", details: data }, 500);
});
