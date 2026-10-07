"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { usePathname } from "next/navigation";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");
  const pathname = usePathname();

  useEffect(() => {
    // The pre-paint script restores the saved choice before hydration.
    const root = document.documentElement;
    setTheme(root.classList.contains("dark") ? "dark" : "light");
    root.setAttribute("data-theme-ready", "true");
  }, []);

  useEffect(() => {
    const color = getComputedStyle(document.documentElement).getPropertyValue("--browser-chrome-bg").trim();
    if (!color) return;
    document.querySelectorAll('meta[name="theme-color"]').forEach(meta => {
      meta.setAttribute("content", color);
    });
  }, [theme, pathname]);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    // Storage may be unavailable in privacy mode; the visual toggle still works.
    try { localStorage.setItem("theme", nextTheme); } catch {}
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    document.documentElement.style.colorScheme = nextTheme;
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
