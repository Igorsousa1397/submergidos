"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/permissions";
import { totalPedido, TAMANHOS_UNIFORME } from "./shared";

function revalidar() {
  revalidatePath("/uniformes");
}

async function usuarioAtual(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

async function exigirAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const user = await usuarioAtual(supabase);
  if (!user) return "Não autenticado.";
  const { data: perfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!perfil || !isAdmin(perfil.role))
    return "Apenas administradores podem fazer isso.";
  return null;
}

// lê a data limite; pedido só pode ser criado/editado dentro do prazo
async function dentroDoPrazo(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", "uniformes")
    .maybeSingle();
  const limite = (data?.value as { data_limite?: string | null } | null)?.data_limite;
  if (!limite) return false; // sem data = solicitações não abertas
  return new Date().toISOString().slice(0, 10) <= limite;
}

export interface PedidoInput {
  nome_camiseta: string;
  camisa: string;
  qtd_camisas: number;
  calca: string;
  qtd_calcas: number;
  blusa: string;
  qtd_blusas: number;
}

const tamanhoValido = (t: string) =>
  t === "" || (TAMANHOS_UNIFORME as readonly string[]).includes(t);

// Cria/atualiza o pedido do PRÓPRIO servo e trava (status bloqueado).
export async function salvarPedido(input: PedidoInput) {
  const supabase = await createClient();
  const user = await usuarioAtual(supabase);
  if (!user) return { ok: false, erro: "Não autenticado." };

  if (!(await dentroDoPrazo(supabase)))
    return { ok: false, erro: "O prazo para solicitações está encerrado." };

  if (![input.camisa, input.calca, input.blusa].every(tamanhoValido))
    return { ok: false, erro: "Tamanho inválido." };
  if (!input.camisa && !input.calca && !input.blusa)
    return { ok: false, erro: "Escolha ao menos um item (ou use “Não vou pedir nada”)." };
  if (input.camisa && !input.nome_camiseta.trim())
    return { ok: false, erro: "⚠️ Preencha o nome na camiseta antes de salvar." };

  const clamp = (n: number) => Math.min(3, Math.max(1, Math.round(n) || 1));
  const pedido = {
    servo_id: user.id,
    nao_quer: false,
    nome_camiseta: input.camisa ? input.nome_camiseta.trim() : null,
    camisa: input.camisa || null,
    qtd_camisas: input.camisa ? clamp(input.qtd_camisas) : 0,
    calca: input.calca || null,
    qtd_calcas: input.calca ? clamp(input.qtd_calcas) : 0,
    blusa: input.blusa || null,
    qtd_blusas: input.blusa ? clamp(input.qtd_blusas) : 0,
    status: "bloqueado",
    atualizado_em: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("uniformes")
    .upsert({ ...pedido, valor_total: totalPedido(pedido) });
  if (error) return { ok: false, erro: error.message };
  revalidar();
  return { ok: true };
}

// "Não vou pedir nada" — registra a decisão (some dos exports/resumos).
export async function naoQueroUniforme() {
  const supabase = await createClient();
  const user = await usuarioAtual(supabase);
  if (!user) return { ok: false, erro: "Não autenticado." };

  const { error } = await supabase.from("uniformes").upsert({
    servo_id: user.id,
    nao_quer: true,
    nome_camiseta: null,
    camisa: null,
    qtd_camisas: 0,
    calca: null,
    qtd_calcas: 0,
    blusa: null,
    qtd_blusas: 0,
    valor_total: 0,
    status: "bloqueado",
    atualizado_em: new Date().toISOString(),
  });
  if (error) return { ok: false, erro: error.message };
  revalidar();
  return { ok: true };
}

// "Mudei de ideia" — apaga o registro de "não quero" e libera pedir.
export async function mudeiDeIdeia() {
  const supabase = await createClient();
  const user = await usuarioAtual(supabase);
  if (!user) return { ok: false, erro: "Não autenticado." };

  const { error } = await supabase.from("uniformes").delete().eq("servo_id", user.id);
  if (error) return { ok: false, erro: error.message };
  revalidar();
  return { ok: true };
}

// Servo pede pra editar o pedido travado → aguarda aprovação do admin.
export async function solicitarAlteracao() {
  const supabase = await createClient();
  const user = await usuarioAtual(supabase);
  if (!user) return { ok: false, erro: "Não autenticado." };
  if (!(await dentroDoPrazo(supabase)))
    return { ok: false, erro: "O prazo para solicitações está encerrado." };

  const { error } = await supabase
    .from("uniformes")
    .update({ status: "pendente" })
    .eq("servo_id", user.id);
  if (error) return { ok: false, erro: error.message };
  revalidar();
  return { ok: true };
}

// ============ Admin ============

export async function decidirAlteracao(servoId: string, aprovar: boolean) {
  const supabase = await createClient();
  const erroAdmin = await exigirAdmin(supabase);
  if (erroAdmin) return { ok: false, erro: erroAdmin };

  const { error } = await supabase
    .from("uniformes")
    .update({ status: aprovar ? "aberto" : "bloqueado" })
    .eq("servo_id", servoId);
  if (error) return { ok: false, erro: error.message };
  revalidar();
  return { ok: true };
}

// Pagamento manual (PIX fora do app; no original era webhook do MP).
// Integral marca o sinal junto — mesma regra do webhook original.
export async function definirPagamentoUniforme(
  servoId: string,
  campo: "sinal" | "integral",
  valor: boolean,
) {
  const supabase = await createClient();
  const erroAdmin = await exigirAdmin(supabase);
  if (erroAdmin) return { ok: false, erro: erroAdmin };

  const patch =
    campo === "integral"
      ? valor
        ? { pago_integral: true, pago_sinal: true }
        : { pago_integral: false }
      : valor
        ? { pago_sinal: true }
        : { pago_sinal: false, pago_integral: false };

  const { error } = await supabase.from("uniformes").update(patch).eq("servo_id", servoId);
  if (error) return { ok: false, erro: error.message };
  revalidar();
  return { ok: true };
}

export async function salvarDatasUniformes(config: {
  data_limite: string | null;
  data_limite_pedido: string | null;
  data_limite_restante: string | null;
}) {
  const supabase = await createClient();
  const erroAdmin = await exigirAdmin(supabase);
  if (erroAdmin) return { ok: false, erro: erroAdmin };

  const { error } = await supabase
    .from("app_config")
    .upsert({ key: "uniformes", value: config });
  if (error) return { ok: false, erro: error.message };
  revalidar();
  return { ok: true };
}
