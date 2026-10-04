import clsx from 'clsx';
import { brand } from '../../config/brand';

interface ChurchLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon';
  className?: string;
  glow?: boolean;
}

const SIZE_CLASSES: Record<NonNullable<ChurchLogoProps['size']>, string> = {
  sm: 'h-10 w-10',
  md: 'h-16 w-16',
  lg: 'h-28 w-28',
  xl: 'h-36 w-36 lg:h-44 lg:w-44',
};

export function ChurchLogo({ size = 'md', variant = 'full', className, glow = false }: ChurchLogoProps) {
  return (
    <img
      src={variant === 'full' ? brand.logo : brand.icon}
      alt={brand.churchName}
      className={clsx(SIZE_CLASSES[size], 'object-contain aspect-square', glow && 'drop-shadow-[0_0_18px_rgba(212,175,55,0.45)]', className)}
    />
  );
}
