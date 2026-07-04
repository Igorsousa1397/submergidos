import Link from "next/link";

export default async function EmBrevePage({
  searchParams,
}: {
  searchParams: Promise<{ tela?: string }>;
}) {
  const { tela } = await searchParams;

  return (
    <div className="flex min-h-[calc(100vh-60px)] flex-col items-center justify-center px-6 text-center">
      <div className="w-full max-w-md space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[rgba(164,214,232,0.18)] bg-[rgba(0,14,33,0.5)] text-3xl">
          🌊
        </div>
        <h1 className="font-display text-2xl font-extrabold text-luz">
          {tela ?? "Esta tela"} — em breve
        </h1>
        <p className="text-sm leading-relaxed text-corrente">
          Esta área ainda está sendo preparada para o Submergidos. Em breve ela
          estará disponível por aqui.
        </p>
        <Link
          href="/dashboard"
          className="inline-block rounded-control bg-mar px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition active:scale-[0.98]"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
