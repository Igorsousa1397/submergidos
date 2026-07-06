import { createClient } from "@/lib/supabase/client";
import { gerarTermoPDFBlob } from "@/lib/termo-pdf";

// ---- converte a 1ª página de um PDF em imagem (dataURL JPEG) ----
//  Usado quando o documento é enviado como PDF: o jsPDF não embute PDF,
//  então rasterizamos a primeira página e tratamos como foto normal.
async function pdfParaImagemDataURL(file: File): Promise<string | null> {
  try {
    const pdfjs = await import("pdfjs-dist");
    // worker servido de /public (caminho fixo — não depende do bundler)
    pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

    const buf = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: buf }).promise;
    const page = await doc.getPage(1);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // v6 exige o campo `canvas` no render, além do canvasContext
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    return canvas.toDataURL("image/jpeg", 0.8);
  } catch (e) {
    console.error("[pdf→img] falhou:", e);
    return null;
  }
}

// Resolve o documento (frente OU verso): se for PDF, converte em imagem;
// se for imagem, comprime normal. Devolve { dataUrl, ehPdf } — ehPdf vira
// false quando a conversão deu certo (o PDF virou foto).
async function resolverDocumento(
  file: File,
): Promise<{ dataUrl: string | null; ehPdf: boolean }> {
  if (file.type === "application/pdf") {
    const img = await pdfParaImagemDataURL(file);
    if (img) return { dataUrl: img, ehPdf: false }; // convertido → tratar como imagem
    return { dataUrl: null, ehPdf: true }; // falhou → mantém o aviso
  }
  const comprimido = await comprimirImagemSeNecessario(file);
  return { dataUrl: await fileParaDataURL(comprimido), ehPdf: false };
}

// Converte um File em dataURL (para embutir imagens no PDF).
function fileParaDataURL(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/")) {
      resolve(null); // PDF ou outro tipo: não embute imagem
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : null);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

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

// ---- upload de um arquivo/blob no bucket privado "termos" ----
//  Caminho: {encId}/{nomeBase}-{timestamp}.<ext> (único por envio → nunca colide,
//  não precisa de upsert nem de SELECT no storage). Retorna o PATH.
type NomeArquivo = "documento_frente" | "documento_verso" | "selfie" | "termo";

async function uploadArquivo(
  encId: string,
  file: Blob,
  nomeBase: NomeArquivo,
  contentType: string,
): Promise<string> {
  const supabase = createClient();
  const ext =
    nomeBase === "termo"
      ? "pdf"
      : nomeBase === "selfie"
        ? "jpg"
        : contentType === "application/pdf"
          ? "pdf"
          : "jpg";
  const path = `${encId}/${nomeBase}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage
    .from("termos")
    .upload(path, file, { upsert: false, contentType });
  if (error) throw error;
  return path;
}

// Dados do signatário para montar o PDF (vêm do formulário/RPC).
export type DadosSignatario = {
  nome: string;
  cpf: string | null;
  igreja: string | null;
  autorizaImagem: string | null;
  sexo?: string | null;
  termoTexto: string;
};

export type DadosAssinatura = {
  encId: string;
  endereco: string; // rua, bairro, cidade/UF (editável, pré-preenchido pelo CEP)
  cep: string;
  numero: string;
  complemento: string;
  fotoDoc: File; // frente (obrigatória)
  fotoVerso: File | null; // opcional
  fotoSelfie: File;
  signatario: DadosSignatario; // para o PDF
};

export type ResultadoAssinatura =
  | { ok: true }
  | { ok: false; erro: string };

// ---- assina o termo: comprime + sobe fotos, grava endereço + paths ----
export async function assinarTermo(
  dados: DadosAssinatura,
): Promise<ResultadoAssinatura> {
  const supabase = createClient();
  const { encId, endereco, cep, numero, complemento, fotoDoc, fotoVerso, fotoSelfie, signatario } =
    dados;

  let docPath: string;
  let versoPath: string | null = null;
  let selfiePath: string;

  // guardamos os dataURLs das imagens para embutir no PDF
  let docDataUrl: string | null = null;
  let docVersoDataUrl: string | null = null;
  let selfieDataUrl: string | null = null;
  let docEhPdf = false;
  let versoEhPdf = false;

  try {
    // sobe o ARQUIVO ORIGINAL no Storage (preserva o PDF, se for PDF)
    docPath = await uploadArquivo(encId, fotoDoc, "documento_frente", fotoDoc.type);
    // para o termo: converte PDF→imagem, ou comprime a foto
    const doc = await resolverDocumento(fotoDoc);
    docDataUrl = doc.dataUrl;
    docEhPdf = doc.ehPdf;
  } catch {
    return {
      ok: false,
      erro: "Erro ao enviar a foto do documento. Verifique sua conexão e tente novamente.",
    };
  }

  if (fotoVerso) {
    try {
      versoPath = await uploadArquivo(encId, fotoVerso, "documento_verso", fotoVerso.type);
      const verso = await resolverDocumento(fotoVerso);
      docVersoDataUrl = verso.dataUrl;
      versoEhPdf = verso.ehPdf;
    } catch {
      return {
        ok: false,
        erro: "Erro ao enviar o verso do documento. Verifique sua conexão e tente novamente.",
      };
    }
  }

  try {
    const selfieComprimida = await comprimirImagemSeNecessario(fotoSelfie);
    selfiePath = await uploadArquivo(encId, selfieComprimida, "selfie", selfieComprimida.type);
    selfieDataUrl = await fileParaDataURL(selfieComprimida);
  } catch {
    return {
      ok: false,
      erro: "Erro ao enviar a selfie. Verifique sua conexão e tente novamente.",
    };
  }

  // Gera o PDF do termo e sobe no Storage (não baixa no dispositivo).
  //  Falha no PDF NÃO impede a assinatura — só loga; o termo continua válido.
  let pdfPath: string | null = null;
  try {
    const assinadoEm = new Date().toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
    const blob = gerarTermoPDFBlob({
      nome: signatario.nome,
      cpf: signatario.cpf,
      igreja: signatario.igreja,
      autorizaImagem: signatario.autorizaImagem,
      sexo: signatario.sexo ?? null,
      endereco: endereco.trim() || null,
      cep: cep.replace(/\D/g, "") || null,
      numero: numero.trim() || null,
      complemento: complemento.trim() || null,
      assinadoEm,
      termoTexto: signatario.termoTexto,
      docDataUrl,
      docEhPdf,
      docVersoEhPdf: versoEhPdf,
      docVersoDataUrl,
      selfieDataUrl,
    });
    pdfPath = await uploadArquivo(encId, blob, "termo", "application/pdf");
  } catch {
    // PDF é um "nice to have" para o admin; não bloqueia a assinatura.
    pdfPath = null;
  }

  const { data: assinou, error } = await supabase.rpc("assinar_termo", {
    p_enc_id: encId,
    p_endereco: endereco.trim(),
    p_cep: cep.replace(/\D/g, ""),
    p_numero: numero.trim(),
    p_complemento: complemento.trim(),
    p_doc_path: docPath,
    p_doc_verso_path: versoPath ?? "",
    p_selfie_path: selfiePath,
    p_pdf_path: pdfPath ?? "",
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
