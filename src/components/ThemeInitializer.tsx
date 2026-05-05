"use client";

import { useEffect } from "react";

export type ThemePreference = "light" | "dark" | "system";

function resolveTheme(preference: ThemePreference): "light" | "dark" {
  if (preference === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return preference;
}

function applyTheme(preference: ThemePreference): void {
  const effectiveTheme = resolveTheme(preference);
  document.documentElement.setAttribute("data-theme", effectiveTheme);
}

export function setThemePreference(preference: ThemePreference): void {
  window.localStorage.setItem("leafylines:theme-preference", preference);
  applyTheme(preference);
}

export default function ThemeInitializer() {
  useEffect(() => {
    const stored = window.localStorage.getItem("leafylines:theme-preference");
    const preference: ThemePreference =
      stored === "dark" || stored === "light" || stored === "system" ? stored : "system";

    applyTheme(preference);

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemThemeChange = () => {
      const current = window.localStorage.getItem("leafylines:theme-preference");
      if (current === "system" || !current) {
        applyTheme("system");
      }
    };

    mediaQuery.addEventListener("change", onSystemThemeChange);
    return () => {
      mediaQuery.removeEventListener("change", onSystemThemeChange);
    };
  }, []);

  return null;
}
