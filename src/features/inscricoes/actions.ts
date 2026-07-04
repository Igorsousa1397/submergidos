"use server";

import { createClient } from "@/lib/supabase/server";

export interface InscricaoInput {
  igreja: string;
  igrejaCustom?: string;
  nome: string;
  cpf: string; // pode vir com máscara
  nascimento: string; // YYYY-MM-DD
  sexo: "masculino" | "feminino" | "";
  whatsapp: string; // pode vir com máscara
  celula: string;
  autorizaImagem: boolean | null;
  emergenciaNome: string;
  emergenciaTel: string;
  medicamento: string | null;
  doenca: string | null;
}

export type InscricaoResult =
  | { ok: true; nome: string; whatsapp: string }
  | { ok: false; erro: string };

export async function criarInscricao(
  input: InscricaoInput,
): Promise<InscricaoResult> {
  const cpf = (input.cpf || "").replace(/\D/g, "");
  const whatsapp = (input.whatsapp || "").replace(/\D/g, "");

  // ── Validações (espelham o cliente, mas o servidor é a fonte da verdade) ──
  if (!input.nome?.trim()) return { ok: false, erro: "Informe seu nome completo." };
  if (cpf.length !== 11) return { ok: false, erro: "CPF inválido — precisa ter 11 dígitos." };
  if (!input.nascimento) return { ok: false, erro: "Informe a data de nascimento." };

  const nasc = new Date(input.nascimento + "T00:00:00");
  const hoje = new Date();
  let idade = hoje.getFullYear() - nasc.getFullYear();
  const difMes = hoje.getMonth() - nasc.getMonth();
  if (difMes < 0 || (difMes === 0 && hoje.getDate() < nasc.getDate())) idade--;
  if (Number.isNaN(idade) || idade < 14)
    return { ok: false, erro: "É necessário ter ao menos 14 anos para se inscrever." };

  if (input.sexo !== "masculino" && input.sexo !== "feminino")
    return { ok: false, erro: "Selecione o sexo." };
  if (whatsapp.length < 10) return { ok: false, erro: "WhatsApp inválido." };
  if (!input.celula) return { ok: false, erro: "Selecione sua célula." };
  if (input.autorizaImagem === null)
    return { ok: false, erro: "Responda sobre o uso de imagem." };
  if (!input.emergenciaNome?.trim() || !input.emergenciaTel?.trim())
    return { ok: false, erro: "Informe o contato de emergência." };

  const igreja =
    input.igreja === "Outra"
      ? input.igrejaCustom?.trim() || "Outra"
      : input.igreja;
  if (!igreja) return { ok: false, erro: "Selecione sua igreja." };

  const supabase = await createClient();
  // Sem .select(): o anon não tem policy de SELECT em encontristas, então
  // ler o registro de volta falharia mesmo com o INSERT já commitado.
  const { error } = await supabase.from("encontristas").insert({
    nome: input.nome.trim(),
    cpf,
    nascimento: input.nascimento,
    // A validação acima garante "masculino" | "feminino"; o "" já foi descartado.
    sexo: input.sexo as "masculino" | "feminino",
    whatsapp,
    celula: input.celula,
    igreja,
    autoriza_imagem: input.autorizaImagem,
    emergencia: `${input.emergenciaNome.trim()} — ${input.emergenciaTel.trim()}`,
    medicamento: input.medicamento?.trim() || null,
    doenca_cronica: input.doenca?.trim() || null,
    status: "pendente",
  });

  if (error) {
    if (error.code === "23505")
      return { ok: false, erro: "Já existe uma inscrição com este CPF ou WhatsApp." };
    if (error.code === "42501")
      return { ok: false, erro: "As inscrições estão encerradas no momento." };
    return { ok: false, erro: "Não foi possível salvar a inscrição. Tente novamente." };
  }

  return { ok: true, nome: input.nome.trim(), whatsapp };
}
