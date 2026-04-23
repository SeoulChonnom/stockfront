import type { ReactNode } from 'react';

import {
  Archive as ArchiveIcon,
  BookText,
  ChartNoAxesCombined,
  CircleHelp,
  CircleUserRound,
  type LucideIcon,
  MoonStar,
  Search,
  SunMedium,
  Workflow,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { createNavigateHandler, type ThemeMode } from '../lib/app-state';

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  isActive: (pathname: string) => boolean;
};

const navItems: NavItem[] = [
  {
    href: '/market/latest',
    label: 'Latest Market',
    icon: ChartNoAxesCombined,
    isActive: (pathname) =>
      pathname === '/market/latest' || pathname.startsWith('/market/cluster/'),
  },
  {
    href: '/market/archive/search',
    label: 'Archive',
    icon: ArchiveIcon,
    isActive: (pathname) => pathname.startsWith('/market/archive'),
  },
  {
    href: '/ops/batches',
    label: 'Batch Status',
    icon: Workflow,
    isActive: (pathname) => pathname.startsWith('/ops/batches'),
  },
];

export function AppShell({
  children,
  pathname,
  placeholder,
  theme,
  onToggleTheme,
}: {
  children: ReactNode;
  pathname: string;
  placeholder: string;
  theme: ThemeMode;
  onToggleTheme: () => void;
}) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        본문으로 바로가기
      </a>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">Market Brief</div>
          <p>Financial Intelligence Console</p>
        </div>

        <nav className="sidebar-nav" aria-label="Primary">
          {navItems.map((item) => {
            const active = item.isActive(pathname);
            const Icon = item.icon;
            return (
              <a
                className={`nav-link${active ? ' nav-link-active' : ''}`}
                aria-current={active ? 'page' : undefined}
                href={item.href}
                key={item.href}
                onClick={createNavigateHandler(item.href)}
              >
                <Icon className="nav-icon" size={18} />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>

        <div className="sidebar-support">
          <span className="nav-link nav-link-muted nav-link-static">
            <CircleHelp className="nav-icon" size={18} />
            <span>Support · Coming soon</span>
          </span>
          <span className="nav-link nav-link-muted nav-link-static">
            <BookText className="nav-icon" size={18} />
            <span>Documentation · Coming soon</span>
          </span>
        </div>
      </aside>

      <div className="shell-main">
        <header className="topbar">
          <div className="topbar-left">
            <div className="search-field">
              <Search size={16} />
              <Input
                aria-label={`${placeholder} (coming soon)`}
                className="min-h-0 border-0 bg-transparent px-0 py-0 shadow-none focus:border-0 focus:shadow-none"
                disabled
                placeholder={`${placeholder} (coming soon)`}
                readOnly
              />
            </div>
            <nav className="top-links" aria-label="Section">
              <a
                className={
                  pathname === '/market/latest' ? 'top-link-active' : ''
                }
                aria-current={
                  pathname === '/market/latest' ? 'page' : undefined
                }
                href="/market/latest"
                onClick={createNavigateHandler('/market/latest')}
              >
                Latest Market
              </a>
              <a
                className={
                  pathname.startsWith('/market/archive')
                    ? 'top-link-active'
                    : ''
                }
                aria-current={
                  pathname.startsWith('/market/archive') ? 'page' : undefined
                }
                href="/market/archive/search"
                onClick={createNavigateHandler('/market/archive/search')}
              >
                Archive
              </a>
              <a
                className={
                  pathname.startsWith('/ops/batches') ? 'top-link-active' : ''
                }
                aria-current={
                  pathname.startsWith('/ops/batches') ? 'page' : undefined
                }
                href="/ops/batches"
                onClick={createNavigateHandler('/ops/batches')}
              >
                Ops Admin
              </a>
            </nav>
          </div>

          <div className="topbar-right">
            <Button
              aria-label={
                theme === 'dark'
                  ? 'Switch to light mode'
                  : 'Switch to dark mode'
              }
              className="icon-button"
              onClick={onToggleTheme}
              size="icon"
              type="button"
              variant="ghost"
            >
              {theme === 'dark' ? (
                <SunMedium size={18} />
              ) : (
                <MoonStar size={18} />
              )}
            </Button>
            <div className="user-chip">
              <span>Admin.Ops</span>
              <div className="user-avatar">
                <CircleUserRound size={18} />
              </div>
            </div>
          </div>
        </header>

        <main className="content" id="main-content" tabIndex={-1}>
          {children}
        </main>
        <footer className="site-footer">
          <div>
            <strong>Market Daily Brief</strong>
            <p>PoC UI for market intelligence workflow and ops monitoring.</p>
          </div>
          <div className="site-footer-links">
            <span>Documentation · Coming soon</span>
            <span>System Status · Coming soon</span>
            <span>Usage Policy · Coming soon</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
