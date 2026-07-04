import type { EncontristaStatus, Sexo } from "@/lib/database.types";

export type RoleSlug =
  | "admin"
  | "lider_geral"
  | "pastor"
  | "pastor_auxiliar"
  | "lider_staff"
  | "lider_templo"
  | "lider_quartos"
  | "lider_midia"
  | "lider_cartas"
  | "lider_celula"
  | "cozinha"
  | "staff"
  | "servo";

// Rótulos e cores de status do encontrista (UI).
export const STATUS_ENCONTRISTA: Record<
  EncontristaStatus,
  { label: string; cor: string; bg: string }
> = {
  pago: { label: "Pago", cor: "text-emerald-700", bg: "bg-emerald-100" },
  pagar_depois: { label: "Pagar depois", cor: "text-amber-700", bg: "bg-amber-100" },
  desistiu: { label: "Desistiu", cor: "text-gray-600", bg: "bg-gray-200" },
  pendente: { label: "Pendente", cor: "text-red-700", bg: "bg-red-100" },
};

export const SEXO_LABEL: Record<Sexo, string> = {
  masculino: "Masculino",
  feminino: "Feminino",
};

export const DIAS = ["sexta", "sabado", "domingo"] as const;

// "Pagar depois" conta como confirmado no check-in / QR Code / termo.
export const STATUS_CONFIRMADOS_CHECKIN: EncontristaStatus[] = [
  "pago",
  "pagar_depois",
];

// Regra de escala: Servo de Quarto não acumula com estas funções.
export const FUNCOES_EXCLUSIVAS_QUARTO = ["Templo", "Som", "Cozinha"];
