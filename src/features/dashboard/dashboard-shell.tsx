"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  Home,
  Users,
  UserCheck,
  CheckSquare,
  FileText,
  BedDouble,
  Bus,
  Calendar,
  Camera,
  AlertTriangle,
  Search,
  Stethoscope,
  Shirt,
  FolderKanban,
  LogOut,
  type LucideIcon,
} from "lucide-react";

// Itens do menu. `pronto: false` → ainda não portado (vai pra /em-breve).
const NAV: { href: string; label: string; icon: LucideIcon; pronto: boolean }[] = [
  { href: "/dashboard", label: "Início", icon: Home, pronto: true },
  { href: "/servos", label: "Servos", icon: Users, pronto: false },
  { href: "/encontristas", label: "Encontristas", icon: UserCheck, pronto: true },
  { href: "/check-in", label: "Check-in", icon: CheckSquare, pronto: false },
  { href: "/termo", label: "Termo", icon: FileText, pronto: false },
  { href: "/quartos", label: "Quartos", icon: BedDouble, pronto: false },
  { href: "/onibus", label: "Ônibus", icon: Bus, pronto: false },
  { href: "/agenda", label: "Agenda", icon: Calendar, pronto: false },
  { href: "/uso-imagem", label: "Uso de Imagem", icon: Camera, pronto: false },
  { href: "/ocorrencias", label: "Ocorrências", icon: AlertTriangle, pronto: false },
  { href: "/achados", label: "Achados & Perdidos", icon: Search, pronto: false },
  { href: "/saude", label: "Saúde", icon: Stethoscope, pronto: false },
  { href: "/uniformes", label: "Uniformes", icon: Shirt, pronto: false },
  { href: "/back-office", label: "Back Office", icon: FolderKanban, pronto: false },
];

export function DashboardShell({
  nome,
  role,
  children,
  sair,
}: {
  nome: string;
  role: string;
  children: React.ReactNode;
  sair: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const pathname = usePathname();

  return (
    <div data-zone="deep" className="min-h-screen">
      {/* cabeçalho */}
      <header className="sticky top-0 z-30 flex items-center border-b border-[rgba(164,214,232,0.12)] bg-[rgba(0,14,33,0.8)] px-4 py-3 backdrop-blur">
        <button
          onClick={() => setAberto(true)}
          aria-label="Abrir menu"
          className="flex h-9 w-9 items-center justify-center rounded-control border border-[rgba(164,214,232,0.18)] text-luz transition hover:border-raso"
        >
          <Menu size={18} />
        </button>

        {/* logo centralizada (absoluta p/ ficar no centro exato) */}
        <Image
          src="/fonte-logo.png"
          alt="Fonte"
          width={140}
          height={56}
          className="absolute left-1/2 h-10 w-auto -translate-x-1/2"
          priority
        />

        <div className="ml-auto flex items-center gap-2">
          {role === "admin" && (
            <span className="rounded-full border border-[rgba(18,181,166,0.35)] bg-[rgba(18,181,166,0.12)] px-2 py-0.5 text-xs font-semibold text-ok">
              Admin
            </span>
          )}
        </div>
      </header>

      {/* overlay */}
      {aberto && (
        <div
          onClick={() => setAberto(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          aria-hidden
        />
      )}

      {/* drawer lateral */}
      <aside
        className={`fixed left-0 top-0 z-50 h-full w-72 max-w-[80%] transform border-r border-[rgba(164,214,232,0.12)] bg-abismo transition-transform duration-300 ${
          aberto ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* topo do drawer */}
        <div className="flex items-center justify-between border-b border-[rgba(164,214,232,0.1)] px-4 py-4">
          <div>
            <p className="font-display text-lg font-extrabold text-luz">Submergidos</p>
            <p className="text-xs text-corrente">
              {nome} · {role === "admin" ? "Admin" : "Servo"}
            </p>
          </div>
          <button
            onClick={() => setAberto(false)}
            aria-label="Fechar menu"
            className="flex h-8 w-8 items-center justify-center rounded-full text-corrente transition hover:text-luz"
          >
            <X size={18} />
          </button>
        </div>

        {/* itens */}
        <nav
          className="flex flex-col gap-0.5 overflow-y-auto px-2 py-3"
          style={{ maxHeight: "calc(100vh - 140px)" }}
        >
          {NAV.map((item) => {
            const Icone = item.icon;
            const alvo = item.pronto
              ? item.href
              : `/em-breve?tela=${encodeURIComponent(item.label)}`;
            const ativo = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={alvo}
                onClick={() => setAberto(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                  ativo
                    ? "bg-[rgba(18,181,166,0.14)] font-semibold text-ok"
                    : "text-luz hover:bg-white/5"
                }`}
              >
                <Icone size={18} className={ativo ? "text-ok" : "text-corrente"} />
                <span className="flex-1">{item.label}</span>
                {!item.pronto && (
                  <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-corrente">
                    em breve
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* sair */}
        <div className="absolute bottom-0 left-0 w-full border-t border-[rgba(164,214,232,0.1)] p-2">
          <form action={sair}>
            <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-alerta transition hover:bg-[rgba(229,86,78,0.1)]">
              <LogOut size={18} />
              <span>Sair</span>
            </button>
          </form>
        </div>
      </aside>

      <main>{children}</main>
    </div>
  );
}
