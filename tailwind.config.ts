import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: { deep: "#08172E", dark: "#15253F", mid: "#2B3D5B" },
        gold: "#BD9060",
        terracotta: "#CC7D51",
        beige: "#D9B59D",
        offwhite: "#F9F9F9",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
