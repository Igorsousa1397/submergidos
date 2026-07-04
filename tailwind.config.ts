import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Profundezas — escala da capa
        abismo: "#00060f",
        breu: "#000e21",
        profundo: "#03213b",
        oceano: "#063d64",
        mar: { DEFAULT: "#146997", bright: "#1e8fcc" }, // marca
        corrente: "#416a87",
        raso: "#a4d6e8", // luz
        luz: "#dcf1f8",
        bruma: "#eaf6fb",
        espuma: "#ffffff",
        // Status do encontrista
        ok: { DEFAULT: "#12b5a6", bg: "#d9f6f2", fg: "#0a5f57" },
        aviso: { DEFAULT: "#e0a23c", bg: "#fbefd9", fg: "#7a5410" },
        alerta: { DEFAULT: "#e5564e", bg: "#fbe4e3", fg: "#8a211c" },
        neutro: { DEFAULT: "#6e8a9c", bg: "#e7eef2", fg: "#36505f" },
      },
      fontFamily: {
        display: ["Archivo", "system-ui", "sans-serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: { card: "14px", control: "10px" },
      boxShadow: {
        // brilho cyan para ações primárias na zona imersiva
        glow: "0 6px 22px rgba(20,105,151,.45)",
        "glow-soft": "0 0 0 3px rgba(164,214,232,.18)",
      },
    },
  },
  plugins: [],
};

export default config;
