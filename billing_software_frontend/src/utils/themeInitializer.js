import { useState, useEffect } from "react";
import { startAutoTranslation } from "./i18n";

export function applyTheme(theme = "light") {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  const body = document.body;
  const isDark = theme === "dark";

  if (isDark) {
    root.classList.add("dark");
    root.classList.remove("light");
    root.setAttribute("data-theme", "dark");
    root.style.colorScheme = "dark";
    if (body) {
      body.classList.add("dark");
      body.classList.remove("light");
      body.setAttribute("data-theme", "dark");
      body.style.backgroundColor = "#0f172a";
      body.style.color = "#f8fafc";
    }
  } else {
    root.classList.remove("dark");
    root.classList.add("light");
    root.setAttribute("data-theme", "light");
    root.style.colorScheme = "light";
    if (body) {
      body.classList.remove("dark");
      body.classList.add("light");
      body.setAttribute("data-theme", "light");
      body.style.backgroundColor = "#f8faff";
      body.style.color = "#0f172a";
    }
  }
  try {
    localStorage.setItem("app_theme", theme);
  } catch (e) {
    console.error("Failed to save app_theme", e);
  }
  window.dispatchEvent(new CustomEvent("app_theme_changed", { detail: theme }));
}

/**
 * Reactive hook for components to subscribe to theme changes
 */
export function useTheme() {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("app_theme") || "light";
    } catch (e) {
      return "light";
    }
  });

  useEffect(() => {
    const handleThemeChange = (e) => {
      const newTheme = e?.detail || localStorage.getItem("app_theme") || "light";
      setTheme(newTheme);
    };

    window.addEventListener("app_theme_changed", handleThemeChange);
    window.addEventListener("storage", handleThemeChange);
    return () => {
      window.removeEventListener("app_theme_changed", handleThemeChange);
      window.removeEventListener("storage", handleThemeChange);
    };
  }, []);

  return {
    theme,
    isDark: theme === "dark",
    setTheme: applyTheme,
    toggleTheme: () => applyTheme(theme === "dark" ? "light" : "dark"),
  };
}

export function applyLanguage(lang = "en") {
  if (typeof document === "undefined") return;
  const normalized = lang === "ta" ? "ta" : "en";
  document.documentElement.setAttribute("lang", normalized);
  try {
    localStorage.setItem("app_language", normalized);
  } catch (e) {
    console.error("Failed to save app_language", e);
  }
  window.dispatchEvent(new CustomEvent("app_language_changed", { detail: normalized }));
  startAutoTranslation(normalized);
}

export function initThemeAndDensity() {
  if (typeof window === "undefined") return;
  try {
    const savedTheme = localStorage.getItem("app_theme") || "light";
    applyTheme(savedTheme);

    const savedLang = localStorage.getItem("app_language") || "en";
    applyLanguage(savedLang);
  } catch (e) {
    console.error("Error initializing theme or language", e);
  }
}

// Auto-run on script load so theme/lang are immediately present before first paint
if (typeof window !== "undefined") {
  initThemeAndDensity();
}
