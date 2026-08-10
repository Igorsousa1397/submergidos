"use client";

import { useEffect } from "react";

export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Em DEV o service worker atrapalha: os chunks do next dev têm URL fixa
    // (sem hash de conteúdo) e o SW é cache-first, servindo JS antigo depois
    // de editar o código → hidratação trava. Então, fora de produção,
    // desregistramos qualquer SW e limpamos os caches (auto-healing).
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister()))
        .catch(() => {});
      if (typeof caches !== "undefined") {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
      }
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}
