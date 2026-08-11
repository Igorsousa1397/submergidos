import { createClient } from "@/lib/supabase/server";

export interface SaudeEncontrista {
  id: string;
  nome: string;
  celula: string | null;
  quarto: string | null; // número do quarto, se alocado
  medicamento: string | null;
  doenca_cronica: string | null;
  emergencia: string | null;
}

export interface RegistroSaude {
  id: string;
  nome: string;
  quarto: string | null;
  condicao: string;
  obs: string | null;
  criado_por_nome: string | null;
  created_at: string | null;
}

export interface SaudeData {
  encontristas: SaudeEncontrista[];
  registros: RegistroSaude[];
}

// valores que significam "nada declarado" na inscrição
const semInfo = (v: string | null) => {
  const s = (v ?? "").trim().toLowerCase();
  return s === "" || s === "não" || s === "nao" || s === "nenhum" || s === "nenhuma" || s === "-";
};

export async function getSaudeData(): Promise<SaudeData> {
  const supabase = await createClient();

  const [encRes, quartoEncRes, registrosRes] = await Promise.all([
    supabase
      .from("encontristas")
      .select("id, nome, celula, medicamento, doenca_cronica, emergencia")
      .neq("status", "desistiu")
      .order("nome", { ascending: true }),
    supabase.from("quarto_encontristas").select("encontrista_id, quartos(numero, is_maes)"),
    supabase
      .from("saude_registros")
      .select("id, nome, quarto, condicao, obs, created_at, profiles(nome)")
      .order("created_at", { ascending: false }),
  ]);

  if (encRes.error) throw new Error(`Erro ao carregar encontristas: ${encRes.error.message}`);

  const quartoPorEnc = new Map<string, string>();
  for (const q of quartoEncRes.data ?? []) {
    const quarto = q.quartos as unknown as { numero: string; is_maes: boolean } | null;
    if (quarto)
      quartoPorEnc.set(q.encontrista_id, quarto.is_maes ? "Mães" : quarto.numero);
  }

  // só quem declarou medicamento ou doença crônica na inscrição
  const encontristas: SaudeEncontrista[] = (encRes.data ?? [])
    .filter((e) => !semInfo(e.medicamento) || !semInfo(e.doenca_cronica))
    .map((e) => ({
      id: e.id,
      nome: e.nome,
      celula: e.celula,
      quarto: quartoPorEnc.get(e.id) ?? null,
      medicamento: semInfo(e.medicamento) ? null : e.medicamento,
      doenca_cronica: semInfo(e.doenca_cronica) ? null : e.doenca_cronica,
      emergencia: e.emergencia,
    }));

  const registros: RegistroSaude[] = (registrosRes.data ?? []).map((r) => ({
    id: r.id,
    nome: r.nome,
    quarto: r.quarto,
    condicao: r.condicao,
    obs: r.obs,
    criado_por_nome: (r.profiles as unknown as { nome: string } | null)?.nome ?? null,
    created_at: r.created_at,
  }));

  return { encontristas, registros };
}
