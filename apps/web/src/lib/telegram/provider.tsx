'use client';

import { useEffect, type ReactNode } from 'react';
import { useTheme } from 'next-themes';
import { getWebApp, initWebApp } from './sdk';

export function TelegramProvider({ children }: { children: ReactNode }) {
  const { setTheme } = useTheme();

  useEffect(() => {
    const webApp = initWebApp();
    if (!webApp) return;

    setTheme(webApp.colorScheme === 'light' ? 'light' : 'dark');

    const onThemeChanged = () => {
      const current = getWebApp();
      if (!current) return;
      setTheme(current.colorScheme === 'light' ? 'light' : 'dark');
    };

    webApp.onEvent('themeChanged', onThemeChanged);

    return () => {
      webApp.offEvent('themeChanged', onThemeChanged);
    };
  }, [setTheme]);

  return <>{children}</>;
}
