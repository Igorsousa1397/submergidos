import { createClient } from "@/lib/supabase/server";
import { getDashboard } from "@/features/dashboard/queries";

const brl = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil } = await supabase
    .from("profiles")
    .select("nome, role")
    .eq("id", user!.id)
    .single();

  const d = await getDashboard();
  const primeiroNome = perfil?.nome?.split(" ")[0] ?? "servo";
  const pct = d.meta > 0 ? Math.round((d.total / d.meta) * 100) : 0;

  const topo = [
    { label: "Check-in", valor: `${d.checkinFeitos}/${d.checkinTotal}` },
    { label: "Ônibus", valor: `${d.onibusOcupados}/${d.onibusTotal}` },
    { label: "Quartos", valor: `${d.quartos}` },
    { label: "Ocorrências", valor: `${d.ocorrencias}` },
  ];

  // maiores para escalar as barras dos gráficos
  const maxDia = Math.max(1, ...d.cadastrosPorDia.map((x) => x.qtd));
  const maxCel = Math.max(1, ...d.porCelula.map((x) => x.qtd));

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      {/* saudação */}
      <header className="pt-2">
        <div className="flex items-center gap-2">
          <h1 className="font-display text-2xl font-extrabold text-luz">
            Shalom, {primeiroNome}.
          </h1>
          {perfil?.role === "admin" && (
            <span className="rounded-full border border-[rgba(18,181,166,0.35)] bg-[rgba(18,181,166,0.12)] px-2 py-0.5 text-xs font-semibold text-ok">
              Admin
            </span>
          )}
        </div>
      </header>

      {/* 4 cards de topo */}
      <div className="grid grid-cols-2 gap-3">
        {topo.map((c) => (
          <div
            key={c.label}
            className="rounded-card border border-[rgba(164,214,232,0.12)] bg-[rgba(0,14,33,0.5)] p-4"
          >
            <p className="font-display text-2xl font-extrabold text-luz">{c.valor}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-corrente">{c.label}</p>
          </div>
        ))}
      </div>

      {/* card Encontristas */}
      <div className="space-y-4 rounded-card border border-[rgba(164,214,232,0.12)] bg-[rgba(0,14,33,0.5)] p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-luz">Encontristas</h2>
          <span className="text-sm text-corrente">
            {d.total}/{d.meta}{" "}
            <span className="rounded-full bg-[rgba(18,181,166,0.12)] px-2 py-0.5 text-xs font-semibold text-ok">
              {pct}%
            </span>
          </span>
        </div>

        <div>
          <div className="mb-1 flex justify-between text-xs text-corrente">
            <span>Meta: {d.meta}</span>
            <span>{pct}% preenchido</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-mar" style={{ width: `${Math.min(pct, 100)}%` }} />
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-ok">Pago</span>
            <span className="font-bold text-luz">{d.pagos}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-alerta">Pendente</span>
            <span className="font-bold text-luz">{d.pendentes}</span>
          </div>
        </div>

        <div className="space-y-2 border-t border-[rgba(164,214,232,0.1)] pt-3">
          <p className="text-xs uppercase tracking-wide text-corrente">Financeiro</p>
          <div className="flex items-center justify-between text-sm">
            <span className="text-luz">● Arrecadado</span>
            <span className="font-bold text-ok">{brl(d.arrecadado)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-luz">● A receber</span>
            <span className="font-bold text-aviso">{brl(d.aReceber)}</span>
          </div>
          <div className="flex items-center justify-between border-t border-[rgba(164,214,232,0.1)] pt-2 text-sm">
            <span className="text-corrente">Previsão total (meta)</span>
            <span className="font-bold text-raso">{brl(d.previsaoTotal)}</span>
          </div>
          <p className="text-[11px] text-corrente">* {d.meta} × R$ 360 (valor padrão)</p>
        </div>
      </div>

      {/* card Servos */}
      <div className="space-y-4 rounded-card border border-[rgba(164,214,232,0.12)] bg-[rgba(0,14,33,0.5)] p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-luz">Servos</h2>
          <span className="text-sm text-corrente">{d.servosTotal} ativos</span>
        </div>
        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-ok">Pagos</span>
            <span className="font-bold text-luz">{d.servosPagos}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-alerta">Pendentes</span>
            <span className="font-bold text-luz">{d.servosPendentes}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-corrente">Abonados</span>
            <span className="font-bold text-luz">{d.servosAbonados}</span>
          </div>
        </div>
        <div className="space-y-2 border-t border-[rgba(164,214,232,0.1)] pt-3">
          <p className="text-xs uppercase tracking-wide text-corrente">Financeiro</p>
          <div className="flex items-center justify-between text-sm">
            <span className="text-luz">● Arrecadado</span>
            <span className="font-bold text-ok">{brl(d.servosArrecadado)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-luz">● A receber</span>
            <span className="font-bold text-aviso">{brl(d.servosAReceber)}</span>
          </div>
          <p className="text-[11px] text-corrente">
            * R$ 220/servo e R$ 100/cozinha (PIX). Abonados não contabilizados.
          </p>
        </div>
      </div>

      {/* card Cadastros por dia */}
      <div className="space-y-3 rounded-card border border-[rgba(164,214,232,0.12)] bg-[rgba(0,14,33,0.5)] p-4">
        <h2 className="font-display text-lg font-bold text-luz">Cadastros por dia</h2>
        {d.cadastrosPorDia.length === 0 ? (
          <p className="text-sm text-corrente">Nenhum cadastro ainda.</p>
        ) : (
          <div className="space-y-2">
            {d.cadastrosPorDia.map((x) => (
              <div key={x.dia} className="flex items-center gap-3 text-sm">
                <span className="w-12 shrink-0 text-corrente">{x.dia}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-mar"
                    style={{ width: `${(x.qtd / maxDia) * 100}%` }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right font-bold text-luz">{x.qtd}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* card Por Célula */}
      <div className="space-y-3 rounded-card border border-[rgba(164,214,232,0.12)] bg-[rgba(0,14,33,0.5)] p-4">
        <h2 className="font-display text-lg font-bold text-luz">Por Célula</h2>
        {d.porCelula.length === 0 ? (
          <p className="text-sm text-corrente">Nenhum encontrista ainda.</p>
        ) : (
          <div className="space-y-2">
            {d.porCelula.map((x) => (
              <div key={x.nome} className="flex items-center gap-3 text-sm">
                <span className="w-24 shrink-0 truncate text-corrente">{x.nome}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${(x.qtd / maxCel) * 100}%`, background: "#a855f7" }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right font-bold text-luz">{x.qtd}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
