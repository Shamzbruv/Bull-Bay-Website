import type { ReactNode } from 'react';
import { NavBar } from './NavBar';
import { BackgroundScene } from '../brand/BackgroundScene';

export function AppShell({ children, theme = 'dark' }: { children: ReactNode; theme?: 'dark' | 'light' }) {
  return (
    <BackgroundScene variant={theme}>
      <NavBar />
      <main className={theme === 'light' ? 'text-bb-deep' : 'text-white'}>{children}</main>
    </BackgroundScene>
  );
}
