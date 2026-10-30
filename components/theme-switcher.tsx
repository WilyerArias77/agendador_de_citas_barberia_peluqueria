"use client";

import { useEffect, useState } from "react";

type Theme = "barberia" | "salon";

export function ThemeSwitcher() {
  const [theme, setTheme] = useState<Theme>("barberia");

  useEffect(() => {
    const saved = window.localStorage.getItem("nitida-theme") as Theme | null;
    const nextTheme = saved === "salon" || saved === "barberia" ? saved : theme;
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }, [theme]);

  function selectTheme(nextTheme: Theme) {
    setTheme(nextTheme);
    window.localStorage.setItem("nitida-theme", nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }

  return (
    <div className="flex items-center gap-1 rounded-full border border-[var(--line)] bg-[var(--surface)] p-1 text-xs" aria-label="Elegir estilo visual">
      <button type="button" aria-pressed={theme === "barberia"} className="theme-choice rounded px-3 py-1.5 font-semibold transition" onClick={() => selectTheme("barberia")}>Barbería</button>
      <button type="button" aria-pressed={theme === "salon"} className="theme-choice rounded px-3 py-1.5 font-semibold transition" onClick={() => selectTheme("salon")}>Salón</button>
    </div>
  );
}
