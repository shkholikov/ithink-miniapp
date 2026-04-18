'use client';

import { MessageSquare } from 'lucide-react';
import { getWebApp, hapticImpact } from '@/lib/telegram';

interface Props {
  label: string;
}

const DEFAULT_SALES_USERNAME = 'shkholikov';

export function ChatWithSalesButton({ label }: Props) {
  const username = process.env.NEXT_PUBLIC_SALES_TG_USERNAME || DEFAULT_SALES_USERNAME;

  const handleClick = () => {
    hapticImpact('medium');
    const webApp = getWebApp();
    const deepLink = `https://t.me/${username}`;

    if (webApp) {
      webApp.openTelegramLink(deepLink);
    } else if (typeof window !== 'undefined') {
      window.open(deepLink, '_blank');
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex w-full items-center justify-center gap-2 rounded-full bg-[color:var(--color-brand)] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_32px_-12px_rgba(55,125,255,0.7)] transition-transform active:scale-[0.98]"
    >
      <MessageSquare size={16} />
      <span>{label}</span>
    </button>
  );
}
