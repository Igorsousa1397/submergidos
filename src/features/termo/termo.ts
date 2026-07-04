import { createClient } from "@/lib/supabase/client";

// ============================================================
//  Camada de dados do Termo digital (Submergidos)
//  Espelha o padrão de features/inscricoes/buscar.ts:
//  isola TODO o Supabase aqui, a página só consome funções puras.
//
//  Portado do componente <Termo> do "Encontro com Deus":
//   - busca do encontrista por CPF/WhatsApp (lá: query direta;
//     aqui: RPC buscar_inscricao, que o anon pode chamar)
//   - compressão de imagem por canvas (MAX_DIM 1600 / q 0.75,
//     pulando PDF e arquivos < 1,5 MB)
//   - upload das fotos (doc + selfie) — lá Firebase Storage,
//     aqui Supabase Storage (bucket privado "termos")
//   - assinatura: NÃO vai pro Storage, vai como base64 no banco
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
          if (blob) {
            resolve(new File([blob], file.name, { type: "image/jpeg" }));
          } else {
            resolve(file);
          }
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
//  Caminho: termos/{encId}/documento.<ext> | termos/{encId}/selfie.jpg
//  Retorna o PATH (não a URL) — o bucket é privado; admin lê depois.
async function uploadArquivo(
  encId: string,
  file: File,
  nomeBase: "documento" | "selfie",
): Promise<string> {
  const supabase = createClient();
  const ext =
    nomeBase === "selfie"
      ? "jpg"
      : file.type === "application/pdf"
        ? "pdf"
        : "jpg";
  const path = `${encId}/${nomeBase}.${ext}`;
  const { error } = await supabase.storage
    .from("termos")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return path;
}

export type DadosAssinatura = {
  encId: string;
  assinaturaDataUrl: string; // base64 (PNG do canvas)
  fotoDoc: File;
  fotoSelfie: File;
};

export type ResultadoAssinatura =
  | { ok: true }
  | { ok: false; erro: string };

// ---- assina o termo: comprime + sobe fotos, grava paths + assinatura ----
export async function assinarTermo(
  dados: DadosAssinatura,
): Promise<ResultadoAssinatura> {
  const supabase = createClient();
  const { encId, assinaturaDataUrl, fotoDoc, fotoSelfie } = dados;

  let docPath: string;
  let selfiePath: string;

  try {
    const docComprimido = await comprimirImagemSeNecessario(fotoDoc);
    docPath = await uploadArquivo(encId, docComprimido, "documento");
  } catch {
    return {
      ok: false,
      erro: "Erro ao enviar a foto do documento. Verifique sua conexão e tente novamente.",
    };
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

  const { error } = await supabase
    .from("encontristas")
    .update({
      termo_assinatura: assinaturaDataUrl,
      termo_doc_path: docPath,
      termo_selfie_path: selfiePath,
      termo_assinado_at: new Date().toISOString(),
    })
    .eq("id", encId);

  if (error) {
    return {
      ok: false,
      erro: "Erro ao salvar seus dados. Verifique sua conexão e tente novamente.",
    };
  }

  return { ok: true };
}
