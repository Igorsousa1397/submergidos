// Campo de bolhas decorativo das zonas imersivas (login, heróis).
// Server Component sem estado: os "aleatórios" são determinísticos por índice
// (hash seno), então o HTML do servidor bate com o do client — sem mismatch
// de hidratação. Animação 100% CSS (.bolha em globals.css); em
// prefers-reduced-motion as bolhas somem.
const rand = (i: number, salt: number) => {
  const x = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export function Bolhas({ quantidade = 16 }: { quantidade?: number }) {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: quantidade }, (_, i) => {
        const tamanho = 4 + rand(i, 1) * 12; // 4–16px
        const esquerda = rand(i, 2) * 100; // 0–100%
        const duracao = 9 + rand(i, 3) * 12; // 9–21s
        // delay negativo: no primeiro paint já há bolhas no meio do caminho
        const delay = -rand(i, 4) * duracao;
        const deriva = (rand(i, 5) - 0.5) * 48; // -24px..24px
        const opacidade = 0.15 + rand(i, 6) * 0.25; // .15–.4
        return (
          <span
            key={i}
            className="bolha"
            style={{
              left: `${esquerda}%`,
              width: tamanho,
              height: tamanho,
              ["--bolha-dur" as string]: `${duracao}s`,
              ["--bolha-delay" as string]: `${delay}s`,
              ["--bolha-deriva" as string]: `${deriva}px`,
              ["--bolha-op" as string]: opacidade,
            }}
          />
        );
      })}
    </div>
  );
}
