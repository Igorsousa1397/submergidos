import { getOnibusData } from "@/features/onibus/queries";
import { OnibusView } from "@/features/onibus/components/onibus-view";
import { exigirTela } from "@/lib/acesso";

// Server Component: busca no servidor (RLS aplicado), passa pro view client.
// Acesso: gestão ou tela "onibus" concedida no Back Office.
export default async function OnibusPage() {
  const { admin } = await exigirTela("onibus");
  const { onibus, servos } = await getOnibusData();

  return <OnibusView onibus={onibus} servos={servos} admin={admin} />;
}
