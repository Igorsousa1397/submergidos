"use client";

import { useEffect, useState } from "react";

// Mostra o rótulo "Dúvidas" nos primeiros 5s e depois recolhe para só o ícone.
export function DuvidasButton({ href }: { href: string }) {
  const [showLabel, setShowLabel] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setShowLabel(false), 5000);
    return () => clearTimeout(t);
  }, []);

  return (
    <a href={href} aria-label="Dúvidas" className="flex items-center gap-2">
      {showLabel && (
        <span className="rounded-full bg-aviso px-3 py-2 text-sm font-semibold text-aviso-fg shadow-lg">
          Dúvidas
        </span>
      )}
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-aviso text-lg font-bold text-aviso-fg shadow-lg">
        ?
      </span>
    </a>
  );
}
