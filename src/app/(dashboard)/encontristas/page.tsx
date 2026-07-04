import { getEncontristas, getCelulas } from "@/features/encontristas/queries";
import { inscricoesBloqueadas } from "@/features/inscricoes/config";
import {
  EncontristasView,
  type EncRow,
  type Celula,
} from "@/features/encontristas/components/encontristas-view";

// Server Component: busca no servidor (RLS aplicado), passa pro view client.
export default async function EncontristasPage() {
  const [encontristas, celulas, bloqueadas] = await Promise.all([
    getEncontristas(),
    getCelulas(),
    inscricoesBloqueadas(),
  ]);

  return (
    <EncontristasView
      encontristas={encontristas as EncRow[]}
      celulas={celulas as Celula[]}
      inscricoesBloqueadas={bloqueadas}
    />
  );
}
