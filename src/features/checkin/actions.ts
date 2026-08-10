"use server";

import { createClient } from "@/lib/supabase/server";

// Marca/desmarca a chegada do encontrista. RLS garante que só admin/líderes
// (lider_celula, lider_templo, lider_staff, lider_quartos) conseguem gravar —
// a operação de check-in é feita pela equipe na porta do evento.
// Ao desfazer a chegada, também libera o ônibus (quem não chegou não ocupa vaga).
export async function alternarCheckin(id: string, chegou: boolean) {
  const supabase = await createClient();

  const patch: {
    chegou: boolean;
    checkin_at: string | null;
    onibus_id?: null;
  } = {
    chegou,
    checkin_at: chegou ? new Date().toISOString() : null,
  };
  if (!chegou) patch.onibus_id = null;

  const { error } = await supabase.from("encontristas").update(patch).eq("id", id);

  if (error) return { ok: false, erro: error.message };
  return { ok: true };
}

// Atribui (ou remove, com null) o ônibus do encontrista.
export async function atribuirOnibus(id: string, onibusId: string | null) {
  const supabase = await createClient();

  const { error } = await supabase
    .from("encontristas")
    .update({ onibus_id: onibusId })
    .eq("id", id);

  if (error) return { ok: false, erro: error.message };
  return { ok: true };
}
