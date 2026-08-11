// Fallback de navegação do grupo (dashboard). O App Router exibe isto
// automaticamente enquanto o Server Component da rota carrega os dados,
// mantendo a sidebar (do layout) fixa — só a área de conteúdo troca.
export default function DashboardLoading() {
  return (
    <div
      data-zone="deep"
      className="flex min-h-[60vh] flex-col items-center justify-center gap-5"
    >
      {/* bolhas subindo, escalonadas (CSS puro; some em reduced-motion) */}
      <div aria-hidden className="relative flex h-12 items-end gap-2">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="bolha-loader"
            style={{
              width: 10 + (i === 1 ? 4 : 0),
              height: 10 + (i === 1 ? 4 : 0),
              animationDelay: `${i * 0.35}s`,
            }}
          />
        ))}
      </div>
      <p className="animate-pulse text-sm tracking-[0.2em] text-corrente">Submergindo…</p>
      <span className="sr-only">Carregando</span>
    </div>
  );
}
