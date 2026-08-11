import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";

export type AvisoPublico = Database["public"]["Enums"]["aviso_publico"];

export interface AvisoRow {
  id: string;
  texto: string;
  publico: AvisoPublico;
  created_at: string | null;
  autor: string | null; // nome do autor
  autorPerfil: string | null; // label do perfil do autor
}

export interface AvisosData {
  avisos: AvisoRow[];
  podeAvisos: boolean; // usuário logado pode publicar/excluir
}

// Todos os logados leem os avisos (o público vira pill, como no original —
// era usado para direcionar push, não para esconder da lista).
export async function getAvisosData(): Promise<AvisosData> {
  const supabase = await createClient();

  const [avisosRes, permRes] = await Promise.all([
    supabase
      .from("avisos")
      .select("id, texto, publico, created_at, profiles(nome, roles(nome))")
      .order("created_at", { ascending: false }),
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return false;
      const { data: perfil } = await supabase
        .from("profiles")
        .select("roles(pode_avisos)")
        .eq("id", user.id)
        .single();
      return (
        (perfil?.roles as unknown as { pode_avisos: boolean } | null)?.pode_avisos ?? false
      );
    }),
  ]);

  if (avisosRes.error) throw new Error(`Erro ao carregar avisos: ${avisosRes.error.message}`);

  const avisos: AvisoRow[] = (avisosRes.data ?? []).map((a) => {
    const autorRel = a.profiles as unknown as {
      nome: string;
      roles: { nome: string } | null;
    } | null;
    return {
      id: a.id,
      texto: a.texto,
      publico: a.publico,
      created_at: a.created_at,
      autor: autorRel?.nome ?? null,
      autorPerfil: autorRel?.roles?.nome ?? null,
    };
  });

  return { avisos, podeAvisos: permRes };
}
