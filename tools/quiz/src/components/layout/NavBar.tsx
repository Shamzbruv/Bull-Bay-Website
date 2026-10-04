import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { ChurchLogo } from '../brand/ChurchLogo';
import { brand } from '../../config/brand';

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/quizzes', label: 'Quiz Library' },
  { to: '/history', label: 'History' },
  { to: '/admin', label: 'Admin' },
  { to: '/settings', label: 'Settings' },
];

export function NavBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-bb-deep/80 backdrop-blur-xl">
      <div className="game-safe-area flex items-center justify-between py-3">
        <NavLink to="/" className="flex items-center gap-3">
          <ChurchLogo size="sm" />
          <div className="leading-tight text-left">
            <div className="font-display text-sm font-semibold tracking-wide text-white">{brand.shortName}</div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-bb-gold">{brand.productName}</div>
          </div>
        </NavLink>
        <nav className="hidden sm:flex items-center gap-1">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                clsx(
                  'rounded-full px-4 py-2 text-sm font-medium transition',
                  isActive ? 'bg-bb-blue text-white shadow-glow-blue' : 'text-white/70 hover:text-white hover:bg-white/5',
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
