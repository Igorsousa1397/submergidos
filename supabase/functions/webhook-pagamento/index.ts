// supabase/functions/webhook-pagamento/index.ts
// O Mercado Pago chama esta URL quando há um pagamento; se aprovado,
// marca o pagamento no destino certo (usa a service_role, contornando a RLS).
//
// external_reference:
//   "<uuid>"        → encontrista (legado)
//   "servo||<uuid>" → inscrição de servo (profiles.pagamento)
//
// Deploy:  supabase functions deploy webhook-pagamento --no-verify-jwt
// Secret:  supabase secrets set MP_ACCESS_TOKEN=...

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
      const ref = String(payment.external_reference ?? "");
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      if (ref.includes("||")) {
        const [tipo, id] = ref.split("||");
        if (tipo.includes("servo")) {
          await supabase
            .from("profiles")
            .update({ pagamento: "pago", pago_em: new Date().toISOString() })
            .eq("id", id);
        }
      } else {
        // legado: inscrição de encontrista
        await supabase
          .from("encontristas")
          .update({ status: "pago", pagamento_id: String(paymentId) })
          .eq("id", ref);
      }
    }

    return new Response("ok", { status: 200 });
  } catch (_e) {
    return new Response("error", { status: 500 });
  }
});
