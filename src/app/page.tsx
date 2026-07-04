import Image from "next/image";
import Link from "next/link";
import { inscricoesBloqueadas } from "@/features/inscricoes/config";
import { DuvidasButton } from "./duvidas-button";

const INSTAGRAM = "https://instagram.com/fontecajamar";
const WHATSAPP = "#"; // TODO: trocar pelo link do WhatsApp
const DUVIDAS = "#";  // TODO: trocar pelo link/contato de dúvidas

export default async function Welcome() {
  const bloqueadas = await inscricoesBloqueadas();

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 py-12">
      {/* ===== FUNDO: arte Submergidos ===== */}
      <Image
        src="/welcome-bg.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-20 object-cover object-center"
      />
      {/* escurecimento p/ leitura dos botões (mais forte embaixo) */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,6,15,.35) 0%, rgba(0,6,15,.15) 35%, rgba(0,6,15,.75) 80%, rgba(0,6,15,.92) 100%)",
        }}
      />

      {/* ===== LOGO ===== */}
      <div className="relative mb-12 text-center">
        <h1 className="display-glow text-[clamp(34px,11vw,52px)] leading-none">Submergidos</h1>
        <p className="mt-2 text-[clamp(10px,3vw,13px)] tracking-[0.3em] text-raso uppercase">Mergulhe no próximo nível</p>
      </div>

      {/* ===== BOTÕES ===== */}
      <div className="relative flex w-full max-w-xs flex-col gap-3">
        {bloqueadas ? (
          <div className="cursor-not-allowed rounded-card border border-white/10 bg-white/5 py-4 text-center font-semibold text-corrente backdrop-blur-sm">
            Inscrições encerradas
          </div>
        ) : (
          <Link
            href="/inscricao"
            className="rounded-card bg-mar py-4 text-center font-semibold text-white shadow-glow transition active:scale-[0.98]"
          >
            Inscrições
          </Link>
        )}

        <Link
          href="/pagamento"
          className="rounded-card border border-raso/30 bg-white/10 py-4 text-center font-semibold text-luz backdrop-blur-sm transition hover:bg-white/20 active:scale-[0.98]"
        >
          Já se inscreveu?
        </Link>

        <Link
          href="/login"
          className="rounded-card border border-raso/30 bg-white/10 py-4 text-center font-semibold text-luz backdrop-blur-sm transition hover:bg-white/20 active:scale-[0.98]"
        >
          Servo
        </Link>
      </div>

      {/* ===== FLUTUANTES ===== */}
      <div className="absolute bottom-6 right-6 flex flex-col items-end gap-3">
        <DuvidasButton href={DUVIDAS} />

        <a href={INSTAGRAM} aria-label="Instagram" className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white shadow-lg">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="2" width="20" height="20" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
          </svg>
        </a>

        <a href={WHATSAPP} aria-label="WhatsApp" className="flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91S17.5 2 12.04 2zm5.8 14.01c-.24.68-1.42 1.31-1.96 1.36-.5.05-.96.23-3.23-.67-2.72-1.07-4.45-3.84-4.58-4.02-.13-.18-1.1-1.46-1.1-2.79 0-1.33.7-1.98.94-2.25.24-.27.53-.34.71-.34.18 0 .35 0 .51.01.16.01.39-.06.6.46.24.58.82 2 .89 2.14.07.14.12.31.02.49-.09.18-.14.29-.27.45-.13.16-.28.36-.4.48-.13.13-.27.28-.12.54.15.27.67 1.11 1.44 1.8.99.88 1.83 1.16 2.09 1.29.26.13.41.11.56-.07.15-.18.65-.76.82-1.02.17-.26.35-.22.59-.13.24.09 1.52.72 1.78.85.26.13.43.2.5.31.07.11.07.64-.17 1.32z"/>
          </svg>
        </a>
      </div>

      {/* selo Fonte */}
      <Image
        src="/fonte-logo.png"
        alt="Fonte"
        width={120}
        height={120}
        className="absolute bottom-5 left-1/2 h-14 w-auto -translate-x-1/2 opacity-80"
      />
    </div>
  );
}
