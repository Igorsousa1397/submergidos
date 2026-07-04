// Listas usadas no formulário público de inscrição.
// Ficam aqui (e não no banco) porque o usuário anônimo não tem permissão
// de leitura nas tabelas — a inscrição é a única superfície pública de escrita.

export const IGREJAS = [
  "Fonte Cajamar",
  "Fonte Itajaí",
  "Fonte Barueri",
  "Outra",
] as const;

export const TAMANHOS_CAMISETA = [
  "P",
  "M",
  "G",
  "GG",
  "EXG",
  "G1",
  "G2",
  "G3",
] as const;

export const CELULAS = [
  "A Forja",
  "Atos 29",
  "Baluarte",
  "Barueri",
  "Beraká",
  "Betel",
  "Betesda",
  "Carta Viva",
  "Deus Forte",
  "Ebenézer",
  "Ekballo",
  "Ekklesia",
  "Emaús",
  "Essência",
  "Fire",
  "Gileade",
  "Identidade",
  "Jeova Rafah",
  "Kerygma",
  "Lavi",
  "Luz do mundo",
  "Nahal",
  "Pedra Angular",
  "Peniel - Santa Catarina",
  "Reobote",
  "Transbordo",
  "Yeshua",
  "Outra",
  "Não tenho célula",
] as const;
