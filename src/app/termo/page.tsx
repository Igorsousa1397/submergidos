"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { QRCodeCanvas } from "qrcode.react";
import { G, I, BG, BK } from "@/lib/theme";
import {
  buscarParaTermo,
  assinarTermo,
  type EncontristaTermo,
} from "@/features/termo/termo";
import { exportarTermoPDF } from "@/lib/termo-pdf";

// Datas do evento — admin poderá editar na fase 2 (telas internas).
const EVENTO_DATAS = "4, 5 e 6 de setembro de 2026";

// Texto do termo (portado do original; evento → Submergidos).
const TERMO_TEXTO = `O(a) signatário(a) manifesta concordância com o registro, utilização e divulgação de sua imagem em mídias sociais da Igreja Apostólica Fonte (CNPJ 52.268.825/0001-95), localizada à Rua Catiguá nº 130, Ipês (Polvilho), Cajamar/SP, CEP 07750-000.

A autorização é referente a imagens e vídeos do evento "Submergidos", nos dias ${EVENTO_DATAS}.

Também concorda com as regras do evento, destacando que não é permitido nenhum tipo de registro e/ou gravação pelos inscritos — apenas pela organização.

Por fim, declara que toda participação foi voluntária, em conformidade com a legislação vigente, não infringindo o art. 208 do Código Penal.`;

