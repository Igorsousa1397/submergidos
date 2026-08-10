import { createClient } from "@/lib/supabase/server";

export type OnibusTipo = "feminino" | "masculino" | "servos";
export type OnibusPapel = "responsavel" | "servo_templo";

export interface EquipeMembro {
  servo_id: string;
  nome: string;
  papel: OnibusPapel;
}

export interface PassageiroInfo {
  id: string;
  nome: string;
}

export interface OnibusRow {
  id: string;
  identificacao: string;
  tipo: OnibusTipo | null;
  malas: OnibusTipo | null;
  capacidade: number | null;
  equipe: EquipeMembro[];
  passageiros: PassageiroInfo[]; // encontristas atribuídos via check-in
}

export interface ServoOption {
  id: string;
  nome: string;
}

export interface OnibusData {
  onibus: OnibusRow[];
  servos: ServoOption[]; // profiles ativos, para os pickers de equipe
}

// Camada de leitura — Server-only.
export async function getOnibusData(): Promise<OnibusData> {
  const supabase = await createClient();

  const [onibusRes, equipeRes, passRes, servosRes] = await Promise.all([
    supabase
      .from("onibus")
      .select("id, identificacao, tipo, malas, capacidade")
      .order("identificacao", { ascending: true }),
    supabase
      .from("onibus_equipe")
      .select("onibus_id, servo_id, papel, profiles(nome)"),
    supabase
      .from("encontristas")
      .select("id, nome, onibus_id")
      .not("onibus_id", "is", null)
      .order("nome", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, nome")
      .eq("ativo", true)
      .order("nome", { ascending: true }),
  ]);

  if (onibusRes.error) throw new Error(`Erro ao carregar ônibus: ${onibusRes.error.message}`);
  if (equipeRes.error) throw new Error(`Erro ao carregar equipe: ${equipeRes.error.message}`);

  // agrupa equipe e passageiros por ônibus
  const equipePorOnibus = new Map<string, EquipeMembro[]>();
  for (const e of equipeRes.data ?? []) {
    const lista = equipePorOnibus.get(e.onibus_id) ?? [];
    lista.push({
      servo_id: e.servo_id,
      papel: e.papel as OnibusPapel,
      // relação profiles vem como objeto (FK única)
      nome: (e.profiles as unknown as { nome: string } | null)?.nome ?? "—",
    });
    equipePorOnibus.set(e.onibus_id, lista);
  }

  const passPorOnibus = new Map<string, PassageiroInfo[]>();
  for (const p of passRes.data ?? []) {
    if (!p.onibus_id) continue;
    const lista = passPorOnibus.get(p.onibus_id) ?? [];
    lista.push({ id: p.id, nome: p.nome });
    passPorOnibus.set(p.onibus_id, lista);
  }

  const onibus: OnibusRow[] = (onibusRes.data ?? []).map((o) => ({
    id: o.id,
    identificacao: o.identificacao,
    tipo: o.tipo,
    malas: o.malas,
    capacidade: o.capacidade,
    equipe: equipePorOnibus.get(o.id) ?? [],
    passageiros: passPorOnibus.get(o.id) ?? [],
  }));

  return { onibus, servos: servosRes.data ?? [] };
}
