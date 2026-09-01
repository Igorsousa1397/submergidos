import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDashboard } from "@/features/dashboard/queries";
import { AdminDashboard } from "@/features/dashboard/components/admin-dashboard";
import { getServoHome } from "@/features/servo-home/queries";
import { ServoHome } from "@/features/servo-home/components/servo-home";
import { getAgenda } from "@/features/agenda/queries";
import { getAvisosData } from "@/features/avisos/queries";
import { getMinistracoes } from "@/features/ministracoes/queries";
import { isGestao } from "@/lib/permissions";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("profiles")
    .select("nome, role")
    .eq("id", user.id)
    .single();

  const primeiroNome = perfil?.nome?.split(" ")[0] ?? "servo";

  // Servos (e demais perfis fora da gestão) veem a home própria,
  // não o painel administrativo — regra do app original.
  if (!isGestao(perfil?.role ?? "servo")) {
    const dados = await getServoHome(user.id);
    return <ServoHome nome={primeiroNome} dados={dados} />;
  }

  const [d, agenda, ministracoes, avisosData] = await Promise.all([
    getDashboard(),
    getAgenda(),
    getMinistracoes(),
    getAvisosData(),
  ]);

  return (
    <AdminDashboard
      nome={primeiroNome}
      d={d}
      agenda={agenda}
      ministracoes={ministracoes}
      avisos={avisosData.avisos}
    />
  );
}
