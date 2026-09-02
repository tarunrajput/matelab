import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme, type ColorSchemeName } from 'react-native';
import { darkColors, lightColors, type ThemeColors } from './palette';
import { getSetting, setSetting } from '../storage/db';

export type ThemeMode = 'system' | 'light' | 'dark';

interface ThemeValue {
  colors: ThemeColors;
  isDark: boolean;
  /** What the user picked; 'system' follows the OS appearance */
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

const THEME_KEY = 'theme';

const ThemeContext = createContext<ThemeValue | null>(null);

function resolve(mode: ThemeMode, scheme: ColorSchemeName): { colors: ThemeColors; isDark: boolean } {
  const isDark = mode === 'system' ? (scheme ?? 'light') === 'dark' : mode === 'dark';
  return { colors: isDark ? darkColors : lightColors, isDark };
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');

  // Restore the persisted pick; until it lands (and if it never does) follow the OS.
  useEffect(() => {
    getSetting(THEME_KEY)
      .then((stored) => {
        if (stored === 'system' || stored === 'light' || stored === 'dark') setModeState(stored);
      })
      .catch(() => {});
  }, []);

  const setMode = (next: ThemeMode) => {
    setModeState(next);
    setSetting(THEME_KEY, next).catch(() => {});
  };

  const value = useMemo(() => ({ ...resolve(mode, scheme), mode, setMode }), [mode, scheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
