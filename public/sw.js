// public/sw.js
const CACHE = "submergidos-v2";

self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  const url = new URL(req.url);

  // NÃO intercepta: nada além de GET (POST/Server Actions),
  // requisições ao Supabase, e navegações de documento.
  if (
    req.method !== "GET" ||
    req.mode === "navigate" ||
    req.headers.get("accept")?.includes("text/html") ||
    url.pathname.startsWith("/api") ||
    url.hostname.includes("supabase")
  ) {
    return; // deixa o navegador lidar normalmente
  }

  // Só assets estáticos: cache-first com fallback à rede.
  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req)
          .then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          })
          .catch(() => hit)
    )
  );
});