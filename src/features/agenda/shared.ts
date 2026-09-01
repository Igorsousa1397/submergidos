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

// A madrugada pertence à noite anterior: o jantar de 00h30 vem DEPOIS da
// ministração das 23h de sexta, não antes da chegada das 19h30. Horas antes
// das 05:00 somam 24h só na ordenação (o valor exibido continua o mesmo).
const ordemHora = (hora: string | null) => {
  if (!hora) return 99999; // sem hora vai pro fim do dia
  const [h, m] = hora.split(":").map(Number);
  const min = h * 60 + m;
  return min < 5 * 60 ? min + 24 * 60 : min;
};

// Ordena a programação: dia do encontro (quinta→domingo), depois hora.
export function ordenarAgenda(itens: AgendaRow[]): AgendaRow[] {
  return [...itens].sort(
    (a, b) =>
      ordemDia(a.dia) - ordemDia(b.dia) ||
      ordemHora(a.hora) - ordemHora(b.hora) ||
      (a.ordem ?? 0) - (b.ordem ?? 0),
  );
}
