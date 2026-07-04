import jsPDF from "jspdf";

// ============================================================
//  Geração on-demand do PDF do termo (Submergidos)
//  Portado do exportarPDF() do "Encontro com Deus":
//   - mesmo layout (cabeçalho cinza, dados, termo, anexos, rodapé)
//   - REMOVIDO: RG e Endereço (decisão do Igor)
//   - TROCADO: "Encontro com Deus" → "Submergidos"; datas → 4,5,6 set 2026
//   - assinatura entra embutida (base64 do canvas), antes dos anexos
//  As imagens (doc/selfie) chegam como dataURL já resolvido pela página.
// ============================================================

export type TermoPdfDados = {
  nome: string;
  cpf: string | null;
  igreja: string | null;
  autorizaImagem: string | null;
  sexo?: string | null;
  assinadoEm: string; // texto já formatado
  termoTexto: string;
  assinaturaDataUrl: string | null; // PNG base64 do canvas
  docDataUrl: string | null; // dataURL da foto do documento (null se PDF)
  docEhPdf: boolean;
  selfieDataUrl: string | null;
};

export function exportarTermoPDF(termo: TermoPdfDados) {
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

  // Dados do signatário (sem RG / Endereço)
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

  campo("Nome", termo.nome);
  campo("CPF", termo.cpf);
  campo("Autorização de uso de imagem", termo.autorizaImagem);
  if (termo.sexo) campo("Sexo", termo.sexo);
  campo("Igreja", termo.igreja || "—");

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
    y += lines.length * 6 + 2;
  });

  y += 8;
  if (y + 50 > 285) {
    pdf.addPage();
    y = 20;
  }
  hr();

  // Assinatura (base64 do canvas) embutida
  pdf.setFontSize(10);
  pdf.setFont("helvetica", "normal");
  pdf.setTextColor(30, 30, 30);
  pdf.text(`Assinado digitalmente por: ${termo.nome}`, margin, y);
  y += 6;
  if (termo.assinaturaDataUrl) {
    try {
      pdf.addImage(termo.assinaturaDataUrl, "PNG", margin, y, 70, 30);
      y += 34;
    } catch {
      /* ignora assinatura inválida */
    }
  }
  pdf.setTextColor(120, 120, 120);
  pdf.text(
    `Assinado em: ${termo.assinadoEm || "—"} pelo app Submergidos`,
    margin,
    y,
  );

  // Anexos (documento + selfie)
  const addImg = (
    dataUrl: string | null,
    titulo: string,
    isPdf = false,
  ) => {
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

  addImg(termo.docDataUrl, "DOCUMENTO DE IDENTIDADE", termo.docEhPdf);
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

  pdf.save(`termo_${termo.nome.trim().replace(/ /g, "_")}.pdf`);
}
