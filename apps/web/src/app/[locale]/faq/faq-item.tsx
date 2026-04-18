'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { hapticSelection } from '@/lib/telegram';
import { cn } from '@/lib/utils';

interface Props {
  question: string;
  answer: string;
}

export function FaqItem({ question, answer }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        setOpen((v) => !v);
        hapticSelection();
      }}
      className="flex w-full flex-col gap-2 px-4 py-3 text-left transition-colors active:bg-white/5"
    >
      <div className="flex items-center gap-3">
        <span className="flex-1 text-[0.9375rem] font-medium text-foreground">{question}</span>
        <ChevronDown
          size={16}
          className={cn(
            'shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </div>
      <div
        className={cn(
          'grid overflow-hidden text-sm text-muted-foreground transition-[grid-template-rows] duration-200',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="min-h-0">
          <p className="pb-1 pr-6">{answer}</p>
        </div>
      </div>
    </button>
  );
}
