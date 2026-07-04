import Image from "next/image";
import Link from "next/link";
import { entrar } from "./actions";

// Links de apoio (tema Submergidos). Reset de senha e pedido de acesso
// vão pro WhatsApp do suporte — não há fluxo de auto-reset no projeto ainda.
const WHATSAPP_SENHA =
  "https://wa.me/5511982222149?text=Ol%C3%A1!%20Esqueci%20minha%20senha%20de%20acesso%20ao%20Submergidos.";
const WHATSAPP_ACESSO =
  "https://wa.me/5511982222149?text=Ol%C3%A1!%20Gostaria%20de%20solicitar%20acesso%20ao%20portal%20do%20Submergidos.";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  return (
    <div data-zone="deep" className="min-h-screen">
      {/* barra do topo com voltar (igual ao pagamento) */}
      <div className="sticky top-0 z-50 flex items-center border-b border-[rgba(164,214,232,0.12)] px-4 py-3.5">
        <Link
          href="/"
          aria-label="Voltar"
          className="flex items-center justify-center rounded-control border border-[rgba(164,214,232,0.18)] bg-[rgba(0,14,33,0.6)] px-3 py-2 text-sm font-bold text-luz transition hover:border-raso"
        >
          ←
        </Link>
      </div>

      <div className="flex min-h-[calc(100vh-60px)] flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
        <h1 className="display-glow mb-1 text-center text-4xl">Submergidos</h1>
        <p className="mb-8 text-center text-sm tracking-[0.25em] text-raso uppercase">
          Mergulhe no próximo nível
        </p>
        <form action={entrar} className="space-y-3">
          <input
            name="email"
            type="email"
            required
            placeholder="seu@email.com"
            className="w-full rounded-control border border-[rgba(164,214,232,0.18)] bg-[rgba(0,14,33,0.6)] px-3 py-3 text-luz outline-none placeholder:text-corrente focus:border-raso focus:shadow-glow-soft"
          />
          <input
            name="senha"
            type="password"
            required
            placeholder="Senha"
            className="w-full rounded-control border border-[rgba(164,214,232,0.18)] bg-[rgba(0,14,33,0.6)] px-3 py-3 text-luz outline-none placeholder:text-corrente focus:border-raso focus:shadow-glow-soft"
          />
          {erro && <p className="text-sm text-alerta">{erro}</p>}
          <button
            type="submit"
            className="w-full rounded-control bg-mar py-3 font-semibold text-white shadow-glow transition active:scale-[0.98]"
          >
            Entrar
          </button>
        </form>

        {/* links de apoio */}
        <div className="mt-6 flex flex-col items-center gap-2 text-center">
          <a
            href={WHATSAPP_SENHA}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-raso underline-offset-4 transition hover:text-luz hover:underline"
          >
            Esqueci minha senha
          </a>
          <a
            href={WHATSAPP_ACESSO}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-corrente transition hover:text-raso"
          >
            Solicite acesso ao administrador
          </a>
        </div>

        {/* selo Fonte */}
        <div className="mt-10 flex justify-center">
          <Image
            src="/fonte-logo.png"
            alt="Fonte"
            width={120}
            height={120}
            className="h-12 w-auto opacity-70"
          />
        </div>
        </div>
      </div>
    </div>
  );
}
