import Image from "next/image";
import Link from "next/link";
import { inscricoesBloqueadas } from "@/features/inscricoes/config";

const INSTAGRAM = "https://www.instagram.com/ecomdeusfonte/";
const WHATSAPP =
  "https://wa.me/5511982222149?text=Ol%C3%A1!%20Preciso%20de%20ajuda%20com%20minha%20inscri%C3%A7%C3%A3o%20no%20Submergidos.";

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

      {/* ===== FLUTUANTES (fixos, iguais ao Encontro com Deus) ===== */}
      {/* Dúvidas → tela de FAQ */}
      <Link
        href="/duvidas"
        aria-label="Dúvidas"
        className="fixed right-6 bottom-[156px] z-[999] flex h-14 w-14 items-center justify-center rounded-full bg-aviso shadow-glow"
      >
        <span className="text-[28px] leading-none">❓</span>
      </Link>

      {/* Instagram */}
      <a
        href={INSTAGRAM}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Instagram"
        className="fixed right-6 bottom-[90px] z-[999] flex h-14 w-14 items-center justify-center rounded-full shadow-glow"
        style={{
          background:
            "linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)",
        }}
      >
        <svg viewBox="0 0 24 24" width="28" height="28" fill="white" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
        </svg>
      </a>

      {/* WhatsApp */}
      <a
        href={WHATSAPP}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WhatsApp"
        className="fixed right-6 bottom-6 z-[999] flex h-14 w-14 items-center justify-center rounded-full bg-[#25d366] shadow-glow"
      >
        <svg viewBox="0 0 24 24" width="32" height="32" fill="white" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>

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
