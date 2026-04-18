import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export function GroupedCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn('grouped-card', className)}>{children}</div>;
}

interface RowProps {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  onClick?: () => void;
  href?: string;
  as?: 'button' | 'div';
}

export function GroupedCardRow({
  leading,
  title,
  subtitle,
  trailing,
  onClick,
  as = 'button',
}: RowProps) {
  const content = (
    <>
      {leading ? <div className="shrink-0">{leading}</div> : null}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[0.9375rem] font-medium text-foreground">{title}</div>
        {subtitle ? (
          <div className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</div>
        ) : null}
      </div>
      {trailing !== undefined ? (
        <div className="shrink-0 text-sm text-muted-foreground">{trailing}</div>
      ) : (
        <ChevronRight size={16} className="shrink-0 text-muted-foreground" aria-hidden />
      )}
    </>
  );

  const cls = 'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors active:bg-white/5';

  if (as === 'div') {
    return <div className={cls}>{content}</div>;
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {content}
    </button>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <h2 className="px-1 pb-2 pt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </h2>
  );
}
