"use client";

import { createContext, useContext, useEffect, useSyncExternalStore, ReactNode, useCallback } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "dark",
  toggleTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function getThemeFromDOM(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.classList.contains("light") ? "light" : "dark";
}

function subscribeToTheme(callback: () => void) {
  const observer = new MutationObserver(callback);
  if (typeof document !== "undefined") {
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
  }
  return () => observer.disconnect();
}

export function ThemeProvider({
  children,
  storageKey = "gleeam-theme",
}: {
  children: ReactNode;
  storageKey?: string;
}) {
  const theme = useSyncExternalStore(
    subscribeToTheme,
    getThemeFromDOM,
    () => "dark" as Theme
  );

  const toggleTheme = useCallback(() => {
    const newTheme = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(newTheme);
    localStorage.setItem(storageKey, newTheme);
  }, [theme, storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, theme);
  }, [theme, storageKey]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
