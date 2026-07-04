// Aliases de enums do banco, num arquivo separado do database.types.ts.
// Motivo: `npm run gen:types` sobrescreve o database.types.ts inteiro e
// remove qualquer export manual. Mantendo os aliases aqui, eles sobrevivem
// à regeneração. Todo o app importa EncontristaStatus e Sexo DESTE arquivo.
import type { Enums } from "@/lib/database.types";

export type EncontristaStatus = Enums<"encontrista_status">;
export type Sexo = Enums<"sexo">;