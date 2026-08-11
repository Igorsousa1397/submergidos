import { getAgenda } from "@/features/agenda/queries";
import { AgendaView } from "@/features/agenda/components/agenda-view";
import { exigirTela } from "@/lib/acesso";

// Gestão da agenda do encontro. Servos veem a programação na home deles;
// esta tela é de administração (criar/editar/remover itens).
// Acesso: gestão ou tela "agenda" concedida no Back Office.
export default async function AgendaPage() {
  const { admin } = await exigirTela("agenda");
  const itens = await getAgenda();
  return <AgendaView itens={itens} admin={admin} />;
}
