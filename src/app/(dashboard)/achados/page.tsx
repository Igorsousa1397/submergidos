import { redirect } from "next/navigation";
import { getAchados } from "@/features/achados/queries";
import { AchadosView } from "@/features/achados/components/achados-view";
import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/permissions";

// Achados & Perdidos: aberto a todos os logados — quem acha registra,
// quem entrega marca. Excluir é só admin.
export default async function AchadosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [achados, perfilRes] = await Promise.all([
    getAchados(),
    supabase.from("profiles").select("role").eq("id", user.id).single(),
  ]);

  return <AchadosView achados={achados} admin={isAdmin(perfilRes.data?.role ?? "servo")} />;
}
