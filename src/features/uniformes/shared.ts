// Constantes de uniformes SEM imports de servidor (client-safe).
// Preços num único lugar — no original estavam duplicados em dois
// componentes (precoItem e precoItemFn).

export const TAMANHOS_UNIFORME = ["P", "M", "G", "GG", "G1", "G2", "G3"] as const;
export type TamanhoUniforme = (typeof TAMANHOS_UNIFORME)[number];

export type ItemUniforme = "camisa" | "calca" | "blusa";

export const ITEM_LABEL: Record<ItemUniforme, string> = {
  camisa: "Camiseta",
  calca: "Calça",
  blusa: "Blusa de Frio",
};

// tamanhos grandes (G1+) têm acréscimo
const GRANDES = ["G1", "G2", "G3"];

export function precoItem(item: ItemUniforme, tamanho: string): number {
  const grande = GRANDES.includes(tamanho);
  if (item === "camisa") return grande ? 47 : 43;
  if (item === "blusa") return grande ? 115 : 105;
  return grande ? 90 : 80; // calça
}

export interface PedidoUniforme {
  nome_camiseta: string | null;
  camisa: string | null;
  qtd_camisas: number;
  calca: string | null;
  qtd_calcas: number;
  blusa: string | null;
  qtd_blusas: number;
}

export function totalPedido(p: PedidoUniforme): number {
  let total = 0;
  if (p.camisa) total += precoItem("camisa", p.camisa) * (p.qtd_camisas || 1);
  if (p.calca) total += precoItem("calca", p.calca) * (p.qtd_calcas || 1);
  if (p.blusa) total += precoItem("blusa", p.blusa) * (p.qtd_blusas || 1);
  return total;
}

export const brl = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
