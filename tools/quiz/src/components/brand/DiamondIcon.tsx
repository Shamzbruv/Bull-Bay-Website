import { Gem } from 'lucide-react';
import clsx from 'clsx';

export function DiamondIcon({ className, size = 16 }: { className?: string; size?: number }) {
  return <Gem size={size} className={clsx('text-bb-cyan', className)} aria-hidden />;
}
