"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="group relative flex h-10 w-10 items-center justify-center rounded-2xl border border-yellow-400/30 bg-white text-yellow-500 shadow-sm transition-all duration-300 hover:scale-110 hover:border-yellow-400/50 hover:bg-yellow-50 hover:shadow-lg hover:shadow-yellow-400/20 dark:border-yellow-500/30 dark:bg-zinc-800 dark:text-yellow-400 dark:hover:bg-zinc-700/80 md:h-12 md:w-12"
      aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
      title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
    >
      <div className="absolute inset-0 rounded-2xl bg-yellow-400/0 transition-all duration-300 group-hover:bg-yellow-400/5 dark:group-hover:bg-yellow-400/10" />
      
      {theme === "light" ? (
        <Moon className="relative h-5 w-5 transition-all duration-300 group-hover:scale-110 group-hover:text-yellow-600 dark:group-hover:text-yellow-300" />
      ) : (
        <Sun className="relative h-5 w-5 transition-all duration-300 group-hover:scale-110 group-hover:rotate-90 group-hover:text-yellow-300" />
      )}
      
      <div className="absolute -inset-1 rounded-2xl bg-yellow-400/20 opacity-0 blur-sm transition-all duration-300 group-hover:opacity-100" />
    </button>
  );
}
