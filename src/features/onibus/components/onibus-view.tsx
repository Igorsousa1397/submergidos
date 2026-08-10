"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bus, Trash2, Plus, X, ChevronDown, ChevronUp, Pencil } from "lucide-react";
import {
  criarOnibus,
  atualizarOnibus,
  definirMalas,
  removerOnibus,
  adicionarEquipe,
  removerEquipe,
} from "../actions";
import type { OnibusRow, OnibusTipo, OnibusPapel, ServoOption } from "../queries";

const OK = "#12b5a6";
const cardCls = "rounded-card border border-[rgba(164,214,232,0.12)] bg-[rgba(0,14,33,0.5)]";
const inputCls =
  "w-full rounded-control border border-[rgba(164,214,232,0.18)] bg-[rgba(0,14,33,0.6)] px-3 py-2.5 text-sm text-luz outline-none placeholder:text-corrente focus:border-raso";

const TIPO_LABEL: Record<OnibusTipo, string> = {
  feminino: "Feminino",
  masculino: "Masculino",
  servos: "Servos",
};
const TIPO_COR: Record<OnibusTipo, string> = {
  feminino: "#c084fc",
  masculino: "#1e8fcc",
  servos: "#e0a23c",
};

interface FormState {
  identificacao: string;
  tipo: OnibusTipo | "";
  capacidade: string;
}
const FORM_VAZIO: FormState = { identificacao: "", tipo: "", capacidade: "" };

