"use client";

import { useState } from "react";
import { G, I, BG, BK } from "@/lib/theme";
import { assinarTermo } from "@/features/termo/termo";

// Datas do evento — admin poderá editar na fase 2 (telas internas).
const EVENTO_DATAS = "4, 5 e 6 de setembro de 2026";

// Texto do termo (portado do original; evento → Submergidos).
const TERMO_TEXTO = `O(a) signatário(a) manifesta concordância com o registro, utilização e divulgação de sua imagem em mídias sociais da Igreja Apostólica Fonte (CNPJ 52.268.825/0001-95), localizada à Rua Catiguá nº 130, Ipês (Polvilho), Cajamar/SP, CEP 07750-000.

A autorização é referente a imagens e vídeos do evento "Submergidos", nos dias ${EVENTO_DATAS}.

Também concorda com as regras do evento, destacando que não é permitido nenhum tipo de registro e/ou gravação pelos inscritos — apenas pela organização.

Por fim, declara que toda participação foi voluntária, em conformidade com a legislação vigente, não infringindo o art. 208 do Código Penal.`;

export type TermoDados = {
  nome: string;
  sexo?: string | null;
  igreja?: string | null;
  cpf?: string | null;
  autorizaImagem?: string | null;
};

export function TermoInscricao({
  encId,
  dados,
  onAssinado,
  onVoltar,
}: {
  encId: string;
  dados: TermoDados;
  onAssinado: () => void;
  onVoltar: () => void;
}) {
  const [cep, setCep] = useState("");
  const [num, setNum] = useState("");
  const [comp, setComp] = useState("");
  const [end, setEnd] = useState("");
  const [loadCep, setLoadCep] = useState(false);
  const [aceite, setAceite] = useState(false);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState("");

  // Documento: frente e opcionalmente verso
  const [fotoFrente, setFotoFrente] = useState<File | null>(null);
  const [fotoVerso, setFotoVerso] = useState<File | null>(null);
  const [previewFrente, setPreviewFrente] = useState<string | null>(null);
  const [previewVerso, setPreviewVerso] = useState<string | null>(null);
  const [precisaVerso, setPrecisaVerso] = useState(false);
  const [modalVerso, setModalVerso] = useState(false);

  // Selfie
  const [fotoRosto, setFotoRosto] = useState<File | null>(null);
  const [previewRosto, setPreviewRosto] = useState<string | null>(null);

  const buscarCep = async (valor: string) => {
    const limpo = valor.replace(/\D/g, "");
    if (limpo.length !== 8) return;
    setLoadCep(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setEnd(`${data.logradouro}, ${data.bairro}, ${data.localidade}/${data.uf}`);
      }
    } catch {
      /* silencioso — usuário digita manualmente */
    }
    setLoadCep(false);
  };

  const handleFotoFrente = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoFrente(file);
    setPreviewFrente(file.type.startsWith("image/") ? URL.createObjectURL(file) : null);
    setModalVerso(true);
  };

  const handleFotoVerso = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFotoVerso(file);
    setPreviewVerso(file.type.startsWith("image/") ? URL.createObjectURL(file) : null);
  };

  const igrejaLabel = dados.igreja || "—";

  const assinar = async () => {
    if (saving) return;
    if (!end.trim() || !num.trim()) {
      setErro("Preencha o endereço completo (rua e número).");
      return;
    }
    if (!aceite) {
      setErro("Você precisa aceitar os termos para assinar.");
      return;
    }
    if (!fotoFrente) {
      setErro("Envie uma foto do documento (frente).");
      return;
    }
    if (precisaVerso && !fotoVerso) {
      setErro("Envie a foto do verso do documento.");
      return;
    }
    if (!fotoRosto) {
      setErro("Tire uma selfie para validar.");
      return;
    }
    setErro("");
    setSaving(true);

    const res = await assinarTermo({
      encId,
      endereco: end,
      cep,
      numero: num,
      complemento: comp,
      fotoDoc: fotoFrente,
      fotoVerso: precisaVerso ? fotoVerso : null,
      fotoSelfie: fotoRosto,
      signatario: {
        nome: dados.nome,
        cpf: dados.cpf ?? null,
        igreja: dados.igreja ?? null,
        autorizaImagem: dados.autorizaImagem ?? null,
        sexo: dados.sexo ?? null,
        termoTexto: TERMO_TEXTO,
      },
    });

    setSaving(false);
    if (res.ok) onAssinado();
    else setErro(res.erro);
  };

  return (
    <div style={{ minHeight: "100vh", background: G.bg, paddingBottom: 60 }}>
      {/* Modal: a foto já tem frente e verso? */}
      {modalVerso && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,6,15,.85)",
            zIndex: 999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            style={{
              background: G.card,
              border: `1px solid ${G.cb}`,
              borderRadius: 18,
              padding: 24,
              maxWidth: 340,
              width: "100%",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>📄</div>
            <div style={{ color: G.t, fontWeight: 800, fontSize: 16, marginBottom: 8 }}>
              Sua foto já tem frente e verso?
            </div>
            <div style={{ color: G.td, fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
              Se o documento completo já aparece em uma só foto, toque em{" "}
              <strong style={{ color: G.t }}>OK</strong>.<br />
              Se precisar enviar o verso separado, toque em{" "}
              <strong style={{ color: G.t }}>Enviar 2ª foto</strong>.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => {
                  setPrecisaVerso(true);
                  setModalVerso(false);
                }}
                style={{
                  ...BK({ flex: 1, padding: 13, borderRadius: 12, fontSize: 14 }),
                  borderColor: "rgba(20,105,151,.5)",
                  color: G.t,
                }}
              >
                Enviar 2ª foto
              </button>
              <button
                onClick={() => {
                  setPrecisaVerso(false);
                  setModalVerso(false);
                }}
                style={BG({ flex: 1, padding: 13, borderRadius: 12, fontSize: 14 })}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Topo */}
      <div
        style={{
          background: G.bg,
          borderBottom: `1px solid ${G.cb}`,
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <button
          onClick={onVoltar}
          style={BK({ padding: "8px 13px", borderRadius: 10, fontSize: 13, fontWeight: 700 })}
        >
          ←
        </button>
        <span style={{ color: G.t, fontSize: 15, fontWeight: 700, flex: 1, textAlign: "center" }}>
          Termo de Concordância
        </span>
        <span style={{ width: 40 }} />
      </div>

      <div style={{ padding: "24px 20px", maxWidth: 480, margin: "0 auto" }}>
        <div style={{ color: G.t, fontSize: 16, fontWeight: 800, marginBottom: 4, textAlign: "center" }}>
          Termo de Concordância com as Ministrações e Autorização de Uso de Imagem
        </div>
        <div style={{ color: G.tm, fontSize: 11, textAlign: "center", marginBottom: 24 }}>
          Submergidos — {EVENTO_DATAS}
        </div>

        {/* Signatário (pré-preenchido) */}
        <div style={{ background: G.card, borderRadius: 14, padding: "14px 16px", marginBottom: 20, border: `1px solid ${G.cb}` }}>
          <div style={rotuloSecao}>Signatário</div>
          <div style={{ color: G.t, fontWeight: 700, fontSize: 16 }}>{dados.nome}</div>
          <div style={{ color: G.tm, fontSize: 12, marginTop: 4 }}>
            {[dados.sexo, igrejaLabel].filter(Boolean).join(" · ")}
          </div>
        </div>

        {/* Endereço */}
        <div style={rotuloSecao}>Endereço *</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
          <input
            value={cep}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, "").slice(0, 8);
              setCep(v);
              buscarCep(v);
            }}
            placeholder="CEP"
            inputMode="numeric"
            style={{ ...I, width: 140 }}
          />
          {loadCep && (
            <span style={{ color: G.tm, fontSize: 12 }}>Buscando…</span>
          )}
        </div>
        <input
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          placeholder="Rua, bairro, cidade/UF"
          style={{ ...I, marginBottom: 8 }}
        />
        <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
          <input
            value={num}
            onChange={(e) => setNum(e.target.value)}
            placeholder="Número"
            style={{ ...I, width: 110 }}
          />
          <input
            value={comp}
            onChange={(e) => setComp(e.target.value)}
            placeholder="Complemento (opcional)"
            style={{ ...I, flex: 1 }}
          />
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

        {/* Aceite (checkbox) — substitui o canvas */}
        <div
          onClick={() => setAceite(!aceite)}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            cursor: "pointer",
            background: aceite ? "rgba(18,181,166,.08)" : G.card,
            border: `1px solid ${aceite ? "rgba(18,181,166,.4)" : G.cb}`,
            borderRadius: 14,
            padding: "14px 16px",
            marginBottom: 20,
          }}
        >
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: 6,
              border: `2px solid ${aceite ? G.ok : G.cb}`,
              background: aceite ? "rgba(18,181,166,.15)" : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              marginTop: 1,
            }}
          >
            {aceite && <span style={{ color: G.ok, fontSize: 13, fontWeight: 900 }}>✓</span>}
          </div>
          <span style={{ color: aceite ? G.t : G.td, fontSize: 13, lineHeight: 1.6 }}>
            Li e concordo com todos os termos acima, incluindo as regras do evento e a
            autorização de uso de imagem.
          </span>
        </div>

        {/* Documento (frente) */}
        <div style={rotuloSecao}>Documento (frente) *</div>
        <label
          style={{
            display: "block",
            background: G.card,
            border: `1px dashed ${fotoFrente ? "rgba(18,181,166,.4)" : G.cb}`,
            borderRadius: 14,
            padding: 16,
            textAlign: "center",
            cursor: "pointer",
            marginBottom: 8,
          }}
        >
          <input type="file" accept="image/*,application/pdf" style={{ display: "none" }} onChange={handleFotoFrente} />
          {previewFrente ? (
            <img src={previewFrente} alt="frente" style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 10 }} />
          ) : fotoFrente ? (
            <div style={{ color: G.ok, fontSize: 13 }}>✓ {fotoFrente.name}</div>
          ) : (
            <div style={{ color: G.tm, fontSize: 13 }}>📷 Toque para tirar foto ou anexar (PDF/imagem)</div>
          )}
        </label>

        {/* Documento (verso) — só quando o usuário escolheu enviar separado */}
        {precisaVerso && (
          <>
            <div style={{ ...rotuloSecao, marginTop: 16 }}>Documento (verso) *</div>
            <label
              style={{
                display: "block",
                background: G.card,
                border: `1px dashed ${fotoVerso ? "rgba(18,181,166,.4)" : G.cb}`,
                borderRadius: 14,
                padding: 16,
                textAlign: "center",
                cursor: "pointer",
                marginBottom: 8,
              }}
            >
              <input type="file" accept="image/*,application/pdf" style={{ display: "none" }} onChange={handleFotoVerso} />
              {previewVerso ? (
                <img src={previewVerso} alt="verso" style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 10 }} />
              ) : fotoVerso ? (
                <div style={{ color: G.ok, fontSize: 13 }}>✓ {fotoVerso.name}</div>
              ) : (
                <div style={{ color: G.tm, fontSize: 13 }}>📷 Foto do verso</div>
              )}
            </label>
          </>
        )}

        {/* Selfie */}
        <div style={{ ...rotuloSecao, marginTop: 16 }}>Selfie de validação *</div>
        <label
          style={{
            display: "block",
            background: G.card,
            border: `1px dashed ${fotoRosto ? "rgba(18,181,166,.4)" : G.cb}`,
            borderRadius: 14,
            padding: 16,
            textAlign: "center",
            cursor: "pointer",
            marginBottom: 24,
          }}
        >
          <input
            type="file"
            accept="image/*"
            capture="user"
            style={{ display: "none" }}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setFotoRosto(f);
              setPreviewRosto(URL.createObjectURL(f));
            }}
          />
          {previewRosto ? (
            <img src={previewRosto} alt="selfie" style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 10 }} />
          ) : (
            <div style={{ color: G.tm, fontSize: 13 }}>🤳 Tire uma selfie segurando seu documento</div>
          )}
        </label>

        {erro && (
          <div
            style={{
              background: "rgba(229,86,78,.1)",
              border: "1px solid rgba(229,86,78,.3)",
              borderRadius: 12,
              padding: "12px 14px",
              marginBottom: 16,
              color: "#f0a39e",
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            {erro}
          </div>
        )}

        <button
          onClick={assinar}
          disabled={saving}
          style={BG({ width: "100%", padding: 16, borderRadius: 14, fontSize: 15, opacity: saving ? 0.6 : 1 })}
        >
          {saving ? "Enviando… aguarde" : "Assinar e ir para pagamento →"}
        </button>
      </div>
    </div>
  );
}

const rotuloSecao = {
  color: G.tm,
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 1.5,
  textTransform: "uppercase",
  marginBottom: 8,
} as const;
