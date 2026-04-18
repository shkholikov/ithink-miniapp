'use client';

import { useEffect } from 'react';
import { useRouter } from '@/i18n/navigation';
import { getWebApp } from './sdk';

export function TelegramBackButton() {
  const router = useRouter();

  useEffect(() => {
    const webApp = getWebApp();
    if (!webApp) return;

    const onClick = () => router.back();

    webApp.BackButton.onClick(onClick);
    webApp.BackButton.show();

    return () => {
      webApp.BackButton.offClick(onClick);
      webApp.BackButton.hide();
    };
  }, [router]);

  return null;
}
