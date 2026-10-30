import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-body)", "Arial", "sans-serif"],
        display: ["var(--font-display)", "Georgia", "serif"]
      },
      colors: {
        surface: "var(--surface)", "surface-raised": "var(--surface-raised)", "surface-sunken": "var(--surface-sunken)",
        line: "var(--line)", ink: "var(--ink)", "ink-muted": "var(--ink-muted)", accent: "var(--accent)", "on-accent": "var(--on-accent)",
        success: "var(--success)", danger: "var(--danger)"
      }
    }
  },
  plugins: []
};

export default config;
