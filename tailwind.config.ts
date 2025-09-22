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
          50: "#fff7ed",  // orange-50
          100: "#ffedd5", // orange-100
          200: "#fed7aa", // orange-200
          300: "#fdba74", // orange-300
          400: "#fb923c", // orange-400
        },
      },
      boxShadow: {
        glow: "0 0 0 4px rgba(245, 158, 11, 0.25)",
      },
    },
  },
  plugins: [],
} satisfies Config;
