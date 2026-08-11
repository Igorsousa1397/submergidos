import { redirect } from "next/navigation";
import { getBackOfficeData } from "@/features/backoffice/queries";
import { BackOfficeView } from "@/features/backoffice/components/backoffice-view";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/permissions";

// Back Office: exclusivo de admin/líder geral (regra do original).
export default async function BackOfficePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!isAdmin(perfil?.role ?? "servo")) redirect("/dashboard");

  const dados = await getBackOfficeData();
  return <BackOfficeView dados={dados} />;
}
