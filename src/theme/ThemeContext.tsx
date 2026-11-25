import React, { createContext, useContext, useEffect, useState } from 'react';
import { NexTheme } from '../../shared/types/index.ts';

interface ThemeContextValue {
  theme: NexTheme;
  setTheme: (theme: NexTheme) => void;
  themeLabel: string;
}

const STORAGE_KEY = 'nexcoletas_theme';

const THEME_LABELS: Record<NexTheme, string> = {
  green: 'GREEN — Floresta & Eco (Padrão)',
  light: 'LIGHT — Off-White & Corporativo',
  night: 'NIGHT — Grafite & Escuro Premium',
};

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'green',
  setTheme: () => {},
  themeLabel: THEME_LABELS.green,
});

function getInitialTheme(): NexTheme {
  if (typeof window === 'undefined') return 'green';
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'white' || saved === 'light') return 'light';
    if (saved === 'green' || saved === 'night') return saved;
  } catch {
    // Fallback
  }
  return 'green';
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [theme, setThemeState] = useState<NexTheme>(getInitialTheme);

  const applyThemeToDOM = (nextTheme: NexTheme) => {
    const root = document.documentElement;
    root.setAttribute('data-theme', nextTheme);
    if (nextTheme === 'night') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      const colorMap: Record<NexTheme, string> = {
        green: '#174D35',
        light: '#F5F7F4',
        night: '#0D110F',
      };
      metaTheme.setAttribute('content', colorMap[nextTheme]);
    }
  };

  useEffect(() => {
    applyThemeToDOM(theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Ignore storage error
    }
  }, [theme]);

  const setTheme = (nextTheme: NexTheme) => {
    setThemeState(nextTheme);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        themeLabel: THEME_LABELS[theme],
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export function useTheme() {
  return useContext(ThemeContext);
}
