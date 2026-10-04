import clsx from 'clsx';
import type { ReactNode } from 'react';
import { MountainMotif } from './MountainMotif';

interface BackgroundSceneProps {
  variant: 'dark' | 'light';
  children: ReactNode;
  className?: string;
}

/**
 * A calm, brand-colored backdrop. Earlier versions used the full generated
 * photo background behind every screen, which competed with foreground
 * content for attention — this keeps only a soft gradient, a faint radial
 * glow, and a barely-there mountain silhouette so text stays easy to read
 * from across a church hall.
 */
export function BackgroundScene({ variant, children, className }: BackgroundSceneProps) {
  const dark = variant === 'dark';

  return (
    <div className={clsx('relative min-h-screen overflow-hidden', dark ? 'bg-bb-deep' : 'bg-white', className)}>
      <div
        className={clsx('fixed inset-0', dark ? 'bg-gradient-to-b from-bb-navy via-bb-deep to-bb-deep' : 'bg-gradient-to-b from-blue-50 via-white to-white')}
        aria-hidden
      />
      <div
        className="fixed inset-0 opacity-40"
        style={{
          background: dark
            ? 'radial-gradient(60% 45% at 50% 0%, rgba(0,181,226,0.14), transparent 70%)'
            : 'radial-gradient(60% 45% at 50% 0%, rgba(0,51,160,0.08), transparent 70%)',
        }}
        aria-hidden
      />
      <div className={clsx('fixed inset-x-0 bottom-0 pointer-events-none', dark ? 'text-bb-green/[0.06]' : 'text-bb-blue/[0.05]')} aria-hidden>
        <MountainMotif className="h-40 sm:h-56" />
      </div>
      <div className="relative z-10 min-h-screen">{children}</div>
    </div>
  );
}
