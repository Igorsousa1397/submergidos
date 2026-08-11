import { Camera } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { exigirTela } from "@/lib/acesso";

// Uso de Imagem: encontristas que NÃO autorizaram o uso de imagem na
// inscrição (a equipe de mídia precisa saber quem não pode aparecer).
// Acesso: gestão ou tela "img" concedida no Back Office (equipe de mídia).

const AMARELO = "#ffd60a";
const cardCls = "rounded-card border border-[rgba(164,214,232,0.12)] bg-[rgba(0,14,33,0.5)]";

export default async function UsoImagemPage() {
  await exigirTela("img");

  const supabase = await createClient();
  const { data } = await supabase
    .from("encontristas")
    .select("id, nome, sexo, celula")
    .eq("autoriza_imagem", false)
    .neq("status", "desistiu")
    .order("nome", { ascending: true });

  const lista = data ?? [];

  return (
    <div className="mx-auto max-w-md space-y-4 p-4">
      <div className={`${cardCls} flex items-center justify-between p-4`}>
        <div className="flex items-center gap-2">
          <Camera size={20} className="text-raso" />
          <h1 className="font-display text-lg font-bold text-luz">Uso de Imagem</h1>
        </div>
        <span className="text-xs text-corrente">{lista.length} sem autorização</span>
      </div>

      <div
        className="rounded-card border px-4 py-3 text-xs font-semibold"
        style={{ borderColor: "rgba(255,214,10,0.25)", background: "rgba(255,214,10,0.07)", color: AMARELO }}
      >
        📷 Encontristas que NÃO autorizaram uso de imagem — não podem aparecer em
        fotos e vídeos divulgados.
      </div>

      {lista.length === 0 ? (
        <p className="py-10 text-center text-sm text-corrente">Todos autorizaram! ✓</p>
      ) : (
        <div className="space-y-2">
          {lista.map((e) => (
            <div key={e.id} className={cardCls} style={{ borderLeft: `3px solid ${AMARELO}` }}>
              <div className="p-4">
                <p className="text-sm font-semibold text-luz">{e.nome}</p>
                <p className="mt-0.5 text-xs text-corrente">
                  {e.sexo === "masculino" ? "Masculino" : e.sexo === "feminino" ? "Feminino" : "—"} ·{" "}
                  {e.celula || "Sem célula"}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
