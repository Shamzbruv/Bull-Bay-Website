import clsx from 'clsx';

/** The open-Bible / wave flourish from the logo, used as a footer accent. */
export function WaveMotif({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 24" className={clsx('w-full', className)} preserveAspectRatio="none" aria-hidden>
      <path
        d="M0 4 C 60 20, 140 20, 200 6 C 260 -6, 340 -6, 400 8"
        fill="none"
        stroke="url(#bb-wave-gradient)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient id="bb-wave-gradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="transparent" />
          <stop offset="20%" stopColor="#0033A0" />
          <stop offset="50%" stopColor="#00B5E2" />
          <stop offset="80%" stopColor="#0033A0" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>
    </svg>
  );
}
