import type { Config } from "tailwindcss";
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        maroon: { 900: "#4A1108", 800: "#6B1E10", 700: "#8A3418" },
        terracotta: { DEFAULT: "#E0762F", lt: "#F2913F" },
        gold: "#F2C185",
        cream: "#FAF3E9",
        "cream-2": "#F4E9D8",
        ink: "#3A2318",
        "ink-soft": "#7C6152",
        "on-maroon": "#FFF3E4",
        success: "#2E9E5B",
        warn: "#D98A1F",
        danger: "#C0392B",
      },
      borderRadius: { sm: "12px", md: "16px", lg: "20px", xl: "28px" },
      boxShadow: {
        card: "0 2px 12px rgba(74,17,8,0.06)",
        raise: "0 8px 24px rgba(74,17,8,0.12)",
        glow: "0 6px 20px rgba(224,118,47,0.45)",
      },
      fontFamily: {
        display: ["Tiro Devanagari Hindi", "Noto Serif Devanagari", "serif"],
        ui: ["Inter", "Noto Sans", "system-ui", "sans-serif"],
        indic: ["Noto Sans Devanagari", "Noto Sans Bengali", "Noto Sans Tamil", "sans-serif"],
      },
      maxWidth: { app: "430px" },
    },
  },
  plugins: [],
} satisfies Config;
