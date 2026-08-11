import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin, podeVerTela } from "@/lib/permissions";

// Gate de página (Server Components): exige login e permissão de ver a tela.
// Gestão vê tudo; os demais precisam da tela no perfil (roles.telas) ou nas
// telas extras individuais — concedidas no Back Office. Redireciona se não.
export async function exigirTela(tela: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("profiles")
    .select("role, telas_extra, roles(telas)")
    .eq("id", user.id)
    .single();

  const role = perfil?.role ?? "servo";
  const telasRole =
    (perfil?.roles as unknown as { telas: string[] } | null)?.telas ?? [];
  const telasExtra = perfil?.telas_extra ?? [];

  if (!podeVerTela(tela, role, telasRole, telasExtra)) redirect("/dashboard");

  return { userId: user.id, role, admin: isAdmin(role) };
}
