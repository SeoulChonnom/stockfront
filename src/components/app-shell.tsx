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
          <a className="nav-link nav-link-muted" href="#support">
            <CircleHelp className="nav-icon" size={18} />
            <span>Support</span>
          </a>
          <a className="nav-link nav-link-muted" href="#docs">
            <BookText className="nav-icon" size={18} />
            <span>Documentation</span>
          </a>
        </div>
      </aside>

      <div className="shell-main">
        <header className="topbar">
          <div className="topbar-left">
            <label className="search-field">
              <Search size={16} />
              <Input
                aria-label={placeholder}
                className="min-h-0 border-0 bg-transparent px-0 py-0 shadow-none focus:border-0 focus:shadow-none"
                placeholder={`${placeholder}...`}
              />
            </label>
            <nav className="top-links" aria-label="Section">
              <a
                className={
                  pathname === '/market/latest' ? 'top-link-active' : ''
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
                href="/market/archive/search"
                onClick={createNavigateHandler('/market/archive/search')}
              >
                Archive
              </a>
              <a
                className={
                  pathname.startsWith('/ops/batches') ? 'top-link-active' : ''
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

        <main className="content">{children}</main>
        <footer className="site-footer">
          <div>
            <strong>Market Daily Brief</strong>
            <p>PoC UI for market intelligence workflow and ops monitoring.</p>
          </div>
          <div className="site-footer-links">
            <a href="#docs">Documentation</a>
            <a href="#system">System Status</a>
            <a href="#policies">Usage Policy</a>
          </div>
        </footer>
      </div>
    </div>
  );
}
