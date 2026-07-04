import { createClient } from "@/lib/supabase/server";

// Lê config/inscricoes do app_config. Acessível por anon (policy config_pub_inscr).
export async function inscricoesBloqueadas(): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("app_config")
    .select("value")
    .eq("key", "inscricoes")
    .single();

  return Boolean((data?.value as { bloqueadas?: boolean })?.bloqueadas);
}
