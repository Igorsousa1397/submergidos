// Fallback de navegação do grupo (dashboard). O App Router exibe isto
// automaticamente enquanto o Server Component da rota carrega os dados,
// mantendo a sidebar (do layout) fixa — só a área de conteúdo troca.
export default function DashboardLoading() {
  return (
    <div
      data-zone="deep"
      className="flex min-h-[60vh] flex-col items-center justify-center gap-4"
    >
      <div
        className="h-10 w-10 animate-spin rounded-full border-2 border-[rgba(164,214,232,0.2)]"
        style={{ borderTopColor: "#4ea8d8" }}
        aria-hidden="true"
      />
      <p className="text-sm tracking-wide text-corrente">Submergindo…</p>
      <span className="sr-only">Carregando</span>
    </div>
  );
}