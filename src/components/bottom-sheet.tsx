"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

// Bottom sheet no padrão do app original: overlay escuro + painel que sobe
// de baixo, com título e botão de fechar. Conteúdo rola se passar da altura.
export function BottomSheet({
  titulo,
  aberto,
  onClose,
  children,
}: {
  titulo: string;
  aberto: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  // trava o scroll da página enquanto o sheet está aberto
  useEffect(() => {
    if (!aberto) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = anterior;
    };
  }, [aberto]);

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* overlay */}
      <div
        onClick={onClose}
        aria-hidden
        className="sheet-overlay absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* painel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        className="sheet-sobe absolute inset-x-0 bottom-0 mx-auto max-h-[88dvh] w-full max-w-md overflow-y-auto rounded-t-2xl border border-b-0 border-[rgba(164,214,232,0.15)] bg-breu p-4 pb-8"
      >
        {/* alça */}
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/15" aria-hidden />

        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-luz">{titulo}</h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(164,214,232,0.18)] text-corrente transition hover:text-luz"
          >
            <X size={16} />
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
