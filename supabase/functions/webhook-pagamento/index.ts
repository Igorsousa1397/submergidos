// supabase/functions/webhook-pagamento/index.ts
// Port da Cloud Function `webhookPagamento` (Firebase) → Edge Function (Deno).
// O Mercado Pago chama esta URL quando há um pagamento; se aprovado,
// marca o encontrista como pago (usa a service_role, contornando a RLS).
//
// Deploy:  supabase functions deploy webhook-pagamento --no-verify-jwt
// Secret:  supabase secrets set MP_ACCESS_TOKEN=...
//          (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY já existem no ambiente)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const payload = await req.json().catch(() => ({} as Record<string, unknown>));

    const type =
      (payload as { type?: string }).type ?? url.searchParams.get("type");
    const paymentId =
      (payload as { data?: { id?: string } }).data?.id ??
      url.searchParams.get("data.id");

    if (type !== "payment" || !paymentId) {
      return new Response("ok", { status: 200 });
    }

    const TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
    const payment = await fetch(
      `https://api.mercadopago.com/v1/payments/${paymentId}`,
      { headers: { Authorization: `Bearer ${TOKEN}` } },
    ).then((r) => r.json());

    if (payment.status === "approved") {
      const encontristaId = payment.external_reference;
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      await supabase
        .from("encontristas")
        .update({ status: "pago", pagamento_id: String(paymentId) })
        .eq("id", encontristaId);
    }

    return new Response("ok", { status: 200 });
  } catch (_e) {
    return new Response("error", { status: 500 });
  }
});
