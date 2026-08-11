import { getQuartosData } from "@/features/quartos/queries";
import { QuartosView } from "@/features/quartos/components/quartos-view";
import { createClient } from "@/lib/supabase/server";
import { podeGerenciarQuartos } from "@/lib/permissions";

// Quartos: todos os logados podem VER (o servo consulta a própria ala,
// como no original); quem edita é admin/líder geral/líder de quartos.
export default async function QuartosPage() {
  const supabase = await createClient();
  const [{ quartos, servosDisponiveis, encontristasDisponiveis }, perfilRes] =
    await Promise.all([
      getQuartosData(),
      supabase.auth
        .getUser()
        .then(({ data: { user } }) =>
          user
            ? supabase.from("profiles").select("role, sexo").eq("id", user.id).single()
            : null,
        ),
    ]);

  const role = perfilRes?.data?.role ?? "servo";
  const edit = podeGerenciarQuartos(role);
  const sexoUsuario = perfilRes?.data?.sexo ?? null;

  return (
    <QuartosView
      quartos={quartos}
      servosDisponiveis={servosDisponiveis}
      encontristasDisponiveis={encontristasDisponiveis}
      edit={edit}
      sexoUsuario={sexoUsuario}
    />
  );
}
