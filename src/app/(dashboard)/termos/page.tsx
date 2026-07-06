import { getTermos } from "@/features/termo/queries-admin";
import { TermoAdminView } from "@/features/termo/components/termo-admin-view";

// Server Component: busca no servidor (RLS aplicado), passa pro view client.
export default async function TermosPage() {
  const termos = await getTermos();
  return <TermoAdminView termos={termos} />;
}