import { strToU8, zipSync } from "fflate";

// ============================================================
//  Gerador de planilha .xlsx (Excel de verdade, com colunas)
//
//  Antes as telas exportavam CSV separado por vírgula. O Excel em pt-BR
//  espera ponto e vírgula, então o arquivo abria com TUDO na coluna A —
//  inútil no tablet da liderança. Aqui montamos o .xlsx na mão: é só um
//  ZIP com alguns XMLs, e o fflate (já usado pelo pdfjs) faz o ZIP.
//
//  Toda célula vai como TEXTO (inlineStr) de propósito: CPF com zero à
//  esquerda e datas dd/mm/aaaa seriam destruídos se o Excel tentasse
//  interpretá-los como número.
// ============================================================

export type CelulaPlanilha = string | number | null | undefined;

const esc = (v: string) =>
  v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // caracteres de controle são inválidos em XML e travam o Excel
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "");

// 0 -> A, 25 -> Z, 26 -> AA
const coluna = (i: number) => {
  let s = "";
  for (let n = i; n >= 0; n = Math.floor(n / 26) - 1) {
    s = String.fromCharCode(65 + (n % 26)) + s;
  }
  return s;
};

// Excel recusa nome de aba com > 31 chars ou com []:*?/\
const nomeAba = (s: string) => (s.replace(/[[\]:*?/\\]/g, "-").slice(0, 31) || "Dados");

const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
const NS_REL = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";

function montarSheet(colunas: string[], linhas: CelulaPlanilha[][]): string {
  const texto = (c: CelulaPlanilha) => (c === null || c === undefined ? "" : String(c));

  // largura por coluna: maior conteúdo da coluna, com folga, entre 10 e 50
  const larguras = colunas.map((cab, i) => {
    const maior = linhas.reduce((m, l) => Math.max(m, texto(l[i]).length), cab.length);
    return Math.min(50, Math.max(10, maior + 2));
  });

  const celula = (valor: CelulaPlanilha, col: number, linha: number, negrito: boolean) => {
    const v = texto(valor);
    if (!v) return ""; // célula vazia não precisa existir no XML
    const s = negrito ? ' s="1"' : "";
    return `<c r="${coluna(col)}${linha}" t="inlineStr"${s}><is><t xml:space="preserve">${esc(v)}</t></is></c>`;
  };

  const cabecalho = `<row r="1">${colunas.map((c, i) => celula(c, i, 1, true)).join("")}</row>`;
  const corpo = linhas
    .map((l, li) => {
      const cs = colunas.map((_, ci) => celula(l[ci], ci, li + 2, false)).join("");
      return `<row r="${li + 2}">${cs}</row>`;
    })
    .join("");

  return (
    `${XML}<worksheet xmlns="${NS}" xmlns:r="${NS_REL}">` +
    // congela o cabeçalho: rolar a lista mantém os títulos à vista
    `<sheetViews><sheetView workbookViewId="0">` +
    `<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>` +
    `</sheetView></sheetViews>` +
    `<cols>${larguras
      .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
      .join("")}</cols>` +
    `<sheetData>${cabecalho}${corpo}</sheetData>` +
    `</worksheet>`
  );
}

// styles.xml mínimo: fonte 0 normal, fonte 1 em negrito (usada no cabeçalho)
const STYLES =
  `${XML}<styleSheet xmlns="${NS}">` +
  `<fonts count="2">` +
  `<font><sz val="11"/><name val="Calibri"/></font>` +
  `<font><b/><sz val="11"/><name val="Calibri"/></font>` +
  `</fonts>` +
  `<fills count="2"><fill><patternFill patternType="none"/></fill>` +
  `<fill><patternFill patternType="gray125"/></fill></fills>` +
  `<borders count="1"><border/></borders>` +
  `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
  `<cellXfs count="2">` +
  `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
  `<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>` +
  `</cellXfs>` +
  // leitores estritos (Excel mobile) recusam a pasta sem um estilo nomeado
  `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
  `</styleSheet>`;

export interface Planilha {
  /** nome do arquivo, SEM extensão */
  arquivo: string;
  aba?: string;
  colunas: string[];
  linhas: CelulaPlanilha[][];
}

/**
 * Monta os bytes do .xlsx. Separado do download para poder ser testado
 * fora do browser (não toca em Blob nem em document).
 */
export function montarXlsx({ aba = "Dados", colunas, linhas }: Omit<Planilha, "arquivo">) {
  const contentTypes =
    `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
    `</Types>`;

  const rels =
    `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="${NS_REL}/officeDocument" Target="xl/workbook.xml"/>` +
    `</Relationships>`;

  const workbook =
    `${XML}<workbook xmlns="${NS}" xmlns:r="${NS_REL}">` +
    `<sheets><sheet name="${esc(nomeAba(aba))}" sheetId="1" r:id="rId1"/></sheets>` +
    `</workbook>`;

  const workbookRels =
    `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="${NS_REL}/worksheet" Target="worksheets/sheet1.xml"/>` +
    `<Relationship Id="rId2" Type="${NS_REL}/styles" Target="styles.xml"/>` +
    `</Relationships>`;

  const zip = zipSync(
    {
      "[Content_Types].xml": strToU8(contentTypes),
      "_rels/.rels": strToU8(rels),
      "xl/workbook.xml": strToU8(workbook),
      "xl/_rels/workbook.xml.rels": strToU8(workbookRels),
      "xl/styles.xml": strToU8(STYLES),
      "xl/worksheets/sheet1.xml": strToU8(montarSheet(colunas, linhas)),
    },
    { level: 6 },
  );

  return zip;
}

/**
 * Monta um .xlsx e dispara o download. Uma aba só, cabeçalho em negrito e
 * congelado, largura das colunas ajustada ao conteúdo.
 */
export function baixarPlanilha({ arquivo, ...resto }: Planilha) {
  // cópia para um ArrayBuffer próprio: o Blob não aceita a view do fflate
  // quando ela compartilha buffer com outra alocação
  const blob = new Blob([new Uint8Array(montarXlsx(resto))], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${arquivo}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
