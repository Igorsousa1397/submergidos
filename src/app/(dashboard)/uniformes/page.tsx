import { redirect } from "next/navigation";
import { getUniformesData } from "@/features/uniformes/queries";
import { UniformesAdminView } from "@/features/uniformes/components/uniformes-admin-view";
import { UniformeServoView } from "@/features/uniformes/components/uniforme-servo-view";
import { createClient } from "@/lib/supabase/server";
import { isGestao } from "@/lib/permissions";

// Uniformes: gestão vê o painel de pedidos; os demais veem o próprio pedido
// (mesma dualidade do componente único do original, alternada por `edit`).
export default async function UniformesPage({
  searchParams,
}: {
  searchParams: Promise<{ pago?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ pedidos, config }, perfilRes, { pago: retornoPago }] = await Promise.all([
    getUniformesData(),
    supabase.from("profiles").select("role").eq("id", user.id).single(),
    searchParams,
  ]);

  if (isGestao(perfilRes.data?.role ?? "servo")) {
    return <UniformesAdminView pedidos={pedidos} config={config} />;
  }

  const meu = pedidos.find((p) => p.servo_id === user.id) ?? null;
  return <UniformeServoView pedido={meu} config={config} retornoPago={retornoPago} />;
}