export function OnibusView({
  onibus,
  servos,
  admin,
}: {
  onibus: OnibusRow[];
  servos: ServoOption[];
  admin: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState("");
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState<FormState>(FORM_VAZIO);
  const [editId, setEditId] = useState<string | null>(null); // null = criando
  const [expandido, setExpandido] = useState<string | null>(null);

  const parseCap = (s: string) => {
    const n = parseInt(s, 10);
    return s.trim() === "" || Number.isNaN(n) ? null : n;
  };

  // roda a action e faz refresh do RSC (a página revalida e devolve dados frescos)
  const rodar = (fn: () => Promise<{ ok: boolean; erro?: string }>) => {
    setErro("");
    startTransition(async () => {
      const res = await fn();
      if (!res.ok) setErro(res.erro ?? "Não foi possível salvar.");
      router.refresh();
    });
  };

  const salvarForm = () => {
    setErro("");
    if (!form.identificacao.trim()) return setErro("Informe o número do ônibus.");
    if (!form.tipo) return setErro("Selecione o tipo do ônibus.");
    const input = {
      identificacao: form.identificacao.trim(),
      tipo: form.tipo,
      capacidade: parseCap(form.capacidade),
    };
    rodar(async () => {
      const res = editId ? await atualizarOnibus(editId, input) : await criarOnibus(input);
      if (res.ok) {
        setForm(FORM_VAZIO);
        setMostrarForm(false);
        setEditId(null);
      }
      return res;
    });
  };

  const editar = (o: OnibusRow) => {
    setEditId(o.id);
    setForm({
      identificacao: o.identificacao,
      tipo: o.tipo ?? "",
      capacidade: o.capacidade != null ? String(o.capacidade) : "",
    });
    setMostrarForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const remover = (o: OnibusRow) => {
    if (o.passageiros.length > 0)
      return setErro("Este ônibus tem passageiros atribuídos. Esvazie-o no check-in antes de remover.");
    if (!confirm(`Remover "${o.identificacao}"?`)) return;
    rodar(() => removerOnibus(o.id));
  };

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      {/* header / abrir form */}
      {admin && (
        <button
          onClick={() => {
            setMostrarForm((v) => !v);
            setEditId(null);
            setForm(FORM_VAZIO);
            setErro("");
          }}
          className="flex w-full items-center justify-center gap-2 rounded-control border border-[rgba(164,214,232,0.18)] py-3 text-sm font-semibold text-corrente transition hover:text-luz active:scale-[0.98]"
        >
          {mostrarForm ? (
            <>
              <X size={15} /> Cancelar
            </>
          ) : (
            <>
              <Plus size={15} /> Novo ônibus
            </>
          )}
        </button>
      )}

      {erro && (
        <div
          className="rounded-card border px-4 py-3 text-sm"
          style={{ borderColor: "rgba(229,86,78,0.3)", background: "rgba(229,86,78,0.1)", color: "#f0a39e" }}
        >
          {erro}
        </div>
      )}

      {/* form criar/editar */}
      {admin && mostrarForm && (
        <div className={`${cardCls} space-y-3 p-4`}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1 text-[11px] uppercase tracking-wide text-corrente">Número *</p>
              <input
                placeholder="Ex: 1"
                value={form.identificacao}
                onChange={(e) => setForm((v) => ({ ...v, identificacao: e.target.value }))}
                className={inputCls}
              />
            </div>
            <div>
              <p className="mb-1 text-[11px] uppercase tracking-wide text-corrente">Poltronas</p>
              <input
                type="number"
                min="0"
                placeholder="40"
                value={form.capacidade}
                onChange={(e) => setForm((v) => ({ ...v, capacidade: e.target.value }))}
                className={inputCls}
              />
            </div>
          </div>

          <div>
            <p className="mb-2 text-[11px] uppercase tracking-wide text-corrente">Tipo</p>
            <div className="flex gap-2">
              {(Object.keys(TIPO_LABEL) as OnibusTipo[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setForm((v) => ({ ...v, tipo: t }))}
                  className="flex-1 rounded-full border px-3 py-1.5 text-xs font-semibold transition"
                  style={
                    form.tipo === t
                      ? { borderColor: TIPO_COR[t], color: TIPO_COR[t], background: `${TIPO_COR[t]}1a` }
                      : { borderColor: "rgba(164,214,232,0.18)", color: "#416a87" }
                  }
                >
                  {TIPO_LABEL[t]}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={salvarForm}
            disabled={pending}
            className="w-full rounded-control py-3 text-sm font-bold text-white transition active:scale-[0.98] disabled:opacity-50"
            style={{ background: OK }}
          >
            {editId ? "Salvar alterações" : "Criar Ônibus"}
          </button>
        </div>
      )}

      {/* lista */}
      <div className="space-y-2">
        {onibus.length === 0 ? (
          <p className="py-8 text-center text-sm text-corrente">Nenhum ônibus cadastrado ainda.</p>
        ) : (
          onibus.map((o) => (
            <CardOnibus
              key={o.id}
              o={o}
              servos={servos}
              admin={admin}
              pending={pending}
              aberto={expandido === o.id}
              onToggle={() => setExpandido((v) => (v === o.id ? null : o.id))}
              onEditar={() => editar(o)}
              onRemover={() => remover(o)}
              rodar={rodar}
            />
          ))
        )}
      </div>

      {!admin && (
        <p className="pt-2 text-center text-xs text-corrente">
          Somente administradores podem cadastrar ou editar ônibus.
        </p>
      )}
    </div>
  );
}

function CardOnibus({
  o,
  servos,
  admin,
  pending,
  aberto,
  onToggle,
  onEditar,
  onRemover,
  rodar,
}: {
  o: OnibusRow;
  servos: ServoOption[];
  admin: boolean;
  pending: boolean;
  aberto: boolean;
  onToggle: () => void;
  onEditar: () => void;
  onRemover: () => void;
  rodar: (fn: () => Promise<{ ok: boolean; erro?: string }>) => void;
}) {
  const responsaveis = o.equipe.filter((e) => e.papel === "responsavel");
  const servosTemplo = o.equipe.filter((e) => e.papel === "servo_templo");
  const cor = o.tipo ? TIPO_COR[o.tipo] : "#416a87";

  // servos ainda não usados neste ônibus (pra não duplicar no picker)
  const usados = useMemo(() => new Set(o.equipe.map((e) => `${e.papel}:${e.servo_id}`)), [o.equipe]);
  const opcoes = (papel: OnibusPapel) => servos.filter((s) => !usados.has(`${papel}:${s.id}`));

  return (
    <div className={cardCls} style={{ borderLeft: `3px solid ${cor}` }}>
      {/* cabeçalho */}
      <button onClick={onToggle} className="flex w-full items-center gap-2 p-4 text-left">
        <Bus size={16} className="shrink-0 text-corrente" />
        <span className="min-w-0 flex-1 truncate font-semibold text-luz">
          Ônibus {o.identificacao}
        </span>
        {o.tipo && (
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold"
            style={{ color: cor, background: `${cor}1a` }}
          >
            {TIPO_LABEL[o.tipo]}
          </span>
        )}
        <span
          className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold"
          style={{ color: "#a4d6e8", background: "rgba(164,214,232,0.12)" }}
        >
          {o.passageiros.length}/{o.capacidade ?? "∞"}
        </span>
        {admin && (
          <span
            role="button"
            tabIndex={0}
            onClick={(ev) => {
              ev.stopPropagation();
              onRemover();
            }}
            onKeyDown={(ev) => {
              if (ev.key === "Enter" || ev.key === " ") {
                ev.stopPropagation();
                onRemover();
              }
            }}
            aria-label="Remover ônibus"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-control transition"
            style={{ color: "#e5564e" }}
          >
            <Trash2 size={14} />
          </span>
        )}
        {aberto ? (
          <ChevronUp size={16} className="shrink-0 text-corrente" />
        ) : (
          <ChevronDown size={16} className="shrink-0 text-corrente" />
        )}
      </button>

      {/* corpo expandido */}
      {aberto && (
        <div className="space-y-4 border-t border-[rgba(164,214,232,0.1)] px-4 py-4">
          <p className="text-xs text-corrente">{o.capacidade ?? "—"} vagas</p>

          {admin && (
            <button
              onClick={onEditar}
              className="flex w-full items-center justify-center gap-2 rounded-control border py-2.5 text-sm font-semibold transition active:scale-[0.98]"
              style={{ borderColor: "#e0a23c", color: "#e0a23c" }}
            >
              <Pencil size={14} /> Editar informações
            </button>
          )}

          {/* responsáveis */}
          <SecaoEquipe
            titulo="Responsáveis"
            max={2}
            membros={responsaveis}
            opcoes={opcoes("responsavel")}
            admin={admin}
            pending={pending}
            onAdd={(servoId) => rodar(() => adicionarEquipe(o.id, servoId, "responsavel"))}
            onDel={(servoId) => rodar(() => removerEquipe(o.id, servoId, "responsavel"))}
            placeholder="Adicionar responsável..."
          />

          {/* servos do templo */}
          <SecaoEquipe
            titulo="Servos do Templo"
            max={2}
            membros={servosTemplo}
            opcoes={opcoes("servo_templo")}
            admin={admin}
            pending={pending}
            onAdd={(servoId) => rodar(() => adicionarEquipe(o.id, servoId, "servo_templo"))}
            onDel={(servoId) => rodar(() => removerEquipe(o.id, servoId, "servo_templo"))}
            placeholder="Servo do templo..."
          />

          {/* passageiros via check-in */}
          <div>
            <p className="mb-2 text-[11px] uppercase tracking-widest text-corrente">
              Passageiros via check-in ({o.passageiros.length})
            </p>
            {o.passageiros.length === 0 ? (
              <p className="text-xs italic text-corrente">Nenhum ainda — atribua pelo Check-in</p>
            ) : (
              <div className="space-y-1">
                {o.passageiros.map((p) => (
                  <p key={p.id} className="truncate text-sm text-luz">
                    {p.nome}
                  </p>
                ))}
              </div>
            )}
          </div>

          {/* malas */}
          <div>
            <p className="mb-2 text-[11px] uppercase tracking-widest text-corrente">Malas</p>
            <select
              value={o.malas ?? ""}
              disabled={!admin || pending}
              onChange={(ev) =>
                rodar(() => definirMalas(o.id, (ev.target.value || null) as OnibusTipo | null))
              }
              className={inputCls}
            >
              <option value="">Selecione o tipo de mala...</option>
              <option value="feminino">Malas das mulheres</option>
              <option value="masculino">Malas dos homens</option>
              <option value="servos">Malas dos servos</option>
            </select>
          </div>
        </div>
      )}
    </div>
  );
}

function SecaoEquipe({
  titulo,
  max,
  membros,
  opcoes,
  admin,
  pending,
  onAdd,
  onDel,
  placeholder,
}: {
  titulo: string;
  max: number;
  membros: { servo_id: string; nome: string }[];
  opcoes: ServoOption[];
  admin: boolean;
  pending: boolean;
  onAdd: (servoId: string) => void;
  onDel: (servoId: string) => void;
  placeholder: string;
}) {
  return (
    <div>
      <p className="mb-2 text-[11px] uppercase tracking-widest text-corrente">
        {titulo} ({membros.length}/{max})
      </p>

      {membros.length > 0 && (
        <div className="mb-2 space-y-1">
          {membros.map((m) => (
            <div
              key={m.servo_id}
              className="flex items-center justify-between rounded-control border border-[rgba(164,214,232,0.12)] px-3 py-2"
            >
              <span className="truncate text-sm text-luz">{m.nome}</span>
              {admin && (
                <button
                  onClick={() => onDel(m.servo_id)}
                  disabled={pending}
                  aria-label={`Remover ${m.nome}`}
                  className="ml-2 shrink-0 text-corrente transition hover:text-alerta"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {admin && membros.length < max && (
        <select
          value=""
          disabled={pending}
          onChange={(ev) => ev.target.value && onAdd(ev.target.value)}
          className={inputCls}
        >
          <option value="">{placeholder}</option>
          {opcoes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}
