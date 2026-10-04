import clsx from 'clsx';
import type { ReactNode } from 'react';

export function GoldFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={clsx(
        'rounded-3xl border border-bb-gold/50 shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_15px_60px_rgba(0,0,0,0.45),0_0_35px_rgba(212,175,55,0.12)]',
        className,
      )}
    >
      {children}
    </div>
  );
}
