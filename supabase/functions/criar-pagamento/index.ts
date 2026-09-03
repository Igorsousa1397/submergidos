// supabase/functions/criar-pagamento/index.ts
// Cria uma preferência de checkout no Mercado Pago e devolve o init_point.
//
// Tipos aceitos:
//   pix | credito               → inscrição de ENCONTRISTA
//   servo_pix | servo_credito   → inscrição de SERVO
//
// external_reference: encontrista = id puro (compat); servo = "servo||id"
// (o webhook-pagamento decide o destino pelo prefixo).
//
// O VALOR é calculado aqui, a partir do cadastro (_shared/cobranca.ts).
// Antes vinha no corpo da requisição: como esta função é pública
// (--no-verify-jwt), qualquer um com a anon key podia pedir uma cobrança de
// R$ 1 para qualquer uuid e o webhook marcava como paga.
//
// Também recusa gerar cobrança para quem já está pago/abonado/isento — foi
// isso que deixou o mesmo servo pagar duas vezes achando que a segunda ia
// para outra pessoa.
//
// Deploy:  supabase functions deploy criar-pagamento --no-verify-jwt
// Secret:  supabase secrets set MP_ACCESS_TOKEN=...   APP_URL=https://seu-app.vercel.app

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buscarCobranca, type Destino } from "../_shared/cobranca.ts";

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

// a preferência expira: link antigo não pode ser pago depois que a
// inscrição já foi quitada por outro caminho
const MINUTOS_VALIDADE = 60;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Method Not Allowed" }, 405);

  const body = await req.json().catch(() => ({}));
  // `encontristaId` mantido por compatibilidade com as telas atuais
  const refId: string = body.id ?? body.encontristaId;
  if (!refId) return json({ error: "id obrigatório" }, 400);

  const t = typeof body.tipo === "string" ? body.tipo : "pix";
  const isCredito = t.includes("credito");
  const destino: Destino = t.startsWith("servo") ? "servo" : "encontrista";

  const TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
  if (!TOKEN) return json({ error: "MP_ACCESS_TOKEN não configurado" }, 500);
  const APP_URL = Deno.env.get("APP_URL") ?? "https://submergidos.vercel.app";
  const WEBHOOK = `${Deno.env.get("SUPABASE_URL")}/functions/v1/webhook-pagamento`;

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // ---- valor e elegibilidade vêm do banco, nunca do cliente ----
  const cobranca = await buscarCobranca(admin, destino, refId);
  if (!cobranca) {
    console.error(`criar-pagamento: ${destino} ${refId} não encontrado`);
    return json({ error: "Inscrição não encontrada." }, 404);
  }
  if (cobranca.bloqueado) {
    console.log(`criar-pagamento: recusado para ${destino} ${refId} — ${cobranca.bloqueado}`);
    return json({ error: cobranca.bloqueado }, 409);
  }

  const unitPrice = isCredito ? cobranca.valores.credito : cobranca.valores.pix;
  if (unitPrice <= 0) return json({ error: "Valor da inscrição inválido." }, 500);

  // se o cliente mandou um valor, ele é ignorado — mas registramos a
  // divergência, que é o sintoma de alguém tentando escolher o preço
  if (body.valor != null && Number(body.valor) !== unitPrice) {
    console.warn(
      `criar-pagamento: valor do cliente (${body.valor}) ignorado; cobrando ${unitPrice} para ${destino} ${refId}`,
    );
  }

  const isServo = destino === "servo";
  const title = isServo ? "Inscrição Servo — Submergidos" : "Inscrição — Submergidos";
  const externalReference = isServo ? `servo||${refId}` : refId;

  // volta pra tela certa após o pagamento
  const backBase = isServo ? `${APP_URL}/perfil` : `${APP_URL}/pagamento`;
  const backQs = (pago: string) =>
    isServo ? `?pago=${pago}` : `?pago=${pago}&id=${refId}`;

  const expiraEm = new Date(Date.now() + MINUTOS_VALIDADE * 60_000).toISOString();

  const preference = {
    items: [
      {
        title,
        quantity: 1,
        unit_price: unitPrice,
        currency_id: "BRL",
      },
    ],
    payer: {
      name: cobranca.nome,
      email: cobranca.email || "inscricao@submergidos.app",
    },
    external_reference: externalReference,
    metadata: { destino, id: refId, valor_esperado: unitPrice },
    expires: true,
    expiration_date_to: expiraEm,
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
    body: JSON.stringify(preference),
  });
  const data = await mpRes.json();

  if (data.init_point) {
    console.log(
      `criar-pagamento: preference ${data.id} — ${destino} ${refId} — ${t} — R$ ${unitPrice}`,
    );
    return json({ init_point: data.init_point, id: data.id, valor: unitPrice });
  }

  console.error("criar-pagamento: MP recusou a preference:", JSON.stringify(data));
  return json({ error: "init_point não retornado", details: data }, 500);
});
