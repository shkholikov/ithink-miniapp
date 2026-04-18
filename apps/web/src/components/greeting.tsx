'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { getWebApp } from '@/lib/telegram';

interface ProfileFields {
  first_name?: string;
  last_name?: string;
  username?: string;
}

// Only used when running outside Telegram (plain browser during development),
// so you can see the greeting filled in while building the UI.
const DEV_MOCK_USER: ProfileFields = {
  first_name: 'Shakhzod',
  username: 'shakhzod',
};

function resolveDisplayName(user: ProfileFields | undefined): string | null {
  if (!user) return null;
  if (user.first_name?.trim()) return user.first_name.trim();
  if (user.last_name?.trim()) return user.last_name.trim();
  if (user.username) return `@${user.username}`;
  return null;
}

export function Greeting() {
  const t = useTranslations('home.hello');
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    const realUser = getWebApp()?.initDataUnsafe.user;
    if (realUser) {
      setName(resolveDisplayName(realUser));
      return;
    }
    if (process.env.NODE_ENV !== 'production') {
      setName(resolveDisplayName(DEV_MOCK_USER));
    }
  }, []);

  return (
    <p className="text-xs uppercase tracking-wider text-muted-foreground">
      {name ? t('named', { name }) : t('anonymous')}
    </p>
  );
}
