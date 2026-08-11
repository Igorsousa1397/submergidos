import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Bolhas } from "@/components/bolhas";
import { sair } from "@/app/(dashboard)/actions";

// Servo cadastrado mas ainda não aprovado pelo admin: fica retido aqui.
// (O layout do dashboard redireciona pra cá enquanto profiles.aprovado = false.)
export default async function AguardandoAprovacaoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("profiles")
    .select("nome, aprovado")
    .eq("id", user.id)
    .single();

  if (perfil?.aprovado) redirect("/dashboard");
  const primeiroNome = perfil?.nome?.split(" ")[0] ?? "servo";

  return (
    <div data-zone="deep" className="relative min-h-screen overflow-hidden">
      <Bolhas quantidade={14} />
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
        <div className="w-full max-w-sm space-y-4">
          <div className="flutuar mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[rgba(224,162,60,0.35)] bg-[rgba(224,162,60,0.1)] text-3xl">
            ⏳
          </div>
          <h1 className="display-glow text-2xl">Quase lá, {primeiroNome}!</h1>
          <p className="text-sm leading-relaxed text-corrente">
            Seu cadastro foi recebido e está <b className="text-luz">aguardando a aprovação</b> do
            administrador. Assim que seu acesso for liberado, é só entrar novamente.
          </p>
          <form action={sair}>
            <button className="w-full rounded-control border border-[rgba(164,214,232,0.25)] py-3 text-sm font-semibold text-corrente transition hover:text-luz active:scale-[0.98]">
              Sair
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
