import type { RoleSlug } from "@/lib/constants";

// Espelha as flags da tabela `roles` para os perfis de SISTEMA (fast-path no client).
// Perfis EXTRAS criados em runtime: leia as flags direto da tabela `roles`.

export const ISENTOS_PAGAMENTO: RoleSlug[] = [
  "pastor",
  "pastor_auxiliar",
  "lider_geral",
];

export const PODE_ENVIAR_AVISOS: RoleSlug[] = [
  "admin",
  "lider_geral",
  "pastor",
  "pastor_auxiliar",
  "lider_staff",
  "lider_templo",
];

export const isAdmin = (role: string): boolean =>
  role === "admin" || role === "lider_geral";

// Quem usa o shell/telas de GESTÃO (regra do original: os demais perfis
// caem no shell de servo, com home e menu próprios).
export const isGestao = (role: string): boolean =>
  role === "admin" || role === "lider_geral" || role === "pastor";

// Permissão de tela: gestão vê tudo; os demais dependem das telas do perfil
// (roles.telas) ou das telas extras individuais (profiles.telas_extra),
// concedidas no Back Office — porta do temPermissao do original.
export const podeVerTela = (
  tela: string,
  role: string,
  telasRole: string[],
  telasExtra: string[],
): boolean => isGestao(role) || telasRole.includes(tela) || telasExtra.includes(tela);

export const isIsento = (role: string): boolean =>
  ISENTOS_PAGAMENTO.includes(role as RoleSlug);

export const podeEnviarAvisos = (role: string): boolean =>
  PODE_ENVIAR_AVISOS.includes(role as RoleSlug);

export const podeGerenciarQuartos = (role: string): boolean =>
  isAdmin(role) || role === "lider_quartos";

export const podeGerenciarCartas = (role: string): boolean =>
  isAdmin(role) || role === "lider_cartas";
