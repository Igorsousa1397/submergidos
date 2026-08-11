"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import dynamic from "next/dynamic";
import { QrCode, Check } from "lucide-react";
import { alternarCheckin, atribuirOnibus } from "../actions";
import type { CheckinRow, OnibusInfo } from "../queries";

// scanner só carrega no client e sob demanda (html5-qrcode acessa a câmera).
const CheckinScanner = dynamic(
  () => import("./checkin-scanner").then((m) => m.CheckinScanner),
  { ssr: false },
);

type Sexo = "feminino" | "masculino";
type SubAba = "pendentes" | "confirmados";

const OK = "#12b5a6";
const AVISO = "#e0a23c";

const fmtHora = (iso: string | null) => {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
};

const cardCls =
  "rounded-card border border-[rgba(164,214,232,0.12)] bg-[rgba(0,14,33,0.5)]";

export function CheckinView({
  encontristas,
  onibus: onibusInit,
}: {
  encontristas: CheckinRow[];
  onibus: OnibusInfo[];
}) {
  const [rows, setRows] = useState<CheckinRow[]>(encontristas);
  const [onibus, setOnibus] = useState<OnibusInfo[]>(onibusInit);
  useEffect(() => setRows(encontristas), [encontristas]);
  useEffect(() => setOnibus(onibusInit), [onibusInit]);

  const [sexo, setSexo] = useState<Sexo>("feminino");
  const [sub, setSub] = useState<SubAba>("pendentes");
  const [busca, setBusca] = useState("");
  const [scanning, setScanning] = useState(false);
  const [toast, setToast] = useState<{ tipo: "ok" | "erro"; msg: string } | null>(null);
  // id do card recém-confirmado: só ele "enche de água" (não anima os que
  // já estavam confirmados ao trocar de aba)
  const [recemChegou, setRecemChegou] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!recemChegou) return;
    const t = setTimeout(() => setRecemChegou(null), 1800);
    return () => clearTimeout(t);
  }, [recemChegou]);

  // contadores GLOBAIS (todos os sexos), como na referência
  const stats = useMemo(() => {
    const total = rows.length;
    const chegaram = rows.filter((r) => r.chegou).length;
    return { total, chegaram, pendentes: total - chegaram };
  }, [rows]);

  const contSexo = useMemo(() => {
    const doSexo = rows.filter((r) => r.sexo === sexo);
    return {
      pendentes: doSexo.filter((r) => !r.chegou).length,
      confirmados: doSexo.filter((r) => r.chegou).length,
    };
  }, [rows, sexo]);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return rows.filter((r) => {
      if (r.sexo !== sexo) return false;
      if (sub === "pendentes" ? r.chegou : !r.chegou) return false;
      if (q && !r.nome.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, sexo, sub, busca]);

  // ônibus elegíveis para uma pessoa: tipo igual ao sexo + com vaga (ou o já
  // atribuído). Ônibus de "servos" não recebe encontrista pelo check-in.
  const onibusPara = (r: CheckinRow) =>
    onibus.filter(
      (o) =>
        o.tipo === r.sexo &&
        (o.id === r.onibus_id || o.capacidade == null || o.ocupacao < o.capacidade),
    );

  const alternar = (id: string, novo: boolean) => {
    const anterior = rows.find((r) => r.id === id);
    if (!anterior) return;
    const oldOnibus = anterior.onibus_id;

    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              chegou: novo,
              checkin_at: novo ? new Date().toISOString() : null,
              onibus_id: novo ? r.onibus_id : null,
            }
          : r,
      ),
    );
    // ao desfazer, libera a vaga no ônibus que ocupava
    if (!novo && oldOnibus) {
      setOnibus((prev) =>
        prev.map((o) => (o.id === oldOnibus ? { ...o, ocupacao: Math.max(0, o.ocupacao - 1) } : o)),
      );
    }
    // ao confirmar, leva pra aba Confirmados do sexo da pessoa (pra escolher ônibus)
    if (novo && (anterior.sexo === "masculino" || anterior.sexo === "feminino")) {
      setSexo(anterior.sexo);
      setSub("confirmados");
    }
    setRecemChegou(novo ? id : null);

    startTransition(async () => {
      const res = await alternarCheckin(id, novo);
      if (!res.ok) {
        setRows((prev) => prev.map((r) => (r.id === id ? anterior : r)));
        if (!novo && oldOnibus) {
          setOnibus((prev) =>
            prev.map((o) => (o.id === oldOnibus ? { ...o, ocupacao: o.ocupacao + 1 } : o)),
          );
        }
        setToast({
          tipo: "erro",
          msg: res.erro?.includes("row-level")
            ? "Sem permissão para fazer check-in."
            : "Não foi possível salvar o check-in.",
        });
      }
    });
  };

  const atribuir = (encId: string, novoOnibus: string | null) => {
    const enc = rows.find((r) => r.id === encId);
    if (!enc) return;
    const antigo = enc.onibus_id;
    if (antigo === novoOnibus) return;

    setRows((prev) => prev.map((r) => (r.id === encId ? { ...r, onibus_id: novoOnibus } : r)));
    setOnibus((prev) =>
      prev.map((o) => {
        if (o.id === antigo) return { ...o, ocupacao: Math.max(0, o.ocupacao - 1) };
        if (o.id === novoOnibus) return { ...o, ocupacao: o.ocupacao + 1 };
        return o;
      }),
    );

    startTransition(async () => {
      const res = await atribuirOnibus(encId, novoOnibus);
      if (!res.ok) {
        // reverte atribuição e lotação
        setRows((prev) => prev.map((r) => (r.id === encId ? { ...r, onibus_id: antigo } : r)));
        setOnibus((prev) =>
          prev.map((o) => {
            if (o.id === novoOnibus) return { ...o, ocupacao: Math.max(0, o.ocupacao - 1) };
            if (o.id === antigo) return { ...o, ocupacao: o.ocupacao + 1 };
            return o;
          }),
        );
        setToast({
          tipo: "erro",
          msg: res.erro?.includes("row-level")
            ? "Sem permissão para atribuir ônibus."
            : "Não foi possível salvar o ônibus.",
        });
      }
    });
  };

  const aoEscanear = (texto: string) => {
    setScanning(false);
    const id = texto.trim();
    const enc = rows.find((r) => r.id === id);
    if (!enc) {
      setToast({ tipo: "erro", msg: "QR Code não corresponde a um encontrista confirmado." });
      return;
    }
    if (enc.chegou) {
      setToast({ tipo: "ok", msg: `${enc.nome.split(" ")[0]} já havia feito check-in.` });
      return;
    }
    alternar(enc.id, true);
    setToast({ tipo: "ok", msg: `Check-in feito: ${enc.nome}` });
  };

  const exportarCSV = () => {
    const confirmados = rows.filter((r) => r.chegou);
    const nomeOnibus = new Map(onibus.map((o) => [o.id, o.identificacao]));
    const cab = ["Nome", "CPF", "Célula", "Sexo", "Ônibus", "Check-in"];
    const linhas = confirmados.map((e) => [
      e.nome,
      e.cpf ?? "",
      e.celula ?? "Sem célula",
      e.sexo ?? "",
      e.onibus_id ? nomeOnibus.get(e.onibus_id) ?? "" : "",
      fmtHora(e.checkin_at),
    ]);
    const csv = [cab, ...linhas]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "checkin-submergidos.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      {/* contadores */}
      <div className="grid grid-cols-3 gap-3">
        {([
          ["Total", stats.total, undefined],
          ["Chegaram", stats.chegaram, OK],
          ["Pendentes", stats.pendentes, AVISO],
        ] as [string, number, string | undefined][]).map(([label, valor, cor]) => (
          <div key={label} className={`${cardCls} p-4 text-center`}>
            <p
              className="font-display text-3xl font-extrabold text-luz"
              style={cor ? { color: cor } : undefined}
            >
              {valor}
            </p>
            <p className="mt-1 text-[11px] uppercase tracking-wide text-corrente">{label}</p>
          </div>
        ))}
      </div>

      {/* escanear QR */}
      <button
        onClick={() => setScanning(true)}
        className="flex w-full items-center justify-center gap-2 rounded-control py-3.5 text-sm font-bold text-white transition active:scale-[0.98]"
        style={{ background: OK }}
      >
        <QrCode size={18} />
        Escanear QR Code
      </button>

      {/* exportar */}
      <button
        onClick={exportarCSV}
        className="w-full rounded-control border border-[rgba(164,214,232,0.18)] py-3 text-sm font-semibold text-corrente transition hover:text-luz active:scale-[0.98]"
      >
        Exportar Excel (confirmados)
      </button>

      {/* abas de sexo */}
      <div className="flex gap-2">
        {([
          ["feminino", "Mulheres"],
          ["masculino", "Homens"],
        ] as [Sexo, string][]).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setSexo(val)}
            className={`flex-1 rounded-control py-2 text-sm font-semibold transition ${
              sexo === val
                ? "font-bold"
                : "border border-[rgba(164,214,232,0.18)] text-corrente hover:text-luz"
            }`}
            style={sexo === val ? { background: "#dcf1f8", color: "#00060f" } : undefined}
          >
            {label}
          </button>
        ))}
      </div>

      {/* sub-abas de status de chegada */}
      <div className="flex gap-2">
        {([
          ["pendentes", "Pendentes", contSexo.pendentes, AVISO],
          ["confirmados", "Confirmados", contSexo.confirmados, OK],
        ] as [SubAba, string, number, string][]).map(([val, label, n, cor]) => (
          <button
            key={val}
            onClick={() => setSub(val)}
            className="flex-1 rounded-control py-2 text-sm font-semibold transition"
            style={
              sub === val
                ? { background: cor, color: "#fff" }
                : { border: `1px solid ${cor}55`, color: cor }
            }
          >
            {label} ({n})
          </button>
        ))}
      </div>

      {/* busca */}
      <input
        placeholder="Buscar..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        className="w-full rounded-control border border-[rgba(164,214,232,0.18)] bg-[rgba(0,14,33,0.6)] px-3 py-3 text-sm text-luz outline-none placeholder:text-corrente focus:border-raso"
      />

      {/* lista */}
      <div className="space-y-2">
        {lista.length === 0 ? (
          <p className="py-8 text-center text-sm text-corrente">
            {sub === "pendentes" ? "Ninguém pendente por aqui." : "Ninguém confirmado ainda."}
          </p>
        ) : (
          lista.map((e) => {
            const opcoes = onibusPara(e);
            return (
              <div
                key={e.id}
                className={`${cardCls} relative flex items-center gap-3 overflow-hidden p-4`}
                style={e.chegou ? { borderLeft: `3px solid ${OK}` } : undefined}
              >
                {/* água subindo no card recém-confirmado (decorativo, roda 1x) */}
                {recemChegou === e.id && (
                  <span aria-hidden className="agua-sobe pointer-events-none absolute inset-0" />
                )}
                {/* toca no círculo/nome pra alternar chegada */}
                <button
                  onClick={() => alternar(e.id, !e.chegou)}
                  disabled={pending}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:opacity-60"
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition ${
                      recemChegou === e.id ? "pop-check" : ""
                    }`}
                    style={
                      e.chegou
                        ? { background: OK, borderColor: OK }
                        : { borderColor: "rgba(164,214,232,0.35)" }
                    }
                  >
                    {e.chegou && <Check size={14} className="text-white" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-luz">{e.nome}</span>
                    <span className="block truncate text-xs text-corrente">
                      {e.celula || "Sem célula"}
                      {e.chegou && e.checkin_at ? ` · ${fmtHora(e.checkin_at)}` : ""}
                    </span>
                  </span>
                </button>

                {/* dropdown de ônibus — só na aba Confirmados */}
                {sub === "confirmados" && (
                  <select
                    value={e.onibus_id ?? ""}
                    onChange={(ev) => atribuir(e.id, ev.target.value || null)}
                    disabled={pending}
                    className="shrink-0 rounded-control border border-[rgba(164,214,232,0.18)] bg-[rgba(0,14,33,0.6)] px-2 py-1.5 text-xs text-luz outline-none focus:border-raso disabled:opacity-60"
                  >
                    <option value="">Ônibus?</option>
                    {opcoes.map((o) => {
                      const vagas = o.capacidade == null ? null : o.capacidade - o.ocupacao;
                      const sufixo =
                        vagas == null ? "" : vagas > 0 ? ` (${vagas} vaga${vagas > 1 ? "s" : ""})` : " (cheio)";
                      return (
                        <option key={o.id} value={o.id}>
                          {o.identificacao}
                          {sufixo}
                        </option>
                      );
                    })}
                    {opcoes.length === 0 && (
                      <option value="" disabled>
                        Nenhum ônibus disponível
                      </option>
                    )}
                  </select>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* toast */}
      {toast && (
        <div
          className="fixed inset-x-0 bottom-4 z-40 mx-auto max-w-md px-4"
          onClick={() => setToast(null)}
        >
          <div
            className="rounded-card border px-4 py-3 text-center text-sm font-semibold shadow-glow"
            style={
              toast.tipo === "ok"
                ? { background: "rgba(18,181,166,0.15)", borderColor: "rgba(18,181,166,0.4)", color: OK }
                : { background: "rgba(229,86,78,0.12)", borderColor: "rgba(229,86,78,0.4)", color: "#f0a39e" }
            }
          >
            {toast.msg}
          </div>
        </div>
      )}

      {/* scanner */}
      {scanning && <CheckinScanner onScan={aoEscanear} onClose={() => setScanning(false)} />}
    </div>
  );
}
