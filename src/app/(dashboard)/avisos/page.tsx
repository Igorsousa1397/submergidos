import { getAvisosData } from "@/features/avisos/queries";
import { AvisosView } from "@/features/avisos/components/avisos-view";

// Avisos: todos os logados leem; publica/exclui quem tem roles.pode_avisos
// (admin, líder geral, pastores, líder staff, líder templo — como no original).
export default async function AvisosPage() {
  const { avisos, podeAvisos } = await getAvisosData();
  return <AvisosView avisos={avisos} podeAvisos={podeAvisos} />;
}
