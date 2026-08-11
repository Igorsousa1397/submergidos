import { getAchados } from "@/features/achados/queries";
import { AchadosView } from "@/features/achados/components/achados-view";
import { exigirTela } from "@/lib/acesso";

// Achados & Perdidos: acesso pela tela "achados" liberada no perfil
// (Back Office). Quem acha registra, quem entrega marca; excluir é admin.
export default async function AchadosPage() {
  const { admin } = await exigirTela("achados");
  const achados = await getAchados();
  return <AchadosView achados={achados} admin={admin} />;
}
