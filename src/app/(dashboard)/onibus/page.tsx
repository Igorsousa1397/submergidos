import { getOnibusData } from "@/features/onibus/queries";
import { OnibusView } from "@/features/onibus/components/onibus-view";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/permissions";

// Server Component: busca no servidor (RLS aplicado), passa pro view client.
export default async function OnibusPage() {
  const supabase = await createClient();
  const [{ onibus, servos }, perfilRes] = await Promise.all([
    getOnibusData(),
    supabase.auth
      .getUser()
      .then(({ data: { user } }) =>
        user
          ? supabase.from("profiles").select("role").eq("id", user.id).single()
          : null,
      ),
  ]);

  const admin = isAdmin(perfilRes?.data?.role ?? "");

  return <OnibusView onibus={onibus} servos={servos} admin={admin} />;
}
