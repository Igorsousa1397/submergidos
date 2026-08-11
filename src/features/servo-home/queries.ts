import { createClient } from "@/lib/supabase/server";

export interface AgendaItem {
  id: string;
  dia: string | null;
  titulo: string;
  ministrante: string | null;
  descricao: string | null;
  aviso: string | null;
}

export interface EscalaItem {
  dia: string;
  periodo: string | null;
  funcao: string;
}

export interface ServoHomeData {
  ocorrencias: number;
  quartos: number;
  agenda: AgendaItem[];
  escalas: EscalaItem[];
}

// Home do servo — contadores + agenda publicada + escalas DO próprio servo.
export async function getServoHome(userId: string): Promise<ServoHomeData> {
  const supabase = await createClient();

  const [ocorr, quartos, agendaRes, escalasRes] = await Promise.all([
    supabase.from("ocorrencias").select("id", { count: "exact", head: true }),
    supabase.from("quartos").select("id", { count: "exact", head: true }),
    supabase
      .from("agenda")
      .select("id, dia, titulo, ministrante, descricao, aviso")
      .order("ordem", { ascending: true }),
    supabase
      .from("escalas")
      .select("dia, periodo, funcoes(nome)")
      .eq("servo_id", userId),
  ]);

  const escalas: EscalaItem[] = (escalasRes.data ?? []).map((e) => ({
    dia: e.dia,
    periodo: e.periodo,
    // relação por FK única vem como objeto
    funcao: (e.funcoes as unknown as { nome: string } | null)?.nome ?? "—",
  }));

  return {
    ocorrencias: ocorr.count ?? 0,
    quartos: quartos.count ?? 0,
    agenda: agendaRes.data ?? [],
    escalas,
  };
}