// dataURL de um File (pra montar o PDF on-demand)
function fileParaDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function TermoPage() {
  const [doc, setDoc] = useState("");
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState("");
  const [enc, setEnc] = useState<EncontristaTermo | null>(null);

  const [assinado, setAssinado] = useState(false);
  const [saving, setSaving] = useState(false);

  const [fotoDoc, setFotoDoc] = useState<File | null>(null);
  const [fotoSelfie, setFotoSelfie] = useState<File | null>(null);
  const [previewDoc, setPreviewDoc] = useState<string | null>(null);
  const [previewSelfie, setPreviewSelfie] = useState<string | null>(null);

  // ---- carga inicial: lê ?doc= (igual ao pagamento) ----
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const d = p.get("doc") || p.get("cpf"); // aceita os dois nomes
    if (!d) {
      setLoading(false);
      setErro(
        "Link inválido. Acesse o termo a partir do seu pagamento confirmado.",
      );
      return;
    }
    setDoc(d);
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

  // ---- canvas de assinatura ----
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const desenhando = useRef(false);
  const temTraco = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0a0a0a";

    const pos = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      return {
        x: ((e.clientX - r.left) / r.width) * canvas.width,
        y: ((e.clientY - r.top) / r.height) * canvas.height,
      };
    };
    const down = (e: PointerEvent) => {
      e.preventDefault();
      desenhando.current = true;
      const { x, y } = pos(e);
      ctx.beginPath();
      ctx.moveTo(x, y);
    };
    const move = (e: PointerEvent) => {
      if (!desenhando.current) return;
      e.preventDefault();
      const { x, y } = pos(e);
      ctx.lineTo(x, y);
      ctx.stroke();
      temTraco.current = true;
    };
    const up = () => {
      desenhando.current = false;
    };

    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [enc, assinado]);

  const limparAssinatura = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    temTraco.current = false;
  };

  // ---- assinar ----
  const assinar = async () => {
    if (saving || !enc) return;
    if (!temTraco.current || !canvasRef.current) {
      setErro("Assine no quadro antes de continuar.");
      return;
    }
    if (!fotoDoc) {
      setErro("Anexe uma foto do documento.");
      return;
    }
    if (!fotoSelfie) {
      setErro("Tire uma selfie para validar.");
      return;
    }
    setErro("");
    setSaving(true);

    const assinaturaDataUrl = canvasRef.current.toDataURL("image/png");
    const res = await assinarTermo({
      encId: enc.id,
      assinaturaDataUrl,
      fotoDoc,
      fotoSelfie,
    });
    setSaving(false);
    if (res.ok) {
      setEnc({ ...enc, termo_assinado_at: new Date().toISOString() });
      setAssinado(true);
    } else {
      setErro(res.erro);
    }
  };

  // ---- baixar PDF (on-demand, monta os dataURLs aqui) ----
  const baixarPdf = async () => {
    if (!enc || !canvasRef.current) return;
    const docEhPdf = fotoDoc?.type === "application/pdf";
    const docDataUrl =
      fotoDoc && !docEhPdf ? await fileParaDataUrl(fotoDoc) : null;
    const selfieDataUrl = fotoSelfie
      ? await fileParaDataUrl(fotoSelfie)
      : null;
    exportarTermoPDF({
      nome: enc.nome,
      cpf: enc.cpf,
      igreja: enc.igreja,
      autorizaImagem: enc.autoriza_imagem,
      assinadoEm: new Date().toLocaleString("pt-BR", {
        dateStyle: "long",
        timeStyle: "short",
      }),
      termoTexto: TERMO_TEXTO,
      assinaturaDataUrl: canvasRef.current.toDataURL("image/png"),
      docDataUrl,
      docEhPdf: !!docEhPdf,
      selfieDataUrl,
    });
  };

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
          <div
            style={{ color: G.t, fontSize: 18, fontWeight: 700, marginBottom: 8 }}
          >
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
              Este QR Code é seu ingresso. Sem ele você não conseguirá fazer o
              check-in no evento. Não perca!
            </div>
          </div>
          <button
            onClick={baixarPdf}
            style={{ ...BG({ width: "100%", padding: 14, borderRadius: 14, marginBottom: 8 }) }}
          >
            Baixar meu termo (PDF)
          </button>
          <Link
            href="/"
            style={{ ...BK({ width: "100%", padding: 14, borderRadius: 14 }), display: "block", textDecoration: "none", textAlign: "center" }}
          >
            Voltar ao início
          </Link>
        </div>
      </div>
    );
  }

  // ===== Formulário do termo =====
  return (
    <div style={{ minHeight: "100vh", background: G.bg, paddingBottom: 60 }}>
      <div
        style={{
          background: G.bg,
          borderBottom: `1px solid ${G.cb}`,
          padding: "14px 16px",
          position: "sticky",
          top: 0,
          zIndex: 50,
          textAlign: "center",
        }}
      >
        <span style={{ color: G.t, fontSize: 15, fontWeight: 700 }}>
          Termo de Concordância
        </span>
      </div>

      <div style={{ padding: "24px 20px", maxWidth: 480, margin: "0 auto" }}>
        <div style={{ color: G.t, fontSize: 16, fontWeight: 800, marginBottom: 4, textAlign: "center" }}>
          Termo de Concordância com as Ministrações e Autorização de Uso de Imagem
        </div>
        <div style={{ color: G.tm, fontSize: 11, textAlign: "center", marginBottom: 24 }}>
          Submergidos — {EVENTO_DATAS}
        </div>

        {/* Dados do signatário (sem RG / endereço) */}
        <div style={{ background: G.card, borderRadius: 14, padding: 16, marginBottom: 20, border: `1px solid ${G.cb}` }}>
          <div style={rotuloSecao}>Dados do Signatário</div>
          <div style={{ marginBottom: 8 }}>
            <div style={rotuloCampo}>Nome</div>
            <div style={{ color: G.t, fontSize: 16, fontWeight: 600 }}>{enc.nome}</div>
          </div>
          <div style={{ marginBottom: 8 }}>
            <div style={rotuloCampo}>CPF</div>
            <div style={{ color: G.t, fontSize: 14 }}>{enc.cpf || "—"}</div>
          </div>
          <div>
            <div style={rotuloCampo}>Autorização de uso de imagem</div>
            <div style={{ color: G.t, fontSize: 14 }}>{enc.autoriza_imagem || "—"}</div>
          </div>
        </div>

        {/* Texto do termo */}
        <div style={{ background: G.input, borderRadius: 14, padding: 16, marginBottom: 20, border: `1px solid ${G.cb}` }}>
          <div style={{ color: G.td, fontSize: 13, lineHeight: 1.8 }}>
            {TERMO_TEXTO.split("\n\n").map((p, i) => (
              <p key={i} style={{ marginBottom: i === 3 ? 0 : 12 }}>
                {p}
              </p>
            ))}
          </div>
        </div>

        {/* Assinatura (canvas) — substitui o checkbox de aceite */}
        <div style={{ background: G.card, borderRadius: 14, padding: 14, marginBottom: 12, border: `1px solid ${G.cb}` }}>
          <div style={{ color: G.t, fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
            ✍️ Sua assinatura *
          </div>
          <div style={{ color: G.tm, fontSize: 12, marginBottom: 10 }}>
            Assine no quadro abaixo. Ao assinar, você declara que leu e concorda
            com todos os termos acima.
          </div>
          <canvas
            ref={canvasRef}
            width={600}
            height={200}
            style={{
              width: "100%",
              height: 180,
              background: "#fff",
              borderRadius: 10,
              touchAction: "none",
              cursor: "crosshair",
            }}
          />
          <button
            onClick={limparAssinatura}
            style={{ ...BK({ padding: "7px 12px", borderRadius: 10, fontSize: 12 }), marginTop: 8 }}
          >
            Limpar
          </button>
        </div>

        {/* Foto do documento */}
        <div style={{ background: G.card, borderRadius: 14, padding: 14, marginBottom: 12, border: `1px solid ${fotoDoc ? "rgba(18,181,166,.3)" : G.cb}` }}>
          <div style={{ color: G.t, fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
            📄 Foto do Documento *
          </div>
          <div style={{ color: G.tm, fontSize: 12, marginBottom: 10 }}>
            Tire foto ou anexe o RG, CNH ou documento digital (PDF).
          </div>
          {previewDoc && (
            <img src={previewDoc} alt="" style={{ width: "100%", borderRadius: 10, marginBottom: 10, maxHeight: 200, objectFit: "cover" }} />
          )}
          {fotoDoc && !previewDoc && (
            <div style={{ color: G.ok, fontSize: 12, marginBottom: 10 }}>✓ {fotoDoc.name}</div>
          )}
          <label style={{ display: "block", background: "rgba(20,105,151,.12)", border: `1px solid ${G.cb}`, borderRadius: 12, padding: "12px", textAlign: "center", color: G.t, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            {fotoDoc ? "Trocar documento" : "📷 Tirar foto / Anexar"}
            <input
              type="file"
              accept="image/*,application/pdf"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setFotoDoc(file);
                setPreviewDoc(
                  file.type.startsWith("image/")
                    ? URL.createObjectURL(file)
                    : null,
                );
              }}
            />
          </label>
        </div>

        {/* Selfie */}
        <div style={{ background: G.card, borderRadius: 14, padding: 14, marginBottom: 20, border: `1px solid ${fotoSelfie ? "rgba(18,181,166,.3)" : G.cb}` }}>
          <div style={{ color: G.t, fontWeight: 700, fontSize: 13, marginBottom: 4 }}>
            🤳 Selfie para validação *
          </div>
          <div style={{ color: G.tm, fontSize: 12, marginBottom: 10 }}>
            Tire uma foto do seu rosto para validar a assinatura.
          </div>
          {previewSelfie && (
            <img src={previewSelfie} alt="" style={{ width: "100%", borderRadius: 10, marginBottom: 10, maxHeight: 200, objectFit: "cover" }} />
          )}
          <label style={{ display: "block", background: "rgba(20,105,151,.12)", border: `1px solid ${G.cb}`, borderRadius: 12, padding: "12px", textAlign: "center", color: G.t, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            {fotoSelfie ? "Tirar outra selfie" : "🤳 Tirar selfie"}
            <input
              type="file"
              accept="image/*"
              capture="user"
              style={{ display: "none" }}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setFotoSelfie(file);
                setPreviewSelfie(URL.createObjectURL(file));
              }}
            />
          </label>
        </div>

        {erro && (
          <div style={{ background: "rgba(229,86,78,.1)", border: "1px solid rgba(229,86,78,.3)", borderRadius: 12, padding: "12px 14px", marginBottom: 16, color: "#f0a39e", fontSize: 13, lineHeight: 1.5 }}>
            {erro}
          </div>
        )}

        <button
          onClick={assinar}
          disabled={saving}
          style={BG({ width: "100%", padding: 16, borderRadius: 14, fontSize: 15, opacity: saving ? 0.7 : 1 })}
        >
          {saving ? "Assinando..." : "Assinar Termo"}
        </button>
      </div>
    </div>
  );
}

// ---- estilos auxiliares (inline, no padrão do projeto) ----
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

const rotuloSecao = {
  color: G.tm,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 1.5,
  textTransform: "uppercase",
  marginBottom: 12,
} as const;

const rotuloCampo = {
  color: G.tm,
  fontSize: 11,
  marginBottom: 2,
} as const;
