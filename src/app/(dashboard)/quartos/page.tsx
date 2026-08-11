import { getQuartosData } from "@/features/quartos/queries";
import { QuartosView } from "@/features/quartos/components/quartos-view";
import { createClient } from "@/lib/supabase/server";
import { podeGerenciarQuartos } from "@/lib/permissions";
import { exigirTela } from "@/lib/acesso";

// Quartos: acesso pela tela "quartos" liberada no perfil (Back Office);
// quem VÊ consulta a própria ala, e quem EDITA é admin/líder geral/líder
// de quartos.
export default async function QuartosPage() {
  const { role } = await exigirTela("quartos");
  const supabase = await createClient();

  const [{ quartos, servosDisponiveis, encontristasDisponiveis }, perfilRes] =
    await Promise.all([
      getQuartosData(),
      supabase.auth
        .getUser()
        .then(({ data: { user } }) =>
          user ? supabase.from("profiles").select("sexo").eq("id", user.id).single() : null,
        ),
    ]);

  return (
    <QuartosView
      quartos={quartos}
      servosDisponiveis={servosDisponiveis}
      encontristasDisponiveis={encontristasDisponiveis}
      edit={podeGerenciarQuartos(role)}
      sexoUsuario={perfilRes?.data?.sexo ?? null}
    />
  );
}
