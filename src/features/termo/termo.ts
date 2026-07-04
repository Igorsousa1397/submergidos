import { createClient } from "@/lib/supabase/client";

// ============================================================
//  Camada de dados do Termo digital (Submergidos)
//  Espelha o padrão de features/inscricoes/buscar.ts:
//  isola TODO o Supabase aqui, a página só consome funções puras.
//
//  Portado do componente <TermoInscricao> do "Encontro com Deus":
//   - aceite por CHECKBOX (não canvas) → não há assinatura em base64
//   - endereço via ViaCEP → colunas separadas (termo_endereco/cep/numero/complemento)
//   - foto do documento FRENTE + VERSO (opcional) + selfie
//   - upload das fotos — lá Firebase Storage, aqui Supabase Storage
//     (bucket privado "termos"); grava só os PATHS no banco
//   - RG: removido (decisão do Igor)
// ============================================================

export type EncontristaTermo = {
  id: string;
  nome: string;
  cpf: string | null;
  igreja: string | null;
  celula: string | null;
  status: string | null;
  autoriza_imagem: string | null;
  termo_assinado_at: string | null;
};

export type BuscaTermo =
  | { ok: true; enc: EncontristaTermo }
  | { ok: false; erro: string };

// ---- busca por CPF ou WhatsApp (mesma RPC usada no pagamento) ----
//  Observação: a RPC buscar_inscricao devolve apenas id/nome/igreja/celula/status
//  (dados públicos). CPF, sexo e autorização NÃO voltam por ela — no fluxo
//  inline (inscrição → termo) esses campos vêm direto do formulário; no acesso
//  por ?doc= (fallback) mostramos só o que a RPC devolve.
export async function buscarParaTermo(documento: string): Promise<BuscaTermo> {
  const limpo = documento.replace(/\D/g, "");
  if (!limpo) return { ok: false, erro: "Informe um CPF ou WhatsApp válido." };

  const supabase = createClient();
  const { data, error } = await supabase.rpc("buscar_inscricao", {
    documento: limpo,
  });

  if (error) {
    return { ok: false, erro: "Erro ao buscar inscrição. Tente novamente." };
  }
  const enc = Array.isArray(data) ? data[0] : data;
  if (!enc) {
    return {
      ok: false,
      erro: "Inscrição não encontrada. Verifique o CPF ou WhatsApp informado.",
    };
  }
  return { ok: true, enc: enc as EncontristaTermo };
}

// ---- compressão de imagem por canvas (igual ao original) ----
//  PDFs e arquivos já pequenos (< 1,5 MB) passam direto.
export function comprimirImagemSeNecessario(file: File): Promise<File> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/") || file.size < 1.5 * 1024 * 1024) {
      resolve(file);
      return;
    }
    const img = document.createElement("img");
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX_DIM = 1600;
      let { width, height } = img;
      if (width > height && width > MAX_DIM) {
        height = Math.round((height * MAX_DIM) / width);
        width = MAX_DIM;
      } else if (height > MAX_DIM) {
        width = Math.round((width * MAX_DIM) / height);
        height = MAX_DIM;
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        resolve(file);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) => {
          resolve(blob ? new File([blob], file.name, { type: "image/jpeg" }) : file);
        },
        "image/jpeg",
        0.75,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

// ---- upload de um arquivo no bucket privado "termos" ----
//  Caminho: {encId}/documento_frente.<ext> | documento_verso.<ext> | selfie.jpg
//  Retorna o PATH (não a URL) — o bucket é privado; admin lê depois.
type NomeArquivo = "documento_frente" | "documento_verso" | "selfie";

async function uploadArquivo(
  encId: string,
  file: File,
  nomeBase: NomeArquivo,
): Promise<string> {
  const supabase = createClient();
  const ext =
    nomeBase === "selfie"
      ? "jpg"
      : file.type === "application/pdf"
        ? "pdf"
        : "jpg";
  const path = `${encId}/${nomeBase}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
  .from("termos")
  .upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  return path;
}

export type DadosAssinatura = {
  encId: string;
  endereco: string; // rua, bairro, cidade/UF (editável, pré-preenchido pelo CEP)
  cep: string;
  numero: string;
  complemento: string;
  fotoDoc: File; // frente (obrigatória)
  fotoVerso: File | null; // opcional
  fotoSelfie: File;
};

export type ResultadoAssinatura =
  | { ok: true }
  | { ok: false; erro: string };

// ---- assina o termo: comprime + sobe fotos, grava endereço + paths ----
export async function assinarTermo(
  dados: DadosAssinatura,
): Promise<ResultadoAssinatura> {
  const supabase = createClient();
  const { encId, endereco, cep, numero, complemento, fotoDoc, fotoVerso, fotoSelfie } =
    dados;

  let docPath: string;
  let versoPath: string | null = null;
  let selfiePath: string;

  try {
    const docComprimido = await comprimirImagemSeNecessario(fotoDoc);
    docPath = await uploadArquivo(encId, docComprimido, "documento_frente");
  } catch {
    return {
      ok: false,
      erro: "Erro ao enviar a foto do documento. Verifique sua conexão e tente novamente.",
    };
  }

  if (fotoVerso) {
    try {
      const versoComprimido = await comprimirImagemSeNecessario(fotoVerso);
      versoPath = await uploadArquivo(encId, versoComprimido, "documento_verso");
    } catch {
      return {
        ok: false,
        erro: "Erro ao enviar o verso do documento. Verifique sua conexão e tente novamente.",
      };
    }
  }

  try {
    const selfieComprimida = await comprimirImagemSeNecessario(fotoSelfie);
    selfiePath = await uploadArquivo(encId, selfieComprimida, "selfie");
  } catch {
    return {
      ok: false,
      erro: "Erro ao enviar a selfie. Verifique sua conexão e tente novamente.",
    };
  }

  const { data: assinou, error } = await supabase.rpc("assinar_termo", {
    p_enc_id: encId,
    p_endereco: endereco.trim(),
    p_cep: cep.replace(/\D/g, ""),        // sem "|| null" — manda string vazia se não tiver
    p_numero: numero.trim(),
    p_complemento: complemento.trim(),     // sem "|| null"
    p_doc_path: docPath,
    p_doc_verso_path: versoPath ?? "",
    p_selfie_path: selfiePath,
  });

  if (error) {
    return {
      ok: false,
      erro: "Erro ao salvar seus dados. Verifique sua conexão e tente novamente.",
    };
  }

  // A RPC retorna false se o termo já estava assinado (ou id não existe).
  // Nesse caso, o termo já está OK — segue como sucesso.
  void assinou;

  return { ok: true };
}
