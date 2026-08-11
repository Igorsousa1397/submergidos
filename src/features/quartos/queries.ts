import { createClient } from "@/lib/supabase/server";

export type Genero = "masculino" | "feminino";

export interface Ocupante {
  id: string; // id do profile (servo) ou do encontrista
  nome: string;
  camiseta?: string | null; // só encontristas (usado no export)
}

export interface QuartoRow {
  id: string;
  numero: string;
  genero: Genero;
  is_maes: boolean;
  limite_encontristas: number;
  limite_servos: number;
  servos: Ocupante[];
  encontristas: Ocupante[];
}

export interface PessoaOption {
  id: string;
  nome: string;
  sexo: Genero | null;
}

export interface QuartosData {
  quartos: QuartoRow[];
  // elegíveis ainda NÃO alocados em nenhum quarto:
  servosDisponiveis: PessoaOption[]; // profiles ativos (menos admin)
  encontristasDisponiveis: PessoaOption[]; // só quem já fez check-in (chegou)
}

// Camada de leitura — Server-only.
export async function getQuartosData(): Promise<QuartosData> {
  const supabase = await createClient();

  const [quartosRes, qServosRes, qEncRes, servosRes, encRes] = await Promise.all([
    supabase
      .from("quartos")
      .select("id, numero, genero, is_maes, limite_encontristas, limite_servos")
      .order("numero", { ascending: true }),
    supabase.from("quarto_servos").select("quarto_id, servo_id, profiles(nome)"),
    supabase
      .from("quarto_encontristas")
      .select("quarto_id, encontrista_id, encontristas(nome, camiseta)"),
    supabase
      .from("profiles")
      .select("id, nome, sexo")
      .neq("role", "admin")
      .eq("ativo", true)
      .order("nome", { ascending: true }),
    // regra do original: só entra no quarto quem já fez CHECK-IN
    supabase
      .from("encontristas")
      .select("id, nome, sexo")
      .eq("chegou", true)
      .order("nome", { ascending: true }),
  ]);

  if (quartosRes.error) throw new Error(`Erro ao carregar quartos: ${quartosRes.error.message}`);

  const nomeRel = (rel: unknown) => (rel as { nome: string } | null)?.nome ?? "—";

  const servosPorQuarto = new Map<string, Ocupante[]>();
  const servosAlocados = new Set<string>();
  for (const r of qServosRes.data ?? []) {
    const lista = servosPorQuarto.get(r.quarto_id) ?? [];
    lista.push({ id: r.servo_id, nome: nomeRel(r.profiles) });
    servosPorQuarto.set(r.quarto_id, lista);
    servosAlocados.add(r.servo_id);
  }

  const encPorQuarto = new Map<string, Ocupante[]>();
  const encAlocados = new Set<string>();
  for (const r of qEncRes.data ?? []) {
    const lista = encPorQuarto.get(r.quarto_id) ?? [];
    const rel = r.encontristas as unknown as { nome: string; camiseta: string | null } | null;
    lista.push({ id: r.encontrista_id, nome: rel?.nome ?? "—", camiseta: rel?.camiseta ?? null });
    encPorQuarto.set(r.quarto_id, lista);
    encAlocados.add(r.encontrista_id);
  }

  const ordenar = (a: Ocupante, b: Ocupante) => a.nome.localeCompare(b.nome, "pt-BR");

  const quartos: QuartoRow[] = (quartosRes.data ?? []).map((q) => ({
    ...q,
    servos: (servosPorQuarto.get(q.id) ?? []).sort(ordenar),
    encontristas: (encPorQuarto.get(q.id) ?? []).sort(ordenar),
  }));

  return {
    quartos,
    servosDisponiveis: (servosRes.data ?? []).filter((s) => !servosAlocados.has(s.id)),
    encontristasDisponiveis: (encRes.data ?? []).filter((e) => !encAlocados.has(e.id)),
  };
}
