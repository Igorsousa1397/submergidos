import type { CSSProperties } from "react";

// ============================================================
//  Kit de estilo — espelha o objeto G e os helpers I/BG/BK do
//  projeto original (Encontro com Deus), trocando APENAS as cores
//  pela identidade do Submergidos. Isso permite portar as telas
//  de forma quase 1:1 (mesma estrutura/inline-styles), mudando só
//  a camada de dados (Firebase → Supabase).
//
//  Mapeamento de cores (original → Submergidos):
//    bg     #0a0a0a → #00060f (abismo)
//    green  #00c851 → #146997 (mar, marca)  · ações primárias
//    card   #161616 → #03213b (profundo)
//    cb     #222    → #063d64 (oceano)
//    t      #fff    → #dcf1f8 (luz)
// ============================================================

export const G = {
  bg: "#00060f", // abismo
  brand: "#146997", // mar — ações primárias (era o "green")
  brandFg: "#ffffff", // texto sobre a marca (era #000 sobre o verde)
  ok: "#12b5a6", // confirmações / positivo
  card: "#03213b", // profundo
  cb: "#063d64", // oceano (borda de card)
  input: "#000e21", // breu (fundo de input)
  t: "#dcf1f8", // luz
  td: "rgba(220,241,248,.6)", // texto secundário
  tm: "rgba(164,214,232,.4)", // texto fraco (raso translúcido)
  aviso: "#e0a23c",
  avisoFg: "#7a5410",
  alerta: "#e5564e",
};

export const I: CSSProperties = {
  background: G.input,
  border: `1px solid ${G.cb}`,
  borderRadius: 12,
  padding: "13px 15px",
  color: G.t,
  fontSize: 16,
  width: "100%",
  outline: "none",
};

export const BG = (x: CSSProperties = {}): CSSProperties => ({
  background: G.brand,
  color: G.brandFg,
  border: "none",
  borderRadius: 12,
  padding: "13px 18px",
  fontSize: 16,
  fontWeight: 700,
  cursor: "pointer",
  ...x,
});

export const BK = (x: CSSProperties = {}): CSSProperties => ({
  background: "transparent",
  border: `1px solid ${G.cb}`,
  color: G.td,
  borderRadius: 12,
  padding: "11px 15px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
  ...x,
});
