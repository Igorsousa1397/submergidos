import { getServosData } from "@/features/servos/queries";
import { ServosView } from "@/features/servos/components/servos-view";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin, isGestao } from "@/lib/permissions";

// Server Component: busca no servidor (RLS aplicado), passa pro view client.
export default async function ServosPage() {
  const supabase = await createClient();
  const [{ servos, roles, dataLimitePagamento }, perfilRes] = await Promise.all([
    getServosData(),
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
  const admin = isAdmin(role);

  return (
    <ServosView
      servos={servos}
      roles={roles}
      dataLimitePagamento={dataLimitePagamento}
      admin={admin}
    />
  );
}
