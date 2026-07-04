"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { QRCodeCanvas } from "qrcode.react";
import { G, BK } from "@/lib/theme";
import { buscarParaTermo, type EncontristaTermo } from "@/features/termo/termo";
import { TermoInscricao } from "@/features/termo/termo-inscricao";

export default function TermoPage() {
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [enc, setEnc] = useState<EncontristaTermo | null>(null);
  const [assinado, setAssinado] = useState(false);

  // ---- carga inicial: lê ?doc= (aceita ?cpf= também) ----
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const d = p.get("doc") || p.get("cpf");
    if (!d) {
      setLoading(false);
      setErro("Link inválido. Acesse o termo a partir da sua inscrição.");
      return;
    }
    (async () => {
      const res = await buscarParaTermo(d);
      setLoading(false);
      if (res.ok) {
        setEnc(res.enc);
        if (res.enc.termo_assinado_at) setAssinado(true);
      } else {
        setErro(res.erro);
      }
    })();

    // timeout de segurança (WebView pausando JS): 25s
    const timer = setTimeout(() => setLoading(false), 25000);
    return () => clearTimeout(timer);
  }, []);

  // ===== Loading =====
  if (loading) {
    return (
      <div style={center}>
        <div style={{ color: G.tm, fontSize: 14 }}>Carregando...</div>
      </div>
    );
  }

  // ===== Erro / não encontrado =====
  if (!enc) {
    return (
      <div style={center}>
        <div style={{ textAlign: "center", maxWidth: 360, padding: 24 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <div style={{ color: G.t, fontSize: 18, fontWeight: 700, marginBottom: 8 }}>
            {erro || "Inscrição não encontrada"}
          </div>
          <Link
            href="/"
            style={{
              ...BK({ padding: "12px 24px", borderRadius: 12 }),
              display: "inline-block",
              marginTop: 12,
              textDecoration: "none",
            }}
          >
            Voltar
          </Link>
        </div>
      </div>
    );
  }

  // ===== Já assinado → QR Code =====
  if (assinado) {
    return (
      <div style={center}>
        <div style={{ textAlign: "center", maxWidth: 360, width: "100%", padding: 24 }}>
          <div style={tituloMarca}>SUBMERGIDOS</div>
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
            ✓ Termo assinado
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
      </div>
    );
  }

  // ===== Termo (mesmo componente do fluxo inline) =====
  //  Acesso por ?doc= (ex.: "Já se inscreveu?" / link de WhatsApp).
  //  A RPC devolve só dados públicos (nome/igreja); os demais ficam vazios.
  return (
    <TermoInscricao
      encId={enc.id}
      dados={{ nome: enc.nome, igreja: enc.igreja, autorizaImagem: enc.autoriza_imagem }}
      onAssinado={() => setAssinado(true)}
      onVoltar={() => {
        window.location.href = "/";
      }}
    />
  );
}

const center = {
  minHeight: "100vh",
  background: G.bg,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
} as const;

const tituloMarca = {
  fontFamily: "Archivo, system-ui, sans-serif",
  fontSize: 24,
  fontWeight: 900,
  letterSpacing: 1,
  color: G.t,
  marginBottom: 20,
} as const;
