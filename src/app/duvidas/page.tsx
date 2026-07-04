"use client";

import { useState } from "react";
import Link from "next/link";

// ============================================================
//  Tela de Dúvidas Frequentes (FAQ)
//  Transliteração fiel do "Encontro com Deus" → Submergidos:
//   - accordion (abre um, fecha os outros)
//   - mesmas 6 perguntas; textos adaptados (nome/valores/datas)
//   - botão "Ainda tem dúvidas? Fale conosco" → WhatsApp
//  Tema Submergidos via classes do design system (mar/raso/luz…).
// ============================================================

const WHATSAPP =
  "https://wa.me/5511982222149?text=Ol%C3%A1!%20Tenho%20uma%20d%C3%BAvida%20sobre%20o%20Submergidos.";

const FAQS: { pergunta: string; resposta: string }[] = [
  {
    pergunta: "O que é o Submergidos?",
    resposta:
      "O Submergidos é um retiro espiritual preparado para proporcionar momentos de conexão com Deus, renovação da fé e transformação de vida.",
  },
  {
    pergunta: "Quanto custa e como pagar?",
    resposta:
      "O valor do encontro é de R$ 360,00 no PIX ou boleto, e R$ 384,00 no cartão de crédito. O pagamento via cartão de crédito aceita parcelamento em até 12x com acréscimo de 5% (R$ 384,00). O pagamento deve ser realizado pela plataforma Mercado Pago.",
  },
  {
    pergunta: "O que devo levar para o evento?",
    resposta:
      "Leve roupas confortáveis, itens de higiene pessoal, Bíblia, travesseiro, roupas de cama de solteiro e objetos de uso pessoal necessários para os dias do encontro.",
  },
  {
    pergunta: "Como funciona o transporte?",
    resposta:
      "O transporte será realizado em ônibus com saída da sede da Igreja Fonte, localizada na Rua Catiguá, 130 - Cajamar.",
  },
  {
    pergunta: "Como confirmo meu pagamento e obtenho o QR Code?",
    resposta:
      'Após realizar o pagamento, acesse novamente o app, vá em "Já se inscreveu?", informe seu CPF ou WhatsApp e seu QR Code será exibido automaticamente.',
  },
  {
    pergunta: "Me inscrevi mas ainda não paguei, o que fazer?",
    resposta:
      'Sua inscrição está salva! Para confirmar sua vaga, acesse "Já se inscreveu?" na tela inicial, informe seu CPF ou WhatsApp e siga as instruções para realizar o pagamento via PIX, boleto ou cartão de crédito. Sua vaga só é garantida após a confirmação do pagamento.',
  },
];

export default function DuvidasPage() {
  const [aberta, setAberta] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-abismo text-luz">
      {/* cabeçalho */}
      <header className="flex items-center gap-3 px-4 py-5">
        <Link
          href="/"
          aria-label="Voltar"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-luz transition hover:bg-white/20"
        >
          ←
        </Link>
        <h1 className="text-lg font-semibold">Dúvidas Frequentes</h1>
      </header>

      {/* lista */}
      <div className="mx-auto flex max-w-md flex-col gap-3 px-4 pb-10">
        {FAQS.map((faq, i) => {
          const open = aberta === i;
          return (
            <div
              key={i}
              className={`overflow-hidden rounded-2xl border transition ${
                open
                  ? "border-ok/50 bg-white/[0.04]"
                  : "border-white/10 bg-white/[0.03]"
              }`}
            >
              <button
                type="button"
                onClick={() => setAberta(open ? null : i)}
                className="flex w-full items-center justify-between gap-3 px-4 py-4 text-left"
                aria-expanded={open}
              >
                <span className="text-sm font-semibold text-luz">
                  {faq.pergunta}
                </span>
                <span
                  className={`shrink-0 text-lg leading-none ${
                    open ? "text-ok" : "text-ok"
                  }`}
                >
                  {open ? "×" : "+"}
                </span>
              </button>
              {open && (
                <p className="px-4 pb-4 text-sm leading-relaxed text-raso/90">
                  {faq.resposta}
                </p>
              )}
            </div>
          );
        })}

        {/* CTA WhatsApp */}
        <a
          href={WHATSAPP}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 rounded-2xl border border-ok/40 bg-ok/10 py-4 text-center text-sm font-semibold text-ok transition hover:bg-ok/20"
        >
          Ainda tem dúvidas? Fale conosco
        </a>
      </div>
    </div>
  );
}
