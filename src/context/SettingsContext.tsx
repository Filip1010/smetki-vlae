import React, { createContext, useContext, useEffect, useState } from 'react';

export type Theme = 'dark' | 'light';
export type MonthsLang = 'mk' | 'en';

export interface Settings {
  theme: Theme;
  monthsLang: MonthsLang;
  activeHouseId: string;
}

export interface SettingsContextValue {
  settings: Settings;
  setTheme: (theme: Theme) => void;
  setMonthsLang: (lang: MonthsLang) => void;
  setActiveHouseId: (id: string) => void;
}

const STORAGE_KEY = 'smetki-vlae-settings';
const defaults: Settings = { theme: 'dark', monthsLang: 'mk', activeHouseId: 'vlae' };

const SettingsContext = createContext<SettingsContextValue>({
  settings: defaults,
  setTheme: () => undefined,
  setMonthsLang: () => undefined,
  setActiveHouseId: () => undefined,
});

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...defaults, ...JSON.parse(raw) as Partial<Settings> } : defaults;
    } catch {
      return defaults;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    document.documentElement.setAttribute('data-theme', settings.theme);
  }, [settings]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTheme = (theme: Theme) => setSettings((s) => ({ ...s, theme }));
  const setMonthsLang = (monthsLang: MonthsLang) => setSettings((s) => ({ ...s, monthsLang }));
  const setActiveHouseId = (activeHouseId: string) => setSettings((s) => ({ ...s, activeHouseId }));

  return (
    <SettingsContext.Provider value={{ settings, setTheme, setMonthsLang, setActiveHouseId }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
