"use client";

import { useEffect } from "react";
import Link from "next/link";

// Boundary de erro do cliente.
//
// Sem ele, qualquer exceção no browser derrubava a página inteira na tela
// branca padrão do Next ("Application error: a client-side exception has
// occurred"), sem tema e sem caminho de volta — foi o que a liderança viu
// quando o scanner do check-in quebrou. Aqui pelo menos dá para tentar de
// novo ou voltar ao início.
//
// `data-zone="deep"` porque o body do app é claro por padrão: o tema escuro
// vem desse atributo (globals.css).
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // aparece no console do aparelho e nos logs de runtime da Vercel
    console.error("Erro no cliente:", error);
  }, [error]);

  return (
    <div
      data-zone="deep"
      className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
    >
      <div className="w-full max-w-md space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[rgba(164,214,232,0.18)] bg-[rgba(0,14,33,0.5)] text-3xl">
          🌊
        </div>
        <h1 className="font-display text-2xl font-extrabold text-luz">
          Algo quebrou por aqui
        </h1>
        <p className="text-sm leading-relaxed text-corrente">
          A tela travou no meio do caminho. Tente de novo — se insistir, volte ao
          início e avise a liderança.
        </p>

        <div className="flex flex-col gap-2 pt-1">
          <button
            onClick={reset}
            className="w-full rounded-control bg-mar px-5 py-3 text-sm font-semibold text-white shadow-glow transition active:scale-[0.98]"
          >
            Tentar de novo
          </button>
          <Link
            href="/dashboard"
            className="w-full rounded-control border border-[rgba(164,214,232,0.18)] px-5 py-3 text-sm font-semibold text-corrente transition active:scale-[0.98]"
          >
            Voltar ao início
          </Link>
        </div>

        {error.digest && (
          <p className="pt-1 text-[11px] text-corrente">
            Código do erro: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
