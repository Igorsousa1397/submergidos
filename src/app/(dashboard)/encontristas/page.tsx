import { getEncontristas, getCelulas } from "@/features/encontristas/queries";
import { inscricoesBloqueadas } from "@/features/inscricoes/config";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdmin, isGestao } from "@/lib/permissions";
import {
  EncontristasView,
  type EncRow,
  type Celula,
} from "@/features/encontristas/components/encontristas-view";

// Server Component: busca no servidor (RLS aplicado), passa pro view client.
export default async function EncontristasPage() {
  const supabase = await createClient();
  const [encontristas, celulas, bloqueadas, perfilRes] = await Promise.all([
    getEncontristas(),
    getCelulas(),
    inscricoesBloqueadas(),
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
    <EncontristasView
      encontristas={encontristas as EncRow[]}
      celulas={celulas as Celula[]}
      inscricoesBloqueadas={bloqueadas}
      admin={admin}
    />
  );
}
