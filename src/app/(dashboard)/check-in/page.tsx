import { getCheckinData } from "@/features/checkin/queries";
import { CheckinView } from "@/features/checkin/components/checkin-view";

// Server Component: busca no servidor (RLS aplicado), passa pro view client.
export default async function CheckinPage() {
  const { encontristas, onibus } = await getCheckinData();
  return <CheckinView encontristas={encontristas} onibus={onibus} />;
}
