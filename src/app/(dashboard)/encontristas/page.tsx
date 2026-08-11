import { getEncontristas, getCelulas } from "@/features/encontristas/queries";
import { inscricoesBloqueadas } from "@/features/inscricoes/config";
import { exigirTela } from "@/lib/acesso";
import {
  EncontristasView,
  type EncRow,
  type Celula,
} from "@/features/encontristas/components/encontristas-view";

// Server Component: busca no servidor (RLS aplicado), passa pro view client.
// Acesso: gestão ou tela "enc" concedida no Back Office.
export default async function EncontristasPage() {
  const { admin } = await exigirTela("enc");
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
      admin={admin}
    />
  );
}
