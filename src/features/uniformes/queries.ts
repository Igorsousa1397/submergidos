import { createClient } from "@/lib/supabase/server";

export interface UniformeRow {
  servo_id: string;
  nao_quer: boolean;
  nome_camiseta: string | null;
  camisa: string | null;
  qtd_camisas: number;
  calca: string | null;
  qtd_calcas: number;
  blusa: string | null;
  qtd_blusas: number;
  valor_total: number;
  status: string; // bloqueado | pendente | aberto
  pago_sinal: boolean;
  pago_integral: boolean;
  atualizado_em: string | null;
  nome: string; // do profile
  role: string;
}

export interface UniformesConfig {
  data_limite: string | null;
  data_limite_pedido: string | null;
  data_limite_restante: string | null;
}

export interface UniformesData {
  pedidos: UniformeRow[];
  config: UniformesConfig;
}

export async function getUniformesData(): Promise<UniformesData> {
  const supabase = await createClient();

  const [pedidosRes, configRes] = await Promise.all([
    supabase
      .from("uniformes")
      .select("*, profiles(nome, role)"),
    supabase.from("app_config").select("value").eq("key", "uniformes").maybeSingle(),
  ]);

  if (pedidosRes.error)
    throw new Error(`Erro ao carregar uniformes: ${pedidosRes.error.message}`);

  const pedidos: UniformeRow[] = (pedidosRes.data ?? [])
    .map((p) => {
      const perfil = p.profiles as unknown as { nome: string; role: string } | null;
      return {
        servo_id: p.servo_id,
        nao_quer: p.nao_quer,
        nome_camiseta: p.nome_camiseta,
        camisa: p.camisa,
        qtd_camisas: p.qtd_camisas,
        calca: p.calca,
        qtd_calcas: p.qtd_calcas,
        blusa: p.blusa,
        qtd_blusas: p.qtd_blusas,
        valor_total: Number(p.valor_total),
        status: p.status,
        pago_sinal: p.pago_sinal,
        pago_integral: p.pago_integral,
        atualizado_em: p.atualizado_em,
        nome: perfil?.nome ?? "—",
        role: perfil?.role ?? "servo",
      };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const cfg = (configRes.data?.value as Partial<UniformesConfig> | null) ?? {};

  return {
    pedidos,
    config: {
      data_limite: cfg.data_limite ?? null,
      data_limite_pedido: cfg.data_limite_pedido ?? null,
      data_limite_restante: cfg.data_limite_restante ?? null,
    },
  };
}
