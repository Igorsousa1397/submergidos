"use client";

import { useState } from "react";
import Link from "next/link";
import { Bolhas } from "@/components/bolhas";
import { cadastrarServoPublico } from "./actions";

type Sexo = "masculino" | "feminino";

const inputCls =
  "w-full rounded-control border border-[rgba(164,214,232,0.18)] bg-[rgba(0,14,33,0.6)] px-3 py-3 text-luz outline-none placeholder:text-corrente focus:border-raso focus:shadow-glow-soft";

const maskCpf = (v: string) =>
  v
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");

export default function CadastroServoPage() {
  const [f, setF] = useState({
    nome: "",
    email: "",
    cpf: "",
    nascimento: "",
    sexo: "" as Sexo | "",
    senha: "",
    confirma: "",
  });
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const enviar = async () => {
    setErro("");
    if (f.senha !== f.confirma) return setErro("As senhas não coincidem.");
    setEnviando(true);
    const res = await cadastrarServoPublico({
      nome: f.nome,
      email: f.email,
      cpf: f.cpf,
      nascimento: f.nascimento,
      sexo: f.sexo,
      senha: f.senha,
    });
    setEnviando(false);
    if (!res.ok) return setErro(res.erro ?? "Não foi possível concluir o cadastro.");
    setEnviado(true);
  };

  return (
    <div data-zone="deep" className="relative min-h-screen overflow-hidden">
      <Bolhas quantidade={14} />

      {/* barra do topo com voltar */}
      <div className="sticky top-0 z-50 flex items-center border-b border-[rgba(164,214,232,0.12)] px-4 py-3.5">
        <Link
          href="/"
          aria-label="Voltar"
          className="flex items-center justify-center rounded-control border border-[rgba(164,214,232,0.18)] bg-[rgba(0,14,33,0.6)] px-3 py-2 text-sm font-bold text-luz transition hover:border-raso"
        >
          ←
        </Link>
      </div>

      <div className="relative z-10 flex min-h-[calc(100vh-60px)] flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm">
          {enviado ? (
            /* ---- tela de "aguarde aprovação" ---- */
            <div className="space-y-4 text-center">
              <div className="flutuar mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[rgba(18,181,166,0.35)] bg-[rgba(18,181,166,0.1)] text-3xl">
                ⏳
              </div>
              <h1 className="display-glow text-2xl">Cadastro recebido!</h1>
              <p className="text-sm leading-relaxed text-corrente">
                Agora é só aguardar: o administrador vai <b className="text-luz">aprovar seu acesso</b> como
                servo. Assim que for liberado, entre com o e-mail e a senha que você acabou de criar.
              </p>
              <Link
                href="/login"
                className="inline-block w-full rounded-control bg-mar py-3 font-semibold text-white shadow-glow transition active:scale-[0.98]"
              >
                Ir para o login
              </Link>
              <Link href="/" className="block text-sm text-corrente transition hover:text-raso">
                Voltar ao início
              </Link>
            </div>
          ) : (
            /* ---- formulário ---- */
            <>
              <h1 className="display-glow mb-8 text-center text-3xl">Cadastro de Servo</h1>

              <div className="space-y-3">
                <input
                  placeholder="Nome completo"
                  value={f.nome}
                  onChange={(e) => setF((v) => ({ ...v, nome: e.target.value }))}
                  className={inputCls}
                />
                <input
                  type="email"
                  placeholder="E-mail (será seu login)"
                  value={f.email}
                  onChange={(e) => setF((v) => ({ ...v, email: e.target.value }))}
                  className={inputCls}
                />
                <input
                  placeholder="CPF"
                  inputMode="numeric"
                  value={f.cpf}
                  onChange={(e) => setF((v) => ({ ...v, cpf: maskCpf(e.target.value) }))}
                  className={inputCls}
                />
                <div>
                  <p className="mb-1 text-[11px] uppercase tracking-wide text-corrente">
                    Data de nascimento
                  </p>
                  <input
                    type="date"
                    value={f.nascimento}
                    onChange={(e) => setF((v) => ({ ...v, nascimento: e.target.value }))}
                    style={{ colorScheme: "dark" }}
                    className={inputCls}
                  />
                </div>
                <div className="flex gap-2">
                  {(["masculino", "feminino"] as Sexo[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => setF((v) => ({ ...v, sexo: s }))}
                      className="flex-1 rounded-control border py-3 text-sm font-semibold transition"
                      style={
                        f.sexo === s
                          ? { borderColor: "#a4d6e8", color: "#00060f", background: "#dcf1f8" }
                          : { borderColor: "rgba(164,214,232,0.18)", color: "#416a87" }
                      }
                    >
                      {s === "masculino" ? "Masculino" : "Feminino"}
                    </button>
                  ))}
                </div>
                <input
                  type="password"
                  placeholder="Crie sua senha (mín. 6 caracteres)"
                  value={f.senha}
                  onChange={(e) => setF((v) => ({ ...v, senha: e.target.value }))}
                  className={inputCls}
                />
                <input
                  type="password"
                  placeholder="Confirme a senha"
                  value={f.confirma}
                  onChange={(e) => setF((v) => ({ ...v, confirma: e.target.value }))}
                  onKeyDown={(e) => e.key === "Enter" && enviar()}
                  className={inputCls}
                />

                {erro && <p className="text-sm text-alerta">{erro}</p>}

                <p className="text-[11px] leading-relaxed text-corrente">
                  Após o cadastro, seu acesso passa pela <b className="text-luz">aprovação do administrador</b>.
                </p>

                <button
                  onClick={enviar}
                  disabled={enviando}
                  className="w-full rounded-control bg-mar py-3 font-semibold text-white shadow-glow transition active:scale-[0.98] disabled:opacity-60"
                >
                  {enviando ? "Enviando..." : "Cadastrar"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
