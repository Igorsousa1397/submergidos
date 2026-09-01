import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";

// Client para Server Components, Server Actions e Route Handlers.
// Respeita RLS usando a sessão do usuário (cookies).
//
// `cache: "no-store"` é obrigatório: no Next 14 o fetch entra no Data Cache
// por padrão, mesmo em rota dinâmica. Sem isso, escrita feita FORA do app
// (SQL direto, webhook, outro admin) não aparece na tela até algum
// revalidatePath rodar — foi o que segurou a agenda recém-publicada.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) =>
          fetch(input, { ...init, cache: "no-store" }),
      },
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // chamado de um Server Component — ignorar (middleware renova a sessão)
          }
        },
      },
    }
  );
}
