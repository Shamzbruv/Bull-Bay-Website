import clsx from 'clsx';
import { motion } from 'framer-motion';

interface BrandRingsProps {
  size?: number;
  className?: string;
}

/** Slowly counter-rotating gold rings — used behind round numbers and the winner reveal. */
export function BrandRings({ size = 320, className }: BrandRingsProps) {
  return (
    <div className={clsx('pointer-events-none absolute inset-0 flex items-center justify-center', className)} aria-hidden>
      <motion.div
        className="rounded-full border border-bb-gold/25"
        style={{ height: size, width: size }}
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute rounded-full border border-bb-cyan/20 border-dashed"
        style={{ height: size * 0.82, width: size * 0.82 }}
        animate={{ rotate: -360 }}
        transition={{ duration: 40, repeat: Infinity, ease: 'linear' }}
      />
    </div>
  );
}
