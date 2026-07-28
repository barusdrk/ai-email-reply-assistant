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
  | "dark";

interface ThemeContextValue {
  theme: Theme;

  isDark: boolean;

  toggleTheme: () => void;

  setTheme: (
    theme: Theme
  ) => void;
}

const ThemeContext =
  createContext<ThemeContextValue | null>(
    null
  );

interface Props {
  children: ReactNode;
}

export function ThemeProvider({
  children,
}: Props) {
  const [theme, setTheme] =
    useState<Theme>(() => {
      const saved =
        localStorage.getItem(
          "theme"
        );

      if (
        saved === "light" ||
        saved === "dark"
      ) {
        return saved;
      }

      return window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches
        ? "dark"
        : "light";
    });

  useEffect(() => {
    document.documentElement.classList.toggle(
      "dark",
      theme === "dark"
    );

    localStorage.setItem(
      "theme",
      theme
    );
  }, [theme]);

  function toggleTheme() {
    setTheme((current) =>
      current === "dark"
        ? "light"
        : "dark"
    );
  }

  const value = useMemo(
    () => ({
      theme,

      isDark:
        theme === "dark",

      toggleTheme,

      setTheme,
    }),
    [theme]
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
    useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "useTheme must be used inside ThemeProvider."
    );
  }

  return context;
}
