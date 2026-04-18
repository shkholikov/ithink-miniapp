import type { ComponentType } from 'react';
import * as Lucide from 'lucide-react';
import { cn } from '@/lib/utils';

type IconName = keyof typeof Lucide;

interface Props {
  icon: string;
  color: string;
  size?: number;
  className?: string;
}

export function IconSquare({ icon, color, size = 16, className }: Props) {
  const Candidate = Lucide[icon as IconName] as ComponentType<{ size?: number }> | undefined;
  const Icon = (Candidate ?? Lucide.Sparkles) as ComponentType<{ size?: number }>;
  return (
    <span className={cn('icon-square', className)} style={{ background: color }}>
      <Icon size={size} aria-hidden />
    </span>
  );
}
