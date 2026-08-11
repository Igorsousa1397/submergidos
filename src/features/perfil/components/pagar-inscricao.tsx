"use client";

import { useState } from "react";

// Botões de pagamento da inscrição do servo (Mercado Pago).
// PIX/Boleto = valor cheio; cartão = +5% (220→231, 100→105, como no original).
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const brl = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function PagarInscricao({
  userId,
  nome,
  email,
  valorPix,
}: {
  userId: string;
  nome: string;
  email: string | null;
  valorPix: number;
}) {
  const [pagando, setPagando] = useState(false);
  const [erro, setErro] = useState("");
  const valorCredito = Math.round(valorPix * 1.05 * 100) / 100;

  const pagar = async (tipo: "servo_pix" | "servo_credito") => {
    if (pagando) return;
    setPagando(true);
    setErro("");
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/criar-pagamento`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON,
          Authorization: `Bearer ${SUPABASE_ANON}`,
        },
        body: JSON.stringify({
          encontristaId: userId,
          nome,
          email: email ?? "",
          tipo,
          valor: tipo === "servo_pix" ? valorPix : valorCredito,
        }),
      });
      const data = await res.json();
      if (data.init_point) window.location.href = data.init_point;
      else {
        setErro("Não foi possível gerar o pagamento. Tente novamente.");
        setPagando(false);
      }
    } catch {
      setErro("Não foi possível gerar o pagamento. Tente novamente.");
      setPagando(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={() => pagar("servo_pix")}
        disabled={pagando}
        className="w-full rounded-control py-3 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-60"
        style={{ background: "#009ee3" }}
      >
        {pagando ? "..." : `PIX ou Boleto — ${brl(valorPix)}`}
      </button>
      <button
        onClick={() => pagar("servo_credito")}
        disabled={pagando}
        className="w-full rounded-control py-3 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-60"
        style={{ background: "#009ee3" }}
      >
        {pagando ? "..." : `Cartão de Crédito — ${brl(valorCredito)}`}
      </button>
      {erro && (
        <p className="text-xs" style={{ color: "#f0a39e" }}>
          {erro}
        </p>
      )}
      <p className="text-[11px] text-corrente">
        Após pagar, a confirmação chega aqui automaticamente. Também dá pra pagar via
        PIX direto com a liderança.
      </p>
    </div>
  );
}
