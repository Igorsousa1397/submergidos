// Tipo da ministração — sem imports de servidor, para poder entrar em
// Client Components (mesmo padrão da agenda).
export interface MinistracaoRow {
  id: string;
  ordem: number;
  titulo: string;
  quando: string | null;
  ministrante: string | null;
  texto: string | null;
  base: string | null;
  citacao: string | null;
  tema: string | null;
  ato: string | null;
  direcao: string | null;
}
