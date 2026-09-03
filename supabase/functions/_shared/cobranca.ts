// supabase/functions/_shared/cobranca.ts
//
// Regras de VALOR da inscrição, em um lugar só.
//
// Existe porque o preço vinha do cliente: `criar-pagamento` aceitava o campo
// `valor` do corpo da requisição e o webhook marcava "pago" sem conferir
// quanto entrou de verdade. Dava para pagar R$ 1 e ficar em dia. Agora quem
// decide o valor é o servidor, e o webhook confere o que o Mercado Pago
// cobrou contra o que era esperado.
//
// Importado por criar-pagamento e por webhook-pagamento.

import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

// Servo: cozinha paga menos; cartão tem 5% de acréscimo (regra do original).
export const VALOR_SERVO = 220;
export const VALOR_COZINHA = 100;
export const FATOR_CREDITO = 1.05;

// Encontrista: Fonte Itajaí tem valor próprio; `acordo_valor` sobrepõe tudo.
export const ENCONTRISTA_PIX = 360;
export const ENCONTRISTA_CREDITO = 384;
export const ITAJAI_PIX = 200;
export const ITAJAI_CREDITO = 210;

export type Destino = "servo" | "encontrista";

export interface Valores {
  pix: number;
  credito: number;
}

export interface DadosCobranca {
  nome: string;
  email: string | null;
  valores: Valores;
  /** true quando a inscrição não deve mais ser cobrada (paga, abonada, isenta, desistiu) */
  bloqueado: string | null;
}

const centavos = (v: number) => Math.round(v * 100) / 100;

/**
 * Busca a inscrição e devolve os valores possíveis + o motivo de bloqueio,
 * se houver. Usa o client com service role (contorna a RLS).
 *
 * Devolve null quando a inscrição não existe.
 */
export async function buscarCobranca(
  admin: SupabaseClient,
  destino: Destino,
  id: string,
): Promise<DadosCobranca | null> {
  if (destino === "servo") {
    const { data } = await admin
      .from("profiles")
      .select("nome, email, role, pagamento, roles(isento_pagamento)")
      .eq("id", id)
      .maybeSingle();
    if (!data) return null;

    const isento =
      (data.roles as unknown as { isento_pagamento: boolean } | null)?.isento_pagamento ?? false;
    const base = data.role === "cozinha" ? VALOR_COZINHA : VALOR_SERVO;

    return {
      nome: data.nome,
      email: data.email ?? null,
      valores: { pix: base, credito: centavos(base * FATOR_CREDITO) },
      bloqueado: isento
        ? "Seu perfil é isento de pagamento."
        : data.pagamento === "pago"
          ? "Esta inscrição já está paga."
          : data.pagamento === "abonado"
            ? "Esta inscrição está abonada pela liderança."
            : null,
    };
  }

  const { data } = await admin
    .from("encontristas")
    .select("nome, status, igreja, acordo_valor")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;

  // acordo combinado com a liderança vale para PIX e para cartão
  const acordo = data.acordo_valor == null ? null : Number(data.acordo_valor);
  const itajai = data.igreja === "Fonte Itajaí";
  const valores: Valores =
    acordo != null
      ? { pix: acordo, credito: acordo }
      : itajai
        ? { pix: ITAJAI_PIX, credito: ITAJAI_CREDITO }
        : { pix: ENCONTRISTA_PIX, credito: ENCONTRISTA_CREDITO };

  return {
    nome: data.nome,
    email: null, // a tabela de encontristas não guarda e-mail
    valores,
    bloqueado:
      data.status === "pago"
        ? "Esta inscrição já está paga."
        : data.status === "desistiu"
          ? "Esta inscrição consta como desistência."
          : null,
  };
}

/**
 * O valor pago bate com algum dos valores válidos da inscrição?
 * Aceita PIX ou cartão porque o webhook não sabe qual foi escolhido.
 * Tolerância de 1 centavo para arredondamento do gateway.
 */
export function valorConfere(pago: number, valores: Valores): boolean {
  return [valores.pix, valores.credito].some((v) => Math.abs(pago - v) < 0.01);
}
