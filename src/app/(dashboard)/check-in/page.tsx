import { getCheckinData } from "@/features/checkin/queries";
import { CheckinView } from "@/features/checkin/components/checkin-view";
import { exigirTela } from "@/lib/acesso";

// Server Component: busca no servidor (RLS aplicado), passa pro view client.
// Acesso: admin/líder geral ou tela "checkin" liberada no perfil (Back Office).
export default async function CheckinPage() {
  await exigirTela("checkin");
  const { encontristas, onibus } = await getCheckinData();
  return <CheckinView encontristas={encontristas} onibus={onibus} />;
}
