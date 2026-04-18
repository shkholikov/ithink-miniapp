'use client';

import { useTranslations } from 'next-intl';
import { Home, LayoutGrid, HelpCircle } from 'lucide-react';
import { Link, usePathname } from '@/i18n/navigation';
import { hapticSelection } from '@/lib/telegram';
import { cn } from '@/lib/utils';

const items = [
  { href: '/', tKey: 'home', Icon: Home },
  { href: '/services', tKey: 'services', Icon: LayoutGrid },
  { href: '/faq', tKey: 'faq', Icon: HelpCircle },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations('nav');

  return (
    <nav className="bottom-nav">
      {items.map(({ href, tKey, Icon }) => {
        const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => hapticSelection()}
            className={cn('bottom-nav-item')}
            data-active={active}
          >
            <Icon size={16} aria-hidden />
            <span>{t(tKey)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
