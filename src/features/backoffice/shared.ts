// Constantes do Back Office SEM imports de servidor (client-safe).

// Dias do encontro (as escalas cobrem quinta→domingo, como no original).
export const DIAS_ESCALA = ["quinta", "sexta", "sabado", "domingo"] as const;
export type DiaEscala = (typeof DIAS_ESCALA)[number];

export const DIA_ESCALA_LABEL: Record<string, string> = {
  quinta: "Quinta",
  sexta: "Sexta",
  sabado: "Sábado",
  domingo: "Domingo",
};

// cores por dia (paleta do original)
export const DIA_ESCALA_COR: Record<string, string> = {
  quinta: "#ff6b35",
  sexta: "#bf5af2",
  sabado: "#12b5a6",
  domingo: "#ff9f0a",
};

// Funções que pedem PERÍODO. `funcoes.periodo` guarda o TIPO do conjunto
// (não o período em si) e cada escala guarda o período escolhido — por isso
// dá para o Refeitório perguntar Almoço/Jantar e o Banheiro perguntar
// Manhã/Tarde/Noite usando o mesmo mecanismo.
export const TIPOS_PERIODO: Record<string, { label: string; opcoes: string[] }> = {
  almoco_jantar: { label: "Almoço/Jantar", opcoes: ["Almoço", "Jantar"] },
  manha_tarde_noite: { label: "Manhã/Tarde/Noite", opcoes: ["Manhã", "Tarde", "Noite"] },
};

/** Períodos que a função pede, ou null quando ela não pede nenhum. */
export const periodosDaFuncao = (tipo: string | null | undefined): string[] | null =>
  (tipo && TIPOS_PERIODO[tipo]?.opcoes) || null;

// Catálogo de telas controláveis por permissão. São as telas de GESTÃO já
// construídas — as demais (check-in, quartos, avisos, agenda da home) são
// abertas a todos os logados e não precisam de toggle.
export const TELAS: { id: string; label: string; href: string }[] = [
  { id: "servos", label: "Servos", href: "/servos" },
  { id: "enc", label: "Encontristas", href: "/encontristas" },
  { id: "checkin", label: "Check-in", href: "/check-in" },
  { id: "termo", label: "Termo", href: "/termos" },
  { id: "quartos", label: "Quartos", href: "/quartos" },
  { id: "onibus", label: "Ônibus", href: "/onibus" },
  { id: "agenda", label: "Agenda (gestão)", href: "/agenda" },
  { id: "achados", label: "Achados & Perdidos", href: "/achados" },
  // dado sensível: conceder só à equipe de saúde (o RLS também respeita)
  { id: "saude", label: "Saúde", href: "/saude" },
  // equipe de mídia (quem NÃO autorizou uso de imagem)
  { id: "img", label: "Uso de Imagem", href: "/uso-imagem" },
];

// Telas que TODO usuário logado enxerga — não entram no catálogo porque
// não fazem sentido restringir (são o mínimo do dia a dia do servo).
// Espelha as `telasFixas` do original: agenda/home, avisos, uniforme,
// ocorrências — mais o próprio perfil.
export const TELAS_FIXAS = ["/dashboard", "/perfil", "/avisos", "/ocorrencias"];

// Mapa padrão função → perfis líderes responsáveis (portado do original).
// Overrides ficam em app_config key='lider_map'; fallback final: lider_staff.
export const LIDER_MAP_DEFAULT: Record<string, string[]> = {
  Intercessão: ["lider_geral"],
  Malas: ["lider_geral"],
  Refeitório: ["lider_geral"],
  Cantina: ["lider_geral"],
  Louças: ["lider_geral"],
  "Servir Ceia": ["lider_geral"],
  Panelas: ["lider_geral"],
  "Kit Sobrevivência": ["lider_geral"],
  "Etiquetar Sacolas": ["lider_geral"],
  "Dobrar Sacolas": ["lider_geral"],
  "Organizar itens do Templo": ["lider_geral"],
  Cozinha: ["lider_geral"],
  "Check-in": ["lider_geral"],
  Quartos: ["lider_geral", "lider_quartos"],
  "Organizar itens STAFF": ["lider_staff", "lider_geral"],
  Cartas: ["lider_geral", "lider_cartas"],
  "Preparação da Uva": ["lider_geral", "lider_cartas"],
  Decoração: ["lider_geral", "lider_cartas"],
  "Recepção Presentes/cartas": ["lider_geral", "lider_cartas"],
  Correrias: ["lider_geral"],
  "Transitar com carro no sítio": ["lider_geral"],
  "Montagem da cruz": ["lider_geral", "lider_templo"],
  "Servo de Quarto": ["lider_geral", "lider_quartos"],
  Templo: ["lider_geral", "lider_templo"],
  Mídia: ["lider_midia"],
  "Presentes/Cartas": ["lider_geral", "lider_cartas"],
  Banheiro: ["lider_staff", "lider_geral"],
  Camisetas: ["lider_staff", "lider_geral"],
  "Servir comida": ["lider_staff", "lider_geral"],
  "Limpeza refeitório": ["lider_staff", "lider_geral"],
  "Kit Cartas+Pecado": ["lider_staff", "lider_geral"],
  Som: ["lider_staff"],
  "Itens Teatro/Dança": ["lider_staff"],
};

// Ordenação da lista de usuários no Back Office (diferente da tela de Servos!)
export const ordemBackOffice = (role: string) => {
  if (role === "pastor") return 0;
  if (role === "pastor_auxiliar") return 1;
  if (role === "lider_geral") return 2;
  if (role.startsWith("lider_")) return 3;
  if (role === "servo") return 4;
  if (role === "cozinha") return 5;
  if (role === "staff") return 6;
  return 7;
};
