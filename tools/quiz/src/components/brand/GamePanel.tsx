import clsx from 'clsx';
import type { ReactNode } from 'react';

interface GamePanelProps {
  children: ReactNode;
  className?: string;
  accent?: 'gold' | 'cyan' | 'green' | 'red' | 'none';
}

const ACCENT_BORDER: Record<NonNullable<GamePanelProps['accent']>, string> = {
  gold: 'border-bb-gold/45',
  cyan: 'border-bb-cyan/40',
  green: 'border-bb-green/45',
  red: 'border-bb-red/45',
  none: 'border-white/10',
};

/** The game-show "card" surface used for questions, reveals, and score panels. */
export function GamePanel({ children, className, accent = 'none' }: GamePanelProps) {
  return (
    <div
      className={clsx(
        'rounded-[2rem] border bg-bb-navy/85 shadow-2xl shadow-black/40 backdrop-blur-xl',
        ACCENT_BORDER[accent],
        className,
      )}
    >
      {children}
    </div>
  );
}
