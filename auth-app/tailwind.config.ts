import type { Config } from "tailwindcss";

export default {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./pages/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        primary: {
          DEFAULT: "#f59e0b",
          foreground: "#ffffff",
        },
        base: {
          50: "#fff7ed",
          100: "#ffedd5",
          200: "#fed7aa",
          300: "#fdba74",
          400: "#fb923c",
        },
      },
      boxShadow: {
        glow: "0 0 0 4px rgba(245, 158, 11, 0.25)",
      },
    },
  },
  plugins: [],
} satisfies Config;

