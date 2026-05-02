import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "var(--cream)",
        ink: "var(--ink)",
        gold: "var(--gold)",
        warm: "var(--warm)",
      },
      boxShadow: {
        phone: "0 40px 80px rgba(26, 22, 14, 0.6)",
      },
      letterSpacing: {
        eyebrow: "0.22em",
        wordmark: "0.18em",
      },
    },
  },
  plugins: [],
};

export default config;
