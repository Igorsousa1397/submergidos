import { createClient } from "@/lib/supabase/server";

export interface CheckinRow {
  id: string;
  nome: string;
  cpf: string | null;
  celula: string | null;
  sexo: "masculino" | "feminino" | null;
  status: "pago" | "pendente" | "pagar_depois" | "desistiu";
  chegou: boolean;
  checkin_at: string | null;
  onibus_id: string | null;
}

export interface OnibusInfo {
  id: string;
  identificacao: string;
  tipo: "masculino" | "feminino" | "servos" | null;
  capacidade: number | null;
  ocupacao: number; // encontristas já atribuídos a este ônibus
}

export interface CheckinData {
  encontristas: CheckinRow[];
  onibus: OnibusInfo[];
}

// Camada de leitura — Server-only.
// No check-in só entram os CONFIRMADOS de pagamento (pago / pagar_depois),
// espelhando STATUS_CONFIRMADOS_CHECKIN. Quem está pendente/desistiu não
// aparece na porta do evento.
export async function getCheckinData(): Promise<CheckinData> {
  const supabase = await createClient();

  const [encRes, onibusRes, ocupRes] = await Promise.all([
    supabase
      .from("encontristas")
      .select("id, nome, cpf, celula, sexo, status, chegou, checkin_at, onibus_id")
      .in("status", ["pago", "pagar_depois"])
      .order("nome", { ascending: true }),
    supabase
      .from("onibus")
      .select("id, identificacao, tipo, capacidade")
      .order("identificacao", { ascending: true }),
    // ocupação: todos os encontristas já atribuídos a algum ônibus
    supabase.from("encontristas").select("onibus_id").not("onibus_id", "is", null),
  ]);

  if (encRes.error) throw new Error(`Erro ao carregar check-in: ${encRes.error.message}`);
  if (onibusRes.error) throw new Error(`Erro ao carregar ônibus: ${onibusRes.error.message}`);

  // conta quantos encontristas cada ônibus já tem
  const ocupacaoPorOnibus = new Map<string, number>();
  for (const e of ocupRes.data ?? []) {
    if (!e.onibus_id) continue;
    ocupacaoPorOnibus.set(e.onibus_id, (ocupacaoPorOnibus.get(e.onibus_id) ?? 0) + 1);
  }

  const onibus: OnibusInfo[] = (onibusRes.data ?? []).map((o) => ({
    id: o.id,
    identificacao: o.identificacao,
    tipo: o.tipo,
    capacidade: o.capacidade,
    ocupacao: ocupacaoPorOnibus.get(o.id) ?? 0,
  }));

  return { encontristas: (encRes.data ?? []) as CheckinRow[], onibus };
}
