import { getServosData } from "@/features/servos/queries";
import { ServosView } from "@/features/servos/components/servos-view";
import { exigirTela } from "@/lib/acesso";

// Server Component: busca no servidor (RLS aplicado), passa pro view client.
// Acesso: gestão ou tela "servos" concedida no Back Office.
export default async function ServosPage() {
  const { admin } = await exigirTela("servos");
  const { servos, roles, dataLimitePagamento } = await getServosData();

  return (
    <ServosView
      servos={servos}
      roles={roles}
      dataLimitePagamento={dataLimitePagamento}
      admin={admin}
    />
  );
}
