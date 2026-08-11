import { getOcorrencias } from "@/features/ocorrencias/queries";
import { OcorrenciasView } from "@/features/ocorrencias/components/ocorrencias-view";

// Ocorrências: tela aberta a todos os logados — qualquer servo registra
// e resolve (regra do original; o layout já garante o login).
export default async function OcorrenciasPage() {
  const ocorrencias = await getOcorrencias();
  return <OcorrenciasView ocorrencias={ocorrencias} />;
}
