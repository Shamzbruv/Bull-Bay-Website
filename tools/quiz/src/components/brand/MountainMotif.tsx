import clsx from 'clsx';

/** Inline SVG mountain silhouette echoing the church logo — used as a quiet background identity, never a full backdrop. */
export function MountainMotif({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 120"
      className={clsx('w-full', className)}
      preserveAspectRatio="xMidYMax slice"
      aria-hidden
    >
      <path
        d="M0 120 L60 55 L100 85 L150 30 L200 70 L230 45 L280 90 L320 50 L400 120 Z"
        fill="currentColor"
      />
    </svg>
  );
}
