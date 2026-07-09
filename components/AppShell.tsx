'use client';
import { useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store/authStore';
import Link from 'next/link';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: '⊞' },
  { href: '/menus', label: 'Menus', icon: '≡' },
  { href: '/repository', label: 'Dish Repository', icon: '◈' },
  { href: '/admin', label: 'Admin', icon: '⚙' },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const logout = useAuthStore(s => s.logout);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthenticated && pathname !== '/login') {
      router.replace('/login');
    }
  }, [isAuthenticated, pathname, router]);

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-app)]">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col border-r border-white/5 bg-gradient-to-b from-[#110608] to-[#18080a]">
        {/* Logo */}
        <div className="px-6 py-7 border-b border-white/5 relative">
          <div className="flex items-center gap-1.5">
            <span className="font-display text-xl italic font-semibold tracking-wide text-white">
              The Embassy
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--gold)] animate-glow-pulse mt-1" />
          </div>
          <div className="text-[9px] tracking-[0.25em] text-[var(--gold)]/80 uppercase font-medium mt-1">
            MenuCraft
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-6 space-y-1.5">
          {NAV_ITEMS.map(item => {
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              >
                <span className={`text-base w-5 text-center transition-colors duration-250 ${isActive ? 'text-[var(--gold)]' : 'text-white/40'}`}>
                  {item.icon}
                </span>
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Gold rule + version */}
        <div className="px-3 py-4 border-t border-white/5">
          <button onClick={logout}
            className="sidebar-nav-item w-full text-left text-xs opacity-60 hover:opacity-100 hover:text-red-400 hover:bg-red-500/5 hover:border-red-500/10">
            <span className="text-sm">⎋</span>
            <span>Sign out</span>
          </button>
          <div className="flex items-center justify-between px-3 mt-3 opacity-20">
            <p className="text-[9px] text-[var(--text-grey)] font-mono">v2.0</p>
            <p className="text-[9px] text-[var(--text-grey)] uppercase tracking-wider">Confidential</p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-gradient-to-br from-[#0d0507] via-[#0A0405] to-[#120608]">
        {children}
      </main>
    </div>
  );
}
