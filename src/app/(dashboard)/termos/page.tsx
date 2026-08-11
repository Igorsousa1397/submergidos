import { redirect } from "next/navigation";
import { getTermos } from "@/features/termo/queries-admin";
import { TermoAdminView } from "@/features/termo/components/termo-admin-view";
import { createClient } from "@/lib/supabase/server";
import { isGestao } from "@/lib/permissions";

// Server Component: busca no servidor (RLS aplicado), passa pro view client.
export default async function TermosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: perfil } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };
  if (!isGestao(perfil?.role ?? "servo")) redirect("/dashboard");

  const termos = await getTermos();
  return <TermoAdminView termos={termos} />;
}