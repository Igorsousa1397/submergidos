"use client";

import { useState } from "react";

// Campo de data em texto com máscara DD/MM/AAAA.
// Motivo: <input type="date"> no Safari do iPhone tem largura intrínseca
// própria e ignora o layout, quebrando o formulário (e ainda mostra o valor
// como "3 de jul. de 1999"). O app original também usava texto com máscara.
// Guarda/devolve o valor em ISO (YYYY-MM-DD), como o banco espera.

const isoParaBr = (iso: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
};

const mascara = (v: string) => {
  const d = v.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
};

// só devolve ISO quando a data está completa e é válida
const brParaIso = (br: string): string => {
  const m = br.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return "";
  const [, dd, mm, aaaa] = m;
  const dia = Number(dd);
  const mes = Number(mm);
  const ano = Number(aaaa);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return "";
  if (ano < 1900 || ano > new Date().getFullYear()) return "";
  const data = new Date(ano, mes - 1, dia);
  if (data.getMonth() !== mes - 1 || data.getDate() !== dia) return ""; // 31/02 etc.
  return `${aaaa}-${mm}-${dd}`;
};

export function InputData({
  value,
  onChange,
  className,
  placeholder = "DD/MM/AAAA",
}: {
  value: string; // ISO (YYYY-MM-DD) ou ""
  onChange: (iso: string) => void;
  className?: string;
  placeholder?: string;
}) {
  const [texto, setTexto] = useState(() => isoParaBr(value));

  return (
    <input
      // numérico no celular, sem virar campo nativo de data
      inputMode="numeric"
      autoComplete="bday"
      placeholder={placeholder}
      value={texto}
      onChange={(e) => {
        const t = mascara(e.target.value);
        setTexto(t);
        onChange(brParaIso(t)); // vazio enquanto incompleta/inválida
      }}
      className={className}
    />
  );
}
