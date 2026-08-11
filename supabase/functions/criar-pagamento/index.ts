// supabase/functions/criar-pagamento/index.ts
// Cria uma preferência de checkout no Mercado Pago e devolve o init_point.
//
// Tipos aceitos:
//   pix | credito                          → inscrição de ENCONTRISTA (legado)
//   servo_pix | servo_credito              → inscrição de SERVO
//   uniforme_sinal_pix | uniforme_sinal_credito
//   uniforme_integral_pix | uniforme_integral_credito
//
// external_reference: encontrista = id puro (compat); servo/uniforme = "tipo||id"
// (o webhook-pagamento decide o destino pelo prefixo).
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
  if (req.method !== "POST") return json({ error: "Method Not Allowed" }, 405);

  const { encontristaId, nome, email, tipo, valor } = await req
    .json()
    .catch(() => ({}));
  const refId = encontristaId; // nome do campo mantido por compatibilidade
  if (!refId) return json({ error: "encontristaId obrigatório" }, 400);

  const t = typeof tipo === "string" ? tipo : "pix";
  const isCredito = t.includes("credito");
  const isServo = t.startsWith("servo");
  const isUniforme = t.startsWith("uniforme");

  // encontrista tem fallback de valor (legado); servo/uniforme exigem valor
  const unitPrice = Number(valor) || (isServo || isUniforme ? 0 : isCredito ? 378.0 : 360.0);
  if (unitPrice <= 0) return json({ error: "valor obrigatório" }, 400);

  const TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
  const APP_URL = Deno.env.get("APP_URL") ?? "https://submergidos.vercel.app";
  const WEBHOOK = `${Deno.env.get("SUPABASE_URL")}/functions/v1/webhook-pagamento`;

  if (!TOKEN) return json({ error: "MP_ACCESS_TOKEN não configurado" }, 500);

  const title = isServo
    ? "Inscrição Servo — Submergidos"
    : t.includes("uniforme_sinal")
      ? "Uniforme (sinal 50%) — Submergidos"
      : t.includes("uniforme_integral")
        ? "Uniforme — Submergidos"
        : "Inscrição — Submergidos";

  const externalReference = isServo
    ? `servo||${refId}`
    : t.includes("uniforme_integral")
      ? `uniforme_integral||${refId}`
      : t.includes("uniforme_sinal")
        ? `uniforme_sinal||${refId}`
        : refId;

  // volta pra tela certa após o pagamento
  const backBase = isServo
    ? `${APP_URL}/perfil`
    : isUniforme
      ? `${APP_URL}/uniformes`
      : `${APP_URL}/pagamento`;
  const backQs = (pago: string) =>
    isServo || isUniforme ? `?pago=${pago}` : `?pago=${pago}&id=${refId}`;

  const body = {
    items: [
      {
        title,
        quantity: 1,
        unit_price: unitPrice,
        currency_id: "BRL",
      },
    ],
    payer: {
      name: nome || "Participante",
      email: email || "inscricao@submergidos.app",
    },
    external_reference: externalReference,
    back_urls: {
      success: `${backBase}${backQs("true")}`,
      failure: `${backBase}${backQs("false")}`,
      pending: `${backBase}${backQs("pending")}`,
    },
    auto_return: "approved",
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
  // devolve o erro do MP pra facilitar o diagnóstico
  console.error("MP preference error:", JSON.stringify(data));
  return json({ error: "init_point não retornado", details: data }, 500);
});
