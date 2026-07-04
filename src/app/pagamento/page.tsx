"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { QRCodeCanvas } from "qrcode.react";
import { G, I, BG, BK } from "@/lib/theme";
import {
  buscarInscricao,
  type InscricaoEncontrada,
} from "@/features/inscricoes/buscar";
import { TermoInscricao } from "@/features/termo/termo-inscricao";

const INSTAGRAM = "https://instagram.com/fontecajamar";
const WHATSAPP_SUPORTE = "#"; // TODO: link do WhatsApp de suporte

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Mesmos valores do Encontro com Deus (conferidos no print: PIX 360 / Cartão 384)
function valores(igreja: string | null) {
  const itajai = igreja === "Fonte Itajaí";
  const pix = itajai ? 200 : 360;
  const credito = itajai ? 210 : 384;
  return { pix, credito };
}
const brl = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

// Fluxo novo: Inscrição → Termo → Pagamento → QR.
// Quando o encontrista está pago, o termo já foi assinado antes — então
// mostramos o QR Code de acesso direto aqui.
function QrBlock({ enc }: { enc: InscricaoEncontrada }) {
  return (
    <div style={{ textAlign: "center", width: "100%" }}>
      <div
        style={{
          background: "rgba(18,181,166,.08)",
          border: "1px solid rgba(18,181,166,.25)",
          borderRadius: 14,
          padding: "12px 14px",
          marginBottom: 20,
          color: G.ok,
          fontWeight: 700,
          fontSize: 14,
        }}
      >
        ✓ Pagamento confirmado
      </div>
      <div style={{ background: "#fff", borderRadius: 20, padding: 20, display: "inline-block", marginBottom: 16 }}>
        <QRCodeCanvas value={enc.id} size={200} />
      </div>
      <div style={{ color: G.tm, fontSize: 12, marginBottom: 8 }}>
        Apresente este QR Code no check-in
      </div>
      <div
        style={{
          background: "rgba(224,162,60,.1)",
          border: "1px solid rgba(224,162,60,.3)",
          borderRadius: 14,
          padding: "14px 16px",
          marginTop: 12,
          marginBottom: 16,
          textAlign: "left",
        }}
      >
        <div style={{ color: G.aviso, fontWeight: 800, fontSize: 14, marginBottom: 6 }}>
          TIRE UM PRINT DESTA TELA
        </div>
        <div style={{ color: G.td, fontSize: 13, lineHeight: 1.6 }}>
          Este QR Code é seu ingresso. Sem ele você não conseguirá fazer o check-in no
          evento. Não perca!
        </div>
      </div>
      <Link
        href="/"
        style={{
          ...BK({ width: "100%", padding: 14, borderRadius: 14 }),
          display: "block",
          textDecoration: "none",
          textAlign: "center",
        }}
      >
        Voltar ao início
      </Link>
    </div>
  );
}

