import jsPDF from "jspdf";

// ============================================================
//  Geração do PDF do termo (Submergidos)
//  Portado do exportarPDF() do "Encontro com Deus", adaptado ao
//  fluxo novo:
//   - aceite por CHECKBOX (não canvas) → sem imagem de assinatura;
//     entra o texto "Aceito eletronicamente".
//   - ENDEREÇO voltou (colunas separadas) → aparece nos dados.
//   - RG: removido.
//   - Marca: "Submergidos" / datas 4,5,6 set 2026.
//   - NÃO baixa no dispositivo: retorna um Blob para subir no Storage.
//  As imagens (doc frente/verso/selfie) chegam como dataURL já
//  resolvido pela camada de dados (termo.ts).
// ============================================================

export type TermoPdfDados = {
  nome: string;
  cpf: string | null;
  igreja: string | null;
  autorizaImagem: string | null;
  sexo?: string | null;
  endereco: string | null;
  cep: string | null;
  numero: string | null;
  complemento: string | null;
  assinadoEm: string; // texto já formatado
  termoTexto: string;
  docDataUrl: string | null; // dataURL da foto do documento (frente)
  docEhPdf: boolean;
  docVersoDataUrl: string | null; // dataURL do verso (opcional)
  selfieDataUrl: string | null;
};

// Gera o PDF e devolve como Blob (para upload). Não baixa no dispositivo.
export function gerarTermoPDFBlob(termo: TermoPdfDados): Blob {
  const pdf = new jsPDF();
  const margin = 20;
  const pageW = 210;
  let y = 20;

  const line = (
    txt: string,
    size = 11,
    bold = false,
    align: "left" | "center" = "left",
  ) => {
    pdf.setFontSize(size);
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    const maxW = pageW - margin * 2;
    const lines = pdf.splitTextToSize(String(txt || ""), maxW);
    const x = align === "center" ? pageW / 2 : margin;
    pdf.text(lines, x, y, { align });
    y += lines.length * (size * 0.45) + 5;
  };

  const hr = () => {
    pdf.setDrawColor(200, 200, 200);
    pdf.line(margin, y, pageW - margin, y);
    y += 8;
  };

  // Cabeçalho
  pdf.setFillColor(240, 240, 240);
  pdf.rect(0, 0, pageW, 30, "F");
  pdf.setFontSize(13);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(30, 30, 30);
  pdf.text("Igreja Apostólica Fonte", pageW / 2, 13, { align: "center" });
  pdf.setFontSize(9);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(100, 100, 100);
  pdf.text(
    "R. Catiguá, 130 - Ipês (Polvilho), Cajamar - SP, 07750-000 | Tel: (11) 94718-7017",
    pageW / 2,
    21,
    { align: "center" },
  );
  y = 40;

  pdf.setTextColor(30, 30, 30);
  line(
    "Termo de Concordância com as Ministrações e Autorização de Uso de Imagem",
    14,
    true,
    "center",
  );
  y += 2;
  hr();

  // Dados do signatário (com Endereço; sem RG)
  line("DADOS DO SIGNATÁRIO", 10, true);
  y += 2;

  const campo = (label: string, valor: string | null | undefined) => {
    pdf.setFontSize(9);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(120, 120, 120);
    pdf.text(label, margin, y);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(30, 30, 30);
    pdf.setFontSize(11);
    const lines = pdf.splitTextToSize(String(valor || "—"), 170);
    y += 5;
    pdf.text(lines, margin, y);
    y += lines.length * 6 + 2;
  };

  // Endereço montado numa linha só
  const enderecoCompleto = [
    termo.endereco,
    termo.numero ? `nº ${termo.numero}` : null,
    termo.complemento,
    termo.cep ? `CEP ${termo.cep}` : null,
  ]
    .filter(Boolean)
    .join(", ");

  campo("Nome", termo.nome);
  campo("CPF", termo.cpf);
  if (termo.sexo) campo("Sexo", termo.sexo);
  campo("Igreja", termo.igreja || "—");
  campo("Endereço", enderecoCompleto || "—");
  campo("Autorização de uso de imagem", termo.autorizaImagem);

  y += 2;
  hr();

  // Texto do termo
  line("TERMO", 10, true);
  y += 2;
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(30, 30, 30);
  const textoLimpo = (termo.termoTexto || "").replace(/\\n/g, "\n");
  const paragrafos = textoLimpo.split("\n").filter((p) => p.trim());
  paragrafos.forEach((p) => {
    const lines = pdf.splitTextToSize(p.trim(), 170);
    if (y + lines.length * 6 > 270) {
      pdf.addPage();
      y = 20;
    }
    pdf.text(lines, margin, y);
    y += lines.length * 6 + 4;
  });

  y += 4;
  if (y > 250) {
    pdf.addPage();
    y = 20;
  }
  hr();

  // Aceite (checkbox) — sem imagem de assinatura
  pdf.setFontSize(11);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(30, 30, 30);
  pdf.text(`Aceito eletronicamente por: ${termo.nome}`, margin, y);
  y += 6;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.setTextColor(80, 80, 80);
  pdf.text(
    'O signatário marcou "Li e concordo" com todos os termos acima.',
    margin,
    y,
  );
  y += 6;
  pdf.setTextColor(120, 120, 120);
  pdf.text(
    `Assinado em: ${termo.assinadoEm || "—"} pelo app Submergidos`,
    margin,
    y,
  );

  // Anexos (documento frente/verso + selfie)
  const addImg = (dataUrl: string | null, titulo: string, isPdf = false) => {
    if (isPdf) {
      pdf.addPage();
      let yF = 20;
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(30, 30, 30);
      pdf.text(titulo, margin, yF);
      yF += 10;
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(100, 100, 100);
      pdf.text("Documento anexado em PDF (não renderizado aqui).", margin, yF);
      return;
    }
    if (!dataUrl) return;
    pdf.addPage();
    let yF = 20;
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(30, 30, 30);
    pdf.text(titulo, margin, yF);
    yF += 10;
    try {
      pdf.addImage(dataUrl, "JPEG", margin, yF, 170, 130);
    } catch {
      /* ignora imagem inválida */
    }
  };

  addImg(termo.docDataUrl, "DOCUMENTO DE IDENTIDADE (FRENTE)", termo.docEhPdf);
  addImg(termo.docVersoDataUrl, "DOCUMENTO DE IDENTIDADE (VERSO)", false);
  addImg(termo.selfieDataUrl, "SELFIE DE VALIDAÇÃO", false);

  // Rodapé em todas as páginas
  const totalPages = pdf.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text("Igreja Apostólica Fonte — CNPJ 52.268.825/0001-95", margin, 287);
    pdf.text(`Página ${i} de ${totalPages}`, pageW - margin, 287, {
      align: "right",
    });
  }

  return pdf.output("blob");
}