import { redirect } from "next/navigation";
import { getAgenda } from "@/features/agenda/queries";
import { AgendaView } from "@/features/agenda/components/agenda-view";
import { createClient } from "@/lib/supabase/server";
import { isAdmin, isGestao } from "@/lib/permissions";

// Gestão da agenda do encontro. Servos veem a programação na home deles;
// esta tela é de administração (criar/editar/remover itens).
export default async function AgendaPage() {
  const supabase = await createClient();
  const [itens, perfilRes] = await Promise.all([
    getAgenda(),
    supabase.auth
      .getUser()
      .then(({ data: { user } }) =>
        user
          ? supabase.from("profiles").select("role").eq("id", user.id).single()
          : null,
      ),
  ]);

  const role = perfilRes?.data?.role ?? "servo";
  if (!isGestao(role)) redirect("/dashboard");

  return <AgendaView itens={itens} admin={isAdmin(role)} />;
}
