'use client';

import { useLocale } from 'next-intl';
import type { Locale } from '@ithink/types';
import { useRouter, usePathname } from '@/i18n/navigation';
import { hapticSelection } from '@/lib/telegram';
import { cn } from '@/lib/utils';

const LOCALES: { code: Locale; label: string }[] = [
  { code: 'ru', label: 'RU' },
  { code: 'uz', label: 'UZ' },
  { code: 'en', label: 'EN' },
];

export function LanguageSwitcher() {
  const router = useRouter();
  const pathname = usePathname();
  const current = useLocale() as Locale;

  const handleSelect = (locale: Locale) => {
    if (locale === current) return;
    hapticSelection();
    router.replace(pathname, { locale });
  };

  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 backdrop-blur">
      {LOCALES.map(({ code, label }) => {
        const active = code === current;
        return (
          <button
            key={code}
            type="button"
            onClick={() => handleSelect(code)}
            className={cn(
              'rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors',
              active
                ? 'bg-[color:var(--color-brand)] text-white shadow-[0_4px_12px_-4px_rgba(55,125,255,0.6)]'
                : 'text-muted-foreground active:text-foreground',
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
