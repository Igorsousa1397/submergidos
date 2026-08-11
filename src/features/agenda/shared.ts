// Constantes e helpers da agenda SEM imports de servidor.
// Importável tanto por Server quanto por Client Components — o queries.ts
// (que puxa next/headers via supabase/server) não pode entrar em client.

export const DIAS_AGENDA = ["quinta", "sexta", "sabado", "domingo"] as const;
export type DiaAgenda = (typeof DIAS_AGENDA)[number];

export const DIA_LABEL: Record<string, string> = {
  quinta: "Quinta",
  sexta: "Sexta",
  sabado: "Sábado",
  domingo: "Domingo",
};

export interface AgendaRow {
  id: string;
  dia: string | null;
  hora: string | null; // "HH:MM:SS"
  ordem: number | null;
  titulo: string;
  ministrante: string | null;
  descricao: string | null;
  aviso: string | null;
}

const ordemDia = (dia: string | null) => {
  const i = DIAS_AGENDA.indexOf((dia ?? "") as DiaAgenda);
  return i === -1 ? 99 : i;
};

// Ordena a programação: dia do encontro (quinta→domingo), depois hora.
export function ordenarAgenda(itens: AgendaRow[]): AgendaRow[] {
  return [...itens].sort(
    (a, b) =>
      ordemDia(a.dia) - ordemDia(b.dia) ||
      (a.hora ?? "99").localeCompare(b.hora ?? "99") ||
      (a.ordem ?? 0) - (b.ordem ?? 0),
  );
}
