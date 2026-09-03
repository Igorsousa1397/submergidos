// supabase/functions/webhook-pagamento/index.ts
// O Mercado Pago chama esta URL quando há um pagamento; se aprovado E com o
// valor certo, marca o pagamento no destino certo (service_role, contorna a RLS).
//
// external_reference:
//   "<uuid>"        → encontrista
//   "servo||<uuid>" → inscrição de servo (profiles.pagamento)
//
// O que mudou depois do caso Samuel/Luana (dois PIX, um só refletiu):
//   - confere `transaction_amount` contra o valor esperado da inscrição.
//     Antes marcava "pago" com qualquer valor — pagar R$ 1 bastava.
//   - guarda o id do pagamento do MP também para servo (antes só encontrista),
//     distinguindo baixa por gateway de marcação manual.
//   - aceita o formato IPN (?topic=payment&id=...) além do Webhooks moderno.
//   - LOGA tudo e detecta update que não afetou nenhuma linha. Antes falhava
//     em silêncio: sem log, sem checagem de erro, 200 incondicional.
//   - valida a assinatura do MP quando MP_WEBHOOK_SECRET está configurado.
//
// Continua devolvendo 200 nos casos "não é para mim" para o MP não ficar
// reenviando; erros REAIS devolvem 500 para o MP tentar de novo.
//
// Deploy:  supabase functions deploy webhook-pagamento --no-verify-jwt
// Secret:  supabase secrets set MP_ACCESS_TOKEN=...
//          (opcional) supabase secrets set MP_WEBHOOK_SECRET=...

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buscarCobranca, valorConfere, type Destino } from "../_shared/cobranca.ts";

const ok = (msg: string) => new Response(msg, { status: 200 });
const falha = (msg: string) => new Response(msg, { status: 500 });

/**
 * Assinatura do Mercado Pago: header `x-signature: ts=...,v1=<hmac>` sobre
 * o manifesto `id:<dataId>;request-id:<x-request-id>;ts:<ts>;`.
 * Só é exigida quando o secret está configurado — sem ele, seguimos como
 * antes (o pagamento é sempre reconsultado na API do MP, então o risco é
 * de replay, não de forja).
 */
async function assinaturaValida(req: Request, dataId: string): Promise<boolean> {
  const secret = Deno.env.get("MP_WEBHOOK_SECRET");
  if (!secret) return true;

  const assinatura = req.headers.get("x-signature") ?? "";
  const requestId = req.headers.get("x-request-id") ?? "";
  const partes = Object.fromEntries(
    assinatura.split(",").map((p) => {
      const [k, ...v] = p.split("=");
      return [k.trim(), v.join("=").trim()];
    }),
  );
  if (!partes.ts || !partes.v1) return false;

  const manifesto = `id:${dataId};request-id:${requestId};ts:${partes.ts};`;
  const chave = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const mac = await crypto.subtle.sign("HMAC", chave, new TextEncoder().encode(manifesto));
  const esperado = [...new Uint8Array(mac)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return esperado === partes.v1;
}

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const payload = await req.json().catch(() => ({} as Record<string, unknown>));

    // Webhooks modernos mandam {type, data:{id}} no corpo; o IPN antigo manda
    // ?topic=payment&id=... na query. Aceitamos os dois.
    const tipo =
      (payload as { type?: string }).type ??
      url.searchParams.get("type") ??
      url.searchParams.get("topic");
    const paymentId =
      (payload as { data?: { id?: string } }).data?.id ??
      url.searchParams.get("data.id") ??
      url.searchParams.get("id");

    if (tipo !== "payment" || !paymentId) {
      console.log(`webhook: ignorado (tipo=${tipo ?? "-"}, id=${paymentId ?? "-"})`);
      return ok("ignorado");
    }

    if (!(await assinaturaValida(req, String(paymentId)))) {
      console.error(`webhook: assinatura inválida para o pagamento ${paymentId}`);
      return ok("assinatura inválida"); // 200 de propósito: não adianta reenviar
    }

    const TOKEN = Deno.env.get("MP_ACCESS_TOKEN");
    if (!TOKEN) {
      console.error("webhook: MP_ACCESS_TOKEN não configurado");
      return falha("sem token");
    }

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    if (!mpRes.ok) {
      // 500 para o MP reenviar — pode ser indisponibilidade momentânea
      console.error(`webhook: MP devolveu ${mpRes.status} ao consultar ${paymentId}`);
      return falha("erro ao consultar o pagamento");
    }
    const payment = await mpRes.json();

    const ref = String(payment.external_reference ?? "");
    const valorPago = Number(payment.transaction_amount ?? 0);
    console.log(
      `webhook: pagamento ${paymentId} status=${payment.status} ref="${ref}" valor=${valorPago}`,
    );

    if (payment.status !== "approved") return ok("não aprovado");

    // ---- destino ----
    const destino: Destino = ref.startsWith("servo||") ? "servo" : "encontrista";
    const id = destino === "servo" ? ref.slice("servo||".length) : ref;

    const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!UUID.test(id)) {
      // pagamento que não nasceu do checkout do app (QR avulso, link manual)
      console.error(`webhook: external_reference sem uuid válido ("${ref}") no pagamento ${paymentId}`);
      return ok("referência não reconhecida");
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // ---- o valor pago bate com o que a inscrição custa? ----
    const cobranca = await buscarCobranca(admin, destino, id);
    if (!cobranca) {
      console.error(`webhook: ${destino} ${id} não existe (pagamento ${paymentId})`);
      return ok("inscrição inexistente");
    }
    if (!valorConfere(valorPago, cobranca.valores)) {
      console.error(
        `webhook: RECUSADO — pagamento ${paymentId} de R$ ${valorPago} para ${destino} ${id}, ` +
          `esperado R$ ${cobranca.valores.pix} (pix) ou R$ ${cobranca.valores.credito} (cartão)`,
      );
      return ok("valor divergente");
    }

    // ---- baixa ----
    const agora = new Date().toISOString();
    const { data: linhas, error } =
      destino === "servo"
        ? await admin
            .from("profiles")
            .update({
              pagamento: "pago",
              pago_em: agora,
              pagamento_id: String(paymentId),
              pagamento_via: "gateway",
            })
            .eq("id", id)
            .select("id")
        : await admin
            .from("encontristas")
            .update({ status: "pago", pagamento_id: String(paymentId) })
            .eq("id", id)
            .select("id");

    if (error) {
      console.error(`webhook: erro ao marcar ${destino} ${id}: ${error.message}`);
      return falha("erro ao gravar"); // 500 → o MP reenvia
    }
    if (!linhas || linhas.length === 0) {
      console.error(`webhook: update de ${destino} ${id} não afetou nenhuma linha`);
      return falha("nada atualizado");
    }

    console.log(`webhook: ${destino} ${id} marcado como PAGO pelo pagamento ${paymentId}`);
    return ok("ok");
  } catch (e) {
    console.error("webhook: exceção não tratada:", e instanceof Error ? e.message : e);
    return falha("error");
  }
});
