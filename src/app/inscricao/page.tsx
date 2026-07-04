"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { criarInscricao } from "@/features/inscricoes/actions";
import { CELULAS, IGREJAS } from "@/features/inscricoes/options";

type Sim = "Sim" | "Não" | "";

interface FormState {
  passouPeniel: Sim;
  igreja: string;
  igrejaCustom: string;
  nome: string;
  cpf: string;
  nascimento: string;
  sexo: "masculino" | "feminino" | "";
  whatsapp: string;
  celula: string;
  autorizaImagem: Sim;
  emergenciaNome: string;
  emergenciaTel: string;
  temMedicamento: Sim;
  medicamento: string;
  temDoenca: Sim;
  doenca: string;
}

const VAZIO: FormState = {
  passouPeniel: "",
  igreja: "",
  igrejaCustom: "",
  nome: "",
  cpf: "",
  nascimento: "",
  sexo: "",
  whatsapp: "",
  celula: "",
  autorizaImagem: "",
  emergenciaNome: "",
  emergenciaTel: "",
  temMedicamento: "",
  medicamento: "",
  temDoenca: "",
  doenca: "",
};

// links / contatos (reusados do Encontro)
const INSTAGRAM = "https://www.instagram.com/ecomdeusfonte/";
const WHATSAPP =
  "https://wa.me/5511982222149?text=" +
  encodeURIComponent(
    "Olá! Preciso de ajuda com minha inscrição no Submergidos.",
  );
const SITIO = "https://cemine.wixsite.com/world";

const maskCpf = (v: string) =>
  v
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");

const maskTel = (v: string) =>
  v
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d{1,4})$/, "$1-$2");

// Data livre DD/MM/AAAA (só dígitos, insere as barras)
const maskData = (v: string) =>
  v
    .replace(/\D/g, "")
    .slice(0, 8)
    .replace(/(\d{2})(\d)/, "$1/$2")
    .replace(/(\d{2})(\d)/, "$1/$2");

// Converte "DD/MM/AAAA" -> "AAAA-MM-DD" (formato que o action espera).
// Retorna "" se a data não estiver completa/válida.
const dataBrParaIso = (v: string): string => {
  const m = v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return "";
  const [, dd, mm, aaaa] = m;
  const d = Number(dd);
  const mo = Number(mm);
  const y = Number(aaaa);
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1900) return "";
  return `${aaaa}-${mm}-${dd}`;
};

const inputCls =
  "w-full rounded-control border border-white/10 bg-breu px-4 py-3 text-luz placeholder:text-corrente outline-none transition focus:border-mar focus:ring-2 focus:ring-mar/30";

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 mt-5 text-xs font-bold uppercase tracking-[0.15em] text-raso">
      {children}
    </div>
  );
}

function Chips({
  options,
  value,
  onPick,
}: {
  options: readonly string[];
  value: string;
  onPick: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const ativo = value === o;
        return (
          <button
            key={o}
            type="button"
            onClick={() => onPick(o)}
            className={
              "rounded-full border px-4 py-2 text-sm font-semibold transition active:scale-95 " +
              (ativo
                ? "border-mar bg-mar/15 text-luz"
                : "border-white/10 bg-white/5 text-corrente hover:text-luz")
            }
          >
            {o}
          </button>
        );
      })}
    </div>
  );
}

// Botões flutuantes (Dúvidas / Instagram / WhatsApp)
function BotoesFlutuantes() {
  const base =
    "fixed right-6 flex h-14 w-14 items-center justify-center rounded-full shadow-glow";
  return (
    <>
      {/* Dúvidas → abre o WhatsApp de suporte */}
      <a
        href={WHATSAPP}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Dúvidas"
        className={base + " bottom-[156px] z-[999] bg-aviso"}
      >
        <span className="text-[28px] leading-none">❓</span>
      </a>
      {/* Instagram */}
      <a
        href={INSTAGRAM}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Instagram"
        className={base + " bottom-[90px] z-[999]"}
        style={{
          background:
            "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)",
        }}
      >
        <svg viewBox="0 0 24 24" width="28" height="28" fill="white" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
        </svg>
      </a>
      {/* WhatsApp */}
      <a
        href={WHATSAPP}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="WhatsApp"
        className={base + " bottom-6 z-[999] bg-[#25d366]"}
      >
        <svg viewBox="0 0 24 24" width="32" height="32" fill="white" xmlns="http://www.w3.org/2000/svg">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      </a>
    </>
  );
}

