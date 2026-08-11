import { getTermos } from "@/features/termo/queries-admin";
import { TermoAdminView } from "@/features/termo/components/termo-admin-view";
import { exigirTela } from "@/lib/acesso";

// Server Component: busca no servidor (RLS aplicado), passa pro view client.
// Acesso: gestão ou tela "termo" concedida no Back Office.
export default async function TermosPage() {
  await exigirTela("termo");
  const termos = await getTermos();
  return <TermoAdminView termos={termos} />;
}
