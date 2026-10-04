import clsx from 'clsx';

export function BrandDivider({ className }: { className?: string }) {
  return (
    <div className={clsx('flex items-center gap-4', className)}>
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-bb-cyan to-bb-blue" />
      <span className="text-bb-gold text-lg rotate-45 border border-bb-gold/70 h-3 w-3 block" aria-hidden />
      <div className="h-px flex-1 bg-gradient-to-l from-transparent via-bb-cyan to-bb-blue" />
    </div>
  );
}
