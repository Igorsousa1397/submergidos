import { getSaudeData } from "@/features/saude/queries";
import { SaudeView } from "@/features/saude/components/saude-view";
import { exigirTela } from "@/lib/acesso";

// Saúde: dado sensível — gestão ou tela "saude" concedida no Back Office
// (o RLS pode_saude() reforça a mesma regra no banco).
export default async function SaudePage() {
  await exigirTela("saude");
  const dados = await getSaudeData();
  return <SaudeView dados={dados} />;
}
