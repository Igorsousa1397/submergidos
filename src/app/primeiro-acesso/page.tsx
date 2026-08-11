"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Bolhas } from "@/components/bolhas";

// Primeiro acesso do servo: troca a senha temporária pela definitiva.
// Fica FORA do grupo (dashboard) — o layout de lá redireciona pra cá
// enquanto profiles.primeiro = true (evitaria loop se estivesse dentro).
export default function PrimeiroAcessoPage() {
  const router = useRouter();
  const supabase = createClient();
  const [nome, setNome] = useState<string | null>(null);
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [erro, setErro] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/login");
        return;
      }
      const { data: perfil } = await supabase
        .from("profiles")
        .select("nome, primeiro")
        .eq("id", user.id)
        .single();
      if (perfil && !perfil.primeiro) {
        router.replace("/dashboard");
        return;
      }
      setNome(perfil?.nome?.split(" ")[0] ?? null);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const salvar = async () => {
    setErro("");
    if (senha.length < 6) return setErro("A senha precisa ter ao menos 6 caracteres.");
    if (senha !== confirma) return setErro("As senhas não coincidem.");
    setSalvando(true);

    const { error } = await supabase.auth.updateUser({ password: senha });
    if (error) {
      setSalvando(false);
      return setErro(
        error.message.includes("different")
          ? "A nova senha precisa ser diferente da temporária."
          : "Não foi possível salvar a senha. Tente novamente.",
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) await supabase.from("profiles").update({ primeiro: false }).eq("id", user.id);

    router.replace("/dashboard");
  };

  return (
    <div data-zone="deep" className="relative min-h-screen overflow-hidden">
      <Bolhas quantidade={14} />
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-4 text-center">
          <h1 className="display-glow text-3xl">Bem-vindo{nome ? `, ${nome}` : ""}!</h1>
          <p className="text-sm leading-relaxed text-corrente">
            Este é seu primeiro acesso ao Submergidos. Crie a sua senha definitiva para
            continuar.
          </p>
          <div className="space-y-3 pt-2 text-left">
            <input
              type="password"
              placeholder="Nova senha (mín. 6 caracteres)"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full rounded-control border border-[rgba(164,214,232,0.18)] bg-[rgba(0,14,33,0.6)] px-3 py-3 text-luz outline-none placeholder:text-corrente focus:border-raso"
            />
            <input
              type="password"
              placeholder="Confirme a nova senha"
              value={confirma}
              onChange={(e) => setConfirma(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && salvar()}
              className="w-full rounded-control border border-[rgba(164,214,232,0.18)] bg-[rgba(0,14,33,0.6)] px-3 py-3 text-luz outline-none placeholder:text-corrente focus:border-raso"
            />
            {erro && <p className="text-sm text-alerta">{erro}</p>}
            <button
              onClick={salvar}
              disabled={salvando}
              className="w-full rounded-control bg-mar py-3 font-semibold text-white shadow-glow transition active:scale-[0.98] disabled:opacity-60"
            >
              {salvando ? "Salvando..." : "Salvar e entrar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
