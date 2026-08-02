import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Theme =
  | "light"
  | "dark"
  | "system";

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext =
  createContext<ThemeContextValue | null>(
    null
  );

interface ThemeProviderProps {
  children: ReactNode;
}

function getSystemTheme(): "light" | "dark" {
  return window.matchMedia(
    "(prefers-color-scheme: dark)"
  ).matches
    ? "dark"
    : "light";
}

export function ThemeProvider({
  children,
}: ThemeProviderProps) {
  const [theme, setTheme] =
    useState<Theme>(() => {
      const saved =
        localStorage.getItem(
          "theme"
        );

      if (
        saved === "light" ||
        saved === "dark" ||
        saved === "system"
      ) {
        return saved;
      }

      return "system";
    });

  const [systemTheme, setSystemTheme] =
    useState<"light" | "dark">(
      getSystemTheme
    );

  useEffect(() => {
    const media =
      window.matchMedia(
        "(prefers-color-scheme: dark)"
      );

    const update = () =>
      setSystemTheme(
        media.matches
          ? "dark"
          : "light"
      );

    update();

    media.addEventListener(
      "change",
      update
    );

    return () =>
      media.removeEventListener(
        "change",
        update
      );
  }, []);

  const isDark =
    theme === "system"
      ? systemTheme === "dark"
      : theme === "dark";

  useEffect(() => {
    document.documentElement.classList.toggle(
      "dark",
      isDark
    );

    localStorage.setItem(
      "theme",
      theme
    );
  }, [
    theme,
    isDark,
  ]);

  function toggleTheme() {
    setTheme((current) => {
      const actual =
        current === "system"
          ? systemTheme
          : current;

      return actual === "dark"
        ? "light"
        : "dark";
    });
  }

  const value = useMemo(
    () => ({
      theme,
      isDark,
      setTheme,
      toggleTheme,
    }),
    [
      theme,
      isDark,
    ]
  );

  return (
    <ThemeContext.Provider
      value={value}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context =
    useContext(
      ThemeContext
    );

  if (!context) {
    throw new Error(
      "useTheme must be used inside ThemeProvider."
    );
  }

  return context;
}
