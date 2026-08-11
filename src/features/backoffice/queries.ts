import { createClient } from "@/lib/supabase/server";
import { ordemBackOffice } from "./shared";

export interface EscalaItem {
  id: string; // id da linha em escalas (usado pra remover)
  dia: string;
  periodo: string | null; // "Almoço" | "Jantar" | null
  funcaoId: string;
  funcaoNome: string;
}

export interface UsuarioBack {
  id: string;
  nome: string;
  email: string | null;
  role: string;
  sexo: "masculino" | "feminino" | null;
  lider_celula: boolean;
  celula: string | null;
  telas_extra: string[];
  escalas: EscalaItem[];
}

export interface RoleBack {
  slug: string;
  nome: string;
  cor: string;
  is_sistema: boolean;
  telas: string[];
}

export interface FuncaoBack {
  id: string;
  nome: string;
  periodo: string | null; // 'almoco_jantar' = pede Almoço/Jantar
  is_sistema: boolean;
}

export interface BackOfficeData {
  usuarios: UsuarioBack[];
  roles: RoleBack[];
  funcoes: FuncaoBack[];
  liderMap: Record<string, string[]>; // overrides (app_config 'lider_map')
}

export async function getBackOfficeData(): Promise<BackOfficeData> {
  const supabase = await createClient();

  const [usersRes, escalasRes, rolesRes, funcoesRes, mapRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, nome, email, role, sexo, lider_celula, celula, telas_extra")
      .neq("role", "admin")
      .eq("ativo", true)
      .eq("aprovado", true)
      .eq("primeiro", false)
      .order("nome", { ascending: true }),
    supabase.from("escalas").select("id, servo_id, dia, periodo, funcoes(id, nome)"),
    supabase
      .from("roles")
      .select("slug, nome, cor, is_sistema, telas")
      .order("ordem", { ascending: true }),
    supabase
      .from("funcoes")
      .select("id, nome, periodo, is_sistema")
      .order("nome", { ascending: true }),
    supabase.from("app_config").select("value").eq("key", "lider_map").maybeSingle(),
  ]);

  if (usersRes.error) throw new Error(`Erro ao carregar usuários: ${usersRes.error.message}`);
  if (escalasRes.error) throw new Error(`Erro ao carregar escalas: ${escalasRes.error.message}`);

  const escalasPorServo = new Map<string, EscalaItem[]>();
  for (const e of escalasRes.data ?? []) {
    const fn = e.funcoes as unknown as { id: string; nome: string } | null;
    if (!fn) continue;
    const lista = escalasPorServo.get(e.servo_id) ?? [];
    lista.push({ id: e.id, dia: e.dia, periodo: e.periodo, funcaoId: fn.id, funcaoNome: fn.nome });
    escalasPorServo.set(e.servo_id, lista);
  }

  const usuarios: UsuarioBack[] = (usersRes.data ?? [])
    .map((u) => ({ ...u, escalas: escalasPorServo.get(u.id) ?? [] }))
    .sort(
      (a, b) =>
        ordemBackOffice(a.role) - ordemBackOffice(b.role) ||
        a.nome.localeCompare(b.nome, "pt-BR"),
    );

  return {
    usuarios,
    roles: (rolesRes.data ?? []).map((r) => ({ ...r, cor: r.cor ?? "#6b7280" })),
    funcoes: funcoesRes.data ?? [],
    liderMap: (mapRes.data?.value as Record<string, string[]> | null) ?? {},
  };
}