export default function PagamentoPage() {
  const [busca, setBusca] = useState("");
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");
  const [enc, setEnc] = useState<InscricaoEncontrada | null>(null);
  const [pagando, setPagando] = useState(false);

  // retorno do Mercado Pago. Em ?pago=true pedimos o CPF/WhatsApp de volta,
  // porque o MP devolve o id (uuid), não o documento que a RPC usa.
  const [pendenteMP, setPendenteMP] = useState(false);
  const [voltouDoPagamento, setVoltouDoPagamento] = useState(false);
  // "Já se inscreveu?" de quem ainda não assinou o termo: assina inline aqui.
  const [assinouAgora, setAssinouAgora] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const pago = p.get("pago");
    const doc = p.get("doc");
    if (pago === "true") {
      // confirmado no MP: pede o documento pra buscar e mostrar o QR
      setVoltouDoPagamento(true);
    } else if (pago === "pending") {
      setPendenteMP(true);
    } else if (doc) {
      // veio da inscrição/termo: já busca sozinho e cai nos botões de pagamento
      setBusca(doc);
      (async () => {
        setLoading(true);
        const res = await buscarInscricao(doc);
        setLoading(false);
        if (res.ok) setEnc(res.enc);
      })();
    }
  }, []);

  const verificar = async () => {
    if (!busca.trim() || loading) return;
    setLoading(true);
    setErro("");
    setEnc(null);
    const res = await buscarInscricao(busca);
    setLoading(false);
    if (res.ok) setEnc(res.enc);
    else setErro(res.erro);
  };

  const pagar = async (tipo: "pix" | "credito") => {
    if (!enc || pagando) return;
    setPagando(true);
    const { pix, credito } = valores(enc.igreja);
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/criar-pagamento`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON,
          Authorization: `Bearer ${SUPABASE_ANON}`,
        },
        body: JSON.stringify({
          encontristaId: enc.id,
          nome: enc.nome,
          tipo,
          valor: tipo === "pix" ? pix : credito,
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

  const pago = enc?.status === "pago";
  const v = enc ? valores(enc.igreja) : null;

  // Decisão do "Já se inscreveu?": termo não assinado → assina aqui antes do pagamento.
  // (Quem chega via inscrição→termo já tem termo_assinado_at, então cai direto no pagamento.)
  if (enc && !pago && !enc.termo_assinado_at && !assinouAgora) {
    return (
      <TermoInscricao
        encId={enc.id}
        dados={{ nome: enc.nome, igreja: enc.igreja }}
        onAssinado={() => setAssinouAgora(true)}
        onVoltar={() => {
          window.location.href = "/";
        }}
      />
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: G.bg }}>
      {/* topo */}
      <div style={{ background: G.bg, borderBottom: `1px solid ${G.cb}`, padding: "14px 16px", display: "flex", alignItems: "center", position: "sticky", top: 0, zIndex: 50 }}>
        <Link href="/" style={{ ...BK({ padding: "8px 13px", borderRadius: 10, fontSize: 13, fontWeight: 700 }), textDecoration: "none" }}>
          ←
        </Link>
      </div>

      <div style={{ maxWidth: 400, margin: "0 auto", minHeight: "calc(100dvh - 60px)", padding: "24px 20px 40px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
        <div style={{ fontFamily: "Archivo, system-ui, sans-serif", fontSize: 26, fontWeight: 900, letterSpacing: 1, color: G.t, marginBottom: 4 }}>
          SUBMERGIDOS
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase", color: G.tm, marginBottom: 24 }}>
          Mergulhe no próximo nível
        </div>

        {pendenteMP && (
          <div style={{ background: "rgba(224,162,60,.1)", border: "1px solid rgba(224,162,60,.3)", borderRadius: 12, padding: "12px 14px", marginBottom: 16, color: G.aviso, fontSize: 13, lineHeight: 1.6, width: "100%" }}>
            Seu pagamento está sendo processado. Assim que for confirmado, sua vaga estará
            garantida — verifique novamente em instantes.
          </div>
        )}

        {voltouDoPagamento && !enc && (
          <div style={{ background: "rgba(18,181,166,.08)", border: "1px solid rgba(18,181,166,.25)", borderRadius: 12, padding: "12px 14px", marginBottom: 16, color: G.ok, fontSize: 13, lineHeight: 1.6, width: "100%" }}>
            Pagamento recebido! Informe seu CPF ou WhatsApp para obter seu QR Code.
          </div>
        )}

        {!enc ? (
          <>
            <div style={{ color: G.t, fontSize: 22, fontWeight: 800, marginBottom: 16 }}>Já se inscreveu?</div>
            <div style={{ marginBottom: 24, color: G.td, fontSize: 15, lineHeight: 1.7 }}>
              Informe seu <b style={{ color: G.t }}>CPF</b> ou <b style={{ color: G.t }}>WhatsApp</b> cadastrado para gerar o pagamento ou obter seu <b style={{ color: G.t }}>QR Code</b> de check-in.
            </div>
          </>
        ) : (
          !pago && (
            <>
              <div style={{ color: G.t, fontSize: 26, fontWeight: 800, marginBottom: 10 }}>
                Olá, {enc.nome.split(" ")[0]} 👋
              </div>
              <div style={{ color: G.td, fontSize: 15, lineHeight: 1.7, marginBottom: 24 }}>
                Para confirmar sua vaga, realize o pagamento abaixo.
              </div>
            </>
          )
        )}

        {!enc && (
          <div style={{ marginBottom: 16, width: "100%" }}>
            <input
              placeholder="CPF ou WhatsApp"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && verificar()}
              style={{ ...I, marginBottom: 8 }}
            />
            <button onClick={verificar} disabled={loading} style={BG({ width: "100%", padding: 14, borderRadius: 14, fontSize: 15, opacity: loading ? 0.7 : 1 })}>
              {loading ? "..." : "Verificar"}
            </button>
          </div>
        )}

        {erro && (
          <div style={{ background: "rgba(229,86,78,.1)", border: "1px solid rgba(229,86,78,.3)", borderRadius: 12, padding: "12px 14px", marginBottom: 16, color: "#f0a39e", fontSize: 13, lineHeight: 1.6, width: "100%" }}>
            {erro}
            <a href={WHATSAPP_SUPORTE} target="_blank" rel="noopener noreferrer" style={{ display: "block", marginTop: 10, background: "rgba(37,211,102,.1)", border: "1px solid rgba(37,211,102,.3)", color: "#25d366", borderRadius: 10, padding: "10px", fontSize: 13, fontWeight: 700, textDecoration: "none", textAlign: "center" }}>
              Falar com suporte
            </a>
          </div>
        )}

        {enc && (
          <div style={{ textAlign: "center", width: "100%" }}>
            {pago ? (
              <QrBlock enc={enc} />
            ) : (
              <>
                <button
                  onClick={() => pagar("pix")}
                  disabled={pagando}
                  style={{ ...BG({ width: "100%", padding: 16, borderRadius: 14, fontSize: 15, marginBottom: 8, opacity: pagando ? 0.7 : 1 }), background: "#009ee3" }}
                >
                  PIX ou Boleto — {brl(v!.pix)}
                </button>
                <button
                  onClick={() => pagar("credito")}
                  disabled={pagando}
                  style={{ ...BG({ width: "100%", padding: 16, borderRadius: 14, fontSize: 15, marginBottom: 16, opacity: pagando ? 0.7 : 1 }), background: "#009ee3" }}
                >
                  Cartão de Crédito — {brl(v!.credito)}
                </button>

                <div style={{ background: "rgba(224,162,60,.1)", border: "1px solid rgba(224,162,60,.3)", borderRadius: 14, padding: "14px 16px", marginBottom: 16, textAlign: "left" }}>
                  <div style={{ color: G.aviso, fontWeight: 800, fontSize: 13, marginBottom: 6 }}>
                    IMPORTANTE
                  </div>
                  <div style={{ color: G.td, fontSize: 13, lineHeight: 1.6 }}>
                    Após realizar o pagamento, retorne a este aplicativo e clique em
                    &quot;Já paguei — verificar&quot; para receber seu QR Code de acesso ao
                    encontro.
                  </div>
                </div>

                <button
                  onClick={verificar}
                  disabled={loading}
                  style={{ ...BG({ width: "100%", padding: 16, borderRadius: 14, fontSize: 15, marginBottom: 8, opacity: loading ? 0.7 : 1 }), background: G.ok }}
                >
                  {loading ? "..." : "✓ Já paguei — verificar"}
                </button>
                <Link href="/" style={{ ...BK({ width: "100%", padding: 14, borderRadius: 14 }), display: "block", textDecoration: "none", textAlign: "center" }}>
                  Voltar
                </Link>
              </>
            )}
          </div>
        )}

        {/* flutuante Instagram */}
        <div style={{ position: "fixed", bottom: 24, right: 24 }}>
          <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer" aria-label="Instagram" style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(45deg,#f09433,#dc2743,#bc1888)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 16px rgba(220,39,67,.4)" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
              <rect x="2" y="2" width="20" height="20" rx="5" />
              <circle cx="12" cy="12" r="4" />
              <circle cx="17.5" cy="6.5" r="1" fill="#fff" stroke="none" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}
