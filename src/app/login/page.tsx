import { entrar } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;

  return (
    <div
      data-zone="deep"
      className="flex min-h-screen flex-col items-center justify-center px-6"
    >
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
      </div>
    </div>
  );
}
