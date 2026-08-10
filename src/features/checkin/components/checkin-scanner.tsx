"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

// Overlay de leitura de QR Code. O QR do encontrista codifica o próprio id
// (uuid) — ver /pagamento (QRCodeCanvas value={enc.id}). Ao ler, dispara
// onScan(id) UMA vez e para a câmera (o pai processa o check-in e fecha).
export function CheckinScanner({
  onScan,
  onClose,
}: {
  onScan: (texto: string) => void;
  onClose: () => void;
}) {
  const [erro, setErro] = useState("");
  // mantém a última ref do callback sem re-disparar o efeito (roda 1x).
  const onScanRef = useRef(onScan);
  onScanRef.current = onScan;

  useEffect(() => {
    let scanner: import("html5-qrcode").Html5Qrcode | null = null;
    let cancelado = false;
    let jaLeu = false;

    (async () => {
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        if (cancelado) return;
        scanner = new Html5Qrcode("checkin-qr-region");
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          (decoded) => {
            if (jaLeu) return;
            jaLeu = true;
            // para a câmera antes de entregar o resultado ao pai
            scanner
              ?.stop()
              .catch(() => {})
              .finally(() => onScanRef.current(decoded));
          },
          () => {}, // erros de frame (sem QR) — ignora
        );
      } catch {
        if (!cancelado)
          setErro(
            "Não foi possível acessar a câmera. Autorize o acesso no navegador e tente novamente.",
          );
      }
    })();

    return () => {
      cancelado = true;
      if (scanner) {
        scanner
          .stop()
          .then(() => scanner?.clear())
          .catch(() => {});
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90 backdrop-blur-sm">
      <div className="flex items-center justify-between p-4">
        <p className="font-display text-lg font-bold text-luz">Escanear QR Code</p>
        <button
          onClick={onClose}
          aria-label="Fechar scanner"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(164,214,232,0.18)] text-luz transition hover:border-raso"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-6">
        {erro ? (
          <div
            className="w-full max-w-sm rounded-card border p-4 text-center text-sm leading-relaxed"
            style={{
              borderColor: "rgba(229,86,78,0.3)",
              background: "rgba(229,86,78,0.1)",
              color: "#f0a39e",
            }}
          >
            {erro}
          </div>
        ) : (
          <>
            <div
              id="checkin-qr-region"
              className="w-full max-w-sm overflow-hidden rounded-card border border-[rgba(164,214,232,0.18)]"
            />
            <p className="mt-4 text-center text-sm text-corrente">
              Aponte a câmera para o QR Code do encontrista.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