export default function InscricaoPage() {
  const [form, setForm] = useState<FormState>(VAZIO);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");

  const set = (patch: Partial<FormState>) =>
    setForm((f) => ({ ...f, ...patch }));

  const enviar = async () => {
    if (enviando) return;

    // Precisa ter passado pelo Peniel
    if (form.passouPeniel !== "Sim") {
      setErro("Responda se você já passou pelo Encontro Peniel.");
      return;
    }

    // Data de nascimento livre: valida e converte DD/MM/AAAA -> YYYY-MM-DD
    const nascimentoIso = dataBrParaIso(form.nascimento);
    if (!nascimentoIso) {
      setErro("Informe uma data de nascimento válida (DD/MM/AAAA).");
      return;
    }

    // Obrigatórios (feedback rápido no client)
    if (!form.temMedicamento) {
      setErro("Responda se você toma algum medicamento.");
      return;
    }
    if (form.temMedicamento === "Sim" && !form.medicamento.trim()) {
      setErro("Informe qual medicamento você toma.");
      return;
    }
    if (!form.temDoenca) {
      setErro("Responda se você tem alguma doença crônica.");
      return;
    }
    if (form.temDoenca === "Sim" && !form.doenca.trim()) {
      setErro("Informe qual doença crônica você tem.");
      return;
    }

    setErro("");
    setEnviando(true);

    const res = await criarInscricao({
      igreja: form.igreja,
      igrejaCustom: form.igrejaCustom,
      nome: form.nome,
      cpf: form.cpf,
      nascimento: nascimentoIso,
      sexo: form.sexo,
      whatsapp: form.whatsapp,
      celula: form.celula,
      autorizaImagem:
        form.autorizaImagem === "" ? null : form.autorizaImagem === "Sim",
      emergenciaNome: form.emergenciaNome,
      emergenciaTel: form.emergenciaTel,
      medicamento: form.temMedicamento === "Sim" ? form.medicamento : null,
      doenca: form.temDoenca === "Sim" ? form.doenca : null,
    });

    setEnviando(false);
    if (res.ok) {
      window.location.href = `/pagamento?doc=${res.whatsapp}`;
      return;
    }
    setErro(res.erro);
  };

  // ===== Bloqueio: não passou pelo Peniel =====
  if (form.passouPeniel === "Não") {
    return (
      <div
        data-zone="deep"
        className="flex min-h-screen flex-col items-center justify-center bg-abismo px-6 text-center text-luz"
      >
        <div className="w-full max-w-md space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-aviso/30 bg-aviso/10 text-3xl">
            🌊
          </div>
          <h1 className="font-display text-2xl font-extrabold text-luz">
            Ainda não é a sua hora de mergulhar
          </h1>
          <p className="text-sm leading-relaxed text-corrente">
            O <strong className="text-luz">Submergidos</strong> é o próximo nível para quem
            já viveu o <strong className="text-luz">Encontro Peniel</strong>. Por isso, só é
            possível participar do Submergidos se você já tiver passado pelo Peniel.
          </p>
          <p className="text-sm leading-relaxed text-corrente">
            Fale com a liderança da sua célula para participar do próximo Peniel — e nos
            vemos no Submergidos em breve!
          </p>
          <div className="space-y-2 pt-2">
            <a
              href={WHATSAPP}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full rounded-control border border-white/10 py-3 text-sm font-semibold text-corrente transition hover:text-luz"
            >
              Falar com a liderança
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ===== Formulário =====
  return (
    <div data-zone="deep" className="min-h-screen bg-abismo pb-16 text-luz">
      {/* topo */}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-white/5 bg-abismo/90 px-4 py-3 backdrop-blur">
        <Link
          href="/"
          className="rounded-control border border-white/10 px-3 py-2 text-sm font-bold text-corrente transition hover:text-luz"
        >
          ←
        </Link>
        <span className="font-display text-base font-bold text-luz">
          Inscrição · Submergidos
        </span>
      </header>

      <div className="mx-auto max-w-md px-5">
        {/* info do sítio */}
        <div className="mt-5 rounded-card border border-mar/20 bg-mar/10 px-4 py-3 text-sm leading-relaxed text-luz">
          <strong className="text-mar">Dias 4, 5 e 6 de setembro</strong>
          <br />
          <span className="text-corrente">
            Endereço: Estrada do Tronco 485, Itaquaquecetuba
          </span>
          <a
            href={SITIO}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block text-xs text-raso underline"
          >
            Conheça o sítio
          </a>
        </div>

        <Label>Já passou pelo Encontro Peniel? *</Label>
        <Chips
          options={["Sim", "Não"]}
          value={form.passouPeniel}
          onPick={(v) => set({ passouPeniel: v as Sim })}
        />

        <Label>Igreja *</Label>
        <Chips
          options={IGREJAS}
          value={form.igreja}
          onPick={(v) => set({ igreja: v })}
        />
        {form.igreja === "Outra" && (
          <input
            className={inputCls + " mt-3"}
            placeholder="Nome da sua igreja"
            value={form.igrejaCustom}
            onChange={(e) => set({ igrejaCustom: e.target.value })}
          />
        )}

        <Label>Nome completo *</Label>
        <input
          className={inputCls}
          placeholder="Sem abreviações"
          value={form.nome}
          onChange={(e) => set({ nome: e.target.value })}
        />

        <Label>CPF *</Label>
        <input
          className={inputCls}
          inputMode="numeric"
          placeholder="000.000.000-00"
          value={form.cpf}
          onChange={(e) => set({ cpf: maskCpf(e.target.value) })}
        />

        <Label>Data de nascimento *</Label>
        <input
          className={inputCls}
          inputMode="numeric"
          placeholder="DD/MM/AAAA"
          value={form.nascimento}
          onChange={(e) => set({ nascimento: maskData(e.target.value) })}
        />

        <Label>Sexo *</Label>
        <Chips
          options={["Feminino", "Masculino"]}
          value={
            form.sexo === "feminino"
              ? "Feminino"
              : form.sexo === "masculino"
                ? "Masculino"
                : ""
          }
          onPick={(v) =>
            set({ sexo: v === "Feminino" ? "feminino" : "masculino" })
          }
        />

        <Label>WhatsApp *</Label>
        <input
          className={inputCls}
          type="tel"
          placeholder="(11) 99999-9999"
          value={form.whatsapp}
          onChange={(e) => set({ whatsapp: maskTel(e.target.value) })}
        />

        <Label>Célula *</Label>
        <select
          className={inputCls}
          value={form.celula}
          onChange={(e) => set({ celula: e.target.value })}
        >
          <option value="">Selecione sua célula…</option>
          {CELULAS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <Label>Autoriza uso de imagem? *</Label>
        <div className="mb-3 rounded-card border border-white/10 bg-white/5 px-4 py-3 text-sm leading-relaxed text-corrente">
          Sua história pode transformar outras vidas. As imagens do evento serão
          usadas como testemunho para alcançar quem ainda precisa de um encontro
          com Deus.
        </div>
        <Chips
          options={["Sim", "Não"]}
          value={form.autorizaImagem}
          onPick={(v) => set({ autorizaImagem: v as Sim })}
        />

        <Label>Contato de emergência *</Label>
        <input
          className={inputCls + " mb-2"}
          placeholder="Nome do contato"
          value={form.emergenciaNome}
          onChange={(e) => set({ emergenciaNome: e.target.value })}
        />
        <input
          className={inputCls}
          type="tel"
          placeholder="Telefone do contato"
          value={form.emergenciaTel}
          onChange={(e) => set({ emergenciaTel: maskTel(e.target.value) })}
        />

        <Label>Toma algum medicamento? *</Label>
        <Chips
          options={["Sim", "Não"]}
          value={form.temMedicamento}
          onPick={(v) => set({ temMedicamento: v as Sim })}
        />
        {form.temMedicamento === "Sim" && (
          <input
            className={inputCls + " mt-3"}
            placeholder="Qual medicamento?"
            value={form.medicamento}
            onChange={(e) => set({ medicamento: e.target.value })}
          />
        )}

        <Label>Tem alguma doença crônica? *</Label>
        <Chips
          options={["Sim", "Não"]}
          value={form.temDoenca}
          onPick={(v) => set({ temDoenca: v as Sim })}
        />
        {form.temDoenca === "Sim" && (
          <input
            className={inputCls + " mt-3"}
            placeholder="Qual doença?"
            value={form.doenca}
            onChange={(e) => set({ doenca: e.target.value })}
          />
        )}

        {erro && (
          <div className="mt-6 rounded-card border border-alerta/30 bg-alerta/10 px-4 py-3 text-sm text-alerta">
            {erro}
          </div>
        )}

        <button
          type="button"
          onClick={enviar}
          disabled={enviando}
          className="mt-7 w-full rounded-card bg-mar py-4 text-center font-semibold text-white shadow-glow transition active:scale-[0.98] disabled:opacity-60"
        >
          {enviando ? "Enviando…" : "Enviar inscrição"}
        </button>

        <Image
          src="/fonte-logo.png"
          alt="Fonte"
          width={120}
          height={120}
          className="mx-auto mt-10 h-12 w-auto opacity-60"
        />
      </div>

      <BotoesFlutuantes />
    </div>
  );
}
