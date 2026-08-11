import { redirect } from "next/navigation";
import { User } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  getMeuPerfil,
  VALOR_SERVO,
  VALOR_COZINHA,
} from "@/features/perfil/queries";
import { PagarInscricao } from "@/features/perfil/components/pagar-inscricao";

// Perfil do servo — SÓ leitura (versão enxuta). O diferencial vs. original:
// mostra o status do pagamento da inscrição, que o servo não via em lugar
// nenhum. Correções de dados vão pela liderança (tela de Servos).

const OK = "#12b5a6";
const AVISO = "#e0a23c";
const ALERTA = "#e5564e";
const AZUL = "#0a84ff";
const CINZA = "#8e8e93";

const cardCls = "rounded-card border border-[rgba(164,214,232,0.12)] bg-[rgba(0,14,33,0.5)]";

const brl = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtData = (iso: string | null) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}/${m}/${y}`;
};

const maskCpf = (cpf: string | null) => {
  if (!cpf) return "—";
  const d = cpf.replace(/\D/g, "");
  if (d.length !== 11) return cpf;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
};

export default async function PerfilPage({
  searchParams,
}: {
  searchParams: Promise<{ pago?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [p, { pago: retornoPago }] = await Promise.all([
    getMeuPerfil(user.id),
    searchParams,
  ]);
  if (!p) redirect("/dashboard");
  // conta admin é de sistema: não serve no encontro nem paga inscrição
  if (p.roleSlug === "admin") redirect("/dashboard");

  const valor = p.roleSlug === "cozinha" ? VALOR_COZINHA : VALOR_SERVO;
  const podePagar =
    !p.isento && (p.pagamento === "pendente" || p.pagamento === "pagar_depois");

  // status do pagamento da inscrição
  const pagamento = p.isento
    ? { cor: CINZA, titulo: "Abonado", detalhe: "Seu perfil é isento de pagamento." }
    : p.pagamento === "pago"
      ? { cor: OK, titulo: "✓ Pago", detalhe: p.pago_em ? `Confirmado em ${fmtData(p.pago_em)}.` : "Pagamento confirmado." }
      : p.pagamento === "abonado"
        ? { cor: CINZA, titulo: "Abonado", detalhe: "Pagamento dispensado pela liderança." }
        : p.pagamento === "pagar_depois"
          ? {
              cor: AZUL,
              titulo: "Pagar depois",
              detalhe: `Combinado até ${fmtData(p.pagar_depois_data)}${p.pagar_depois_obs ? ` — ${p.pagar_depois_obs}` : ""}.`,
            }
          : {
              cor: ALERTA,
              titulo: "Pendente",
              detalhe: `Valor: ${brl(valor)} via PIX com a liderança${
                p.dataLimitePagamento ? ` · até ${fmtData(p.dataLimitePagamento)}` : ""
              }.`,
            };

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      {/* header */}
      <div className={`${cardCls} flex items-center justify-between p-4`}>
        <div className="flex items-center gap-2">
          <User size={20} className="text-raso" />
          <h1 className="font-display text-lg font-bold text-luz">Perfil</h1>
        </div>
        <span
          className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
          style={{ color: p.roleCor, background: `${p.roleCor}1f` }}
        >
          {p.roleNome}
          {p.lider_celula ? " · Líder de Célula" : ""}
        </span>
      </div>

      {/* dados cadastrais */}
      <div className={`${cardCls} space-y-3 p-4`}>
        <Campo label="Nome" valor={p.nome} />
        <Campo label="E-mail" valor={p.email ?? "—"} />
        <div className="grid grid-cols-2 gap-3">
          <Campo label="CPF" valor={maskCpf(p.cpf)} />
          <Campo label="Data de nascimento" valor={fmtData(p.nascimento)} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Campo
            label="Sexo"
            valor={p.sexo === "masculino" ? "Masculino" : p.sexo === "feminino" ? "Feminino" : "—"}
          />
          {p.celula && <Campo label="Célula" valor={p.celula} />}
        </div>
        <p className="pt-1 text-center text-[11px] italic text-corrente">
          Dados salvos. Para corrigir algo, procure a liderança.
        </p>
      </div>

      {/* retorno do Mercado Pago */}
      {retornoPago === "true" && p.pagamento !== "pago" && (
        <div
          className="rounded-card border px-4 py-3 text-sm"
          style={{ borderColor: "rgba(18,181,166,0.35)", background: "rgba(18,181,166,0.08)", color: OK }}
        >
          ✓ Pagamento recebido! A confirmação aparece aqui em instantes — atualize a página.
        </div>
      )}
      {retornoPago === "pending" && (
        <div
          className="rounded-card border px-4 py-3 text-sm"
          style={{ borderColor: "rgba(224,162,60,0.4)", background: "rgba(224,162,60,0.08)", color: AVISO }}
        >
          ⏳ Seu pagamento está sendo processado — a confirmação aparece aqui assim que
          for aprovada.
        </div>
      )}

      {/* pagamento da inscrição */}
      <div className={cardCls} style={{ borderLeft: `3px solid ${pagamento.cor}` }}>
        <div className="space-y-3 p-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-corrente">
              Pagamento da inscrição
            </p>
            <p className="mt-1 font-display text-xl font-extrabold" style={{ color: pagamento.cor }}>
              {pagamento.titulo}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-corrente">{pagamento.detalhe}</p>
          </div>
          {podePagar && (
            <PagarInscricao userId={user.id} nome={p.nome} email={p.email} valorPix={valor} />
          )}
        </div>
      </div>
    </div>
  );
}

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] uppercase tracking-wide text-corrente">{label}</p>
      <p className="truncate text-sm text-luz">{valor}</p>
    </div>
  );
}
