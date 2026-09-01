"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, CalendarDays } from "lucide-react";
import { BottomSheet } from "@/components/bottom-sheet";
import { criarItemAgenda, atualizarItemAgenda, removerItemAgenda } from "../actions";
import { DIAS_AGENDA, DIA_LABEL, corDoDia, type AgendaRow } from "../shared";

const OK = "#12b5a6";
const cardCls = "rounded-card border border-[rgba(164,214,232,0.12)] bg-[rgba(0,14,33,0.5)]";
const inputCls =
  "w-full rounded-control border border-[rgba(164,214,232,0.18)] bg-[rgba(0,14,33,0.6)] px-3 py-2.5 text-sm text-luz outline-none placeholder:text-corrente focus:border-raso";

// mesmas cores cíclicas usadas na home do servo

const fmtHora = (hora: string | null) => (hora ? hora.slice(0, 5) : null);

interface Form {
  titulo: string;
  dia: string;
  hora: string;
  ministrante: string;
  descricao: string;
  aviso: string;
}
const FORM_VAZIO: Form = { titulo: "", dia: "quinta", hora: "", ministrante: "", descricao: "", aviso: "" };

export function AgendaView({ itens, admin }: { itens: AgendaRow[]; admin: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState("");
  const [dia, setDia] = useState<string>("quinta");
  const [sheetAberto, setSheetAberto] = useState(false);
  const [editId, setEditId] = useState<string | null>(null); // null = criando
  const [form, setForm] = useState<Form>(FORM_VAZIO);

  const porDia = useMemo(() => itens.filter((i) => i.dia === dia), [itens, dia]);

  const contagem = useMemo(() => {
    const c = new Map<string, number>();
    for (const i of itens) c.set(i.dia ?? "", (c.get(i.dia ?? "") ?? 0) + 1);
    return c;
  }, [itens]);

  const abrirNovo = () => {
    setEditId(null);
    setForm({ ...FORM_VAZIO, dia });
    setErro("");
    setSheetAberto(true);
  };

  const abrirEdicao = (item: AgendaRow) => {
    setEditId(item.id);
    setForm({
      titulo: item.titulo,
      dia: item.dia ?? "quinta",
      hora: fmtHora(item.hora) ?? "",
      ministrante: item.ministrante ?? "",
      descricao: item.descricao ?? "",
      aviso: item.aviso ?? "",
    });
    setErro("");
    setSheetAberto(true);
  };

  const salvar = () => {
    setErro("");
    startTransition(async () => {
      const res = editId ? await atualizarItemAgenda(editId, form) : await criarItemAgenda(form);
      if (!res.ok) return setErro(res.erro ?? "Não foi possível salvar.");
      setSheetAberto(false);
      setDia(form.dia);
      router.refresh();
    });
  };

  const remover = (item: AgendaRow) => {
    if (!confirm(`Remover "${item.titulo}" da agenda?`)) return;
    setErro("");
    startTransition(async () => {
      const res = await removerItemAgenda(item.id);
      if (!res.ok) setErro(res.erro ?? "Não foi possível remover.");
      router.refresh();
    });
  };

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      {/* header */}
      <div className={`${cardCls} flex items-center justify-between p-4`}>
        <div className="flex items-center gap-2">
          <CalendarDays size={20} className="text-raso" />
          <h1 className="font-display text-lg font-bold text-luz">Agenda</h1>
        </div>
        <span className="text-xs text-corrente">{itens.length} atividades</span>
      </div>

      {admin && (
        <button
          onClick={abrirNovo}
          className="flex w-full items-center justify-center gap-2 rounded-control border border-[rgba(164,214,232,0.18)] py-3 text-sm font-semibold text-corrente transition hover:text-luz active:scale-[0.98]"
        >
          <Plus size={15} /> Nova atividade
        </button>
      )}

      {erro && !sheetAberto && (
        <div
          className="rounded-card border px-4 py-3 text-sm"
          style={{ borderColor: "rgba(229,86,78,0.3)", background: "rgba(229,86,78,0.1)", color: "#f0a39e" }}
        >
          {erro}
        </div>
      )}

      {/* abas por dia */}
      <div className="grid grid-cols-4 gap-2">
        {DIAS_AGENDA.map((d) => (
          <button
            key={d}
            onClick={() => setDia(d)}
            className={`rounded-control py-2 text-xs font-semibold transition ${
              dia === d
                ? "font-bold"
                : "border border-[rgba(164,214,232,0.18)] text-corrente hover:text-luz"
            }`}
            style={dia === d ? { background: "#dcf1f8", color: "#00060f" } : undefined}
          >
            {DIA_LABEL[d]}
            {(contagem.get(d) ?? 0) > 0 ? ` (${contagem.get(d)})` : ""}
          </button>
        ))}
      </div>

      {/* lista do dia */}
      <div className="space-y-2">
        {porDia.length === 0 ? (
          <div className="py-10 text-center">
            <p className="text-sm text-corrente">
              Nenhuma atividade em {DIA_LABEL[dia]} ainda.
            </p>
            {admin && (
              <p className="mt-1 text-xs text-corrente">
                Toque em “Nova atividade” quando tiver a programação.
              </p>
            )}
          </div>
        ) : (
          porDia.map((item) => (
            <div
              key={item.id}
              className={cardCls}
              style={{ borderLeft: `3px solid ${corDoDia(item.dia)}` }}
            >
              <div className="flex items-start justify-between gap-2 p-4">
                <div className="min-w-0">
                  <p className="font-semibold text-luz">{item.titulo}</p>
                  <p className="text-xs text-corrente">
                    {DIA_LABEL[item.dia ?? ""] ?? item.dia}
                    {fmtHora(item.hora) ? ` · ${fmtHora(item.hora)}` : ""}
                    {item.ministrante ? ` · ${item.ministrante}` : ""}
                  </p>
                  {item.descricao && (
                    <p className="mt-1 text-xs leading-relaxed text-corrente">{item.descricao}</p>
                  )}
                  {item.aviso && (
                    <p
                      className="mt-2 rounded-control px-2 py-1 text-xs"
                      style={{ background: "rgba(224,162,60,0.1)", color: "#e0a23c" }}
                    >
                      {item.aviso}
                    </p>
                  )}
                </div>
                {admin && (
                  <div className="flex shrink-0 gap-1">
                    <button
                      onClick={() => abrirEdicao(item)}
                      aria-label="Editar"
                      className="flex h-8 w-8 items-center justify-center rounded-control border border-[rgba(164,214,232,0.18)] text-corrente transition hover:text-luz"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => remover(item)}
                      disabled={pending}
                      aria-label="Remover"
                      className="flex h-8 w-8 items-center justify-center rounded-control border transition disabled:opacity-50"
                      style={{ borderColor: "rgba(229,86,78,0.4)", color: "#e5564e" }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* sheet criar/editar */}
      <BottomSheet
        titulo={editId ? "Editar atividade" : "Nova atividade"}
        aberto={sheetAberto}
        onClose={() => setSheetAberto(false)}
      >
        <div className="space-y-3">
          <input
            placeholder="Título *"
            value={form.titulo}
            onChange={(e) => setForm((v) => ({ ...v, titulo: e.target.value }))}
            className={inputCls}
          />
          <div>
            <p className="mb-1 text-[11px] uppercase tracking-wide text-corrente">Dia</p>
            <div className="grid grid-cols-4 gap-2">
              {DIAS_AGENDA.map((d) => (
                <button
                  key={d}
                  onClick={() => setForm((v) => ({ ...v, dia: d }))}
                  className="rounded-control border py-2 text-xs font-semibold transition"
                  style={
                    form.dia === d
                      ? { borderColor: "#a4d6e8", color: "#00060f", background: "#dcf1f8" }
                      : { borderColor: "rgba(164,214,232,0.18)", color: "#416a87" }
                  }
                >
                  {DIA_LABEL[d]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1 text-[11px] uppercase tracking-wide text-corrente">Hora</p>
            <input
              type="time"
              value={form.hora}
              onChange={(e) => setForm((v) => ({ ...v, hora: e.target.value }))}
              style={{ colorScheme: "dark" }}
              className={inputCls}
            />
          </div>
          <input
            placeholder="Ministrante (opcional)"
            value={form.ministrante}
            onChange={(e) => setForm((v) => ({ ...v, ministrante: e.target.value }))}
            className={inputCls}
          />
          <textarea
            placeholder="Descrição (opcional)"
            value={form.descricao}
            onChange={(e) => setForm((v) => ({ ...v, descricao: e.target.value }))}
            rows={3}
            className={inputCls}
          />
          <input
            placeholder="Aviso destacado (opcional)"
            value={form.aviso}
            onChange={(e) => setForm((v) => ({ ...v, aviso: e.target.value }))}
            className={inputCls}
          />
          {erro && (
            <p className="text-sm" style={{ color: "#f0a39e" }}>
              {erro}
            </p>
          )}
          <button
            onClick={salvar}
            disabled={pending}
            className="w-full rounded-control py-3.5 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
            style={{ background: OK }}
          >
            {pending ? "Salvando..." : editId ? "Salvar alterações" : "Adicionar à agenda"}
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
