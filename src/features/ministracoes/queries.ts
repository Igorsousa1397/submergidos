import { createClient } from "@/lib/supabase/server";
import { formatarQuando, type MinistracaoRow } from "./shared";

// Cronograma das ministrações — leitura para qualquer usuário logado.
//
// Horário e ministrante saem da AGENDA quando a ministração está vinculada
// (agenda_id), para os dois cronogramas nunca mais divergirem. Sem vínculo,
// vale o texto livre gravado na própria ministração.
export async function getMinistracoes(): Promise<MinistracaoRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ministracoes")
    .select(
      "id, ordem, titulo, quando, ministrante, texto, base, citacao, tema, ato, direcao, agenda(dia, hora, ministrante)",
    )
    .order("ordem", { ascending: true });

  if (error) throw new Error(`Erro ao carregar ministrações: ${error.message}`);

  return (data ?? []).map(({ agenda, ...m }) => {
    const item = agenda as unknown as
      | { dia: string | null; hora: string | null; ministrante: string | null }
      | null;
    return {
      ...m,
      quando: (item && formatarQuando(item.dia, item.hora)) ?? m.quando,
      ministrante: item?.ministrante ?? m.ministrante,
    };
  });
}
