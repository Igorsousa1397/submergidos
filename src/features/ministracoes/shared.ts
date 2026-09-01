import { DIA_LABEL } from "@/features/agenda/shared";

// Tipo da ministração — sem imports de servidor, para poder entrar em
// Client Components (mesmo padrão da agenda).
//
// `quando` e `ministrante` já chegam RESOLVIDOS do queries.ts: quando a
// ministração está vinculada a um item da agenda, vêm de lá; senão caem
// no texto livre da própria tabela.
export interface MinistracaoRow {
  id: string;
  ordem: number;
  titulo: string;
  quando: string | null;
  ministrante: string | null;
  texto: string | null;
  base: string | null;
  citacao: string | null;
  tema: string | null;
  ato: string | null;
  direcao: string | null;
}

// Monta o "quando" no estilo do cronograma da pastora a partir do item da
// agenda: sabado + 11:00 -> "Sábado — 11h"; sabado + 09:30 -> "Sábado — 9h30".
export function formatarQuando(dia: string | null, hora: string | null): string | null {
  const label = DIA_LABEL[dia ?? ""] ?? dia;
  if (!label) return null;
  if (!hora) return label;
  const [h, m] = hora.split(":");
  const horaFmt = Number(m) === 0 ? `${Number(h)}h` : `${Number(h)}h${m}`;
  return `${label} — ${horaFmt}`;
}
