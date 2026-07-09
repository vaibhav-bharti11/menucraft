'use client';
import { useEffect, ReactNode, useState } from 'react';
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated && pathname !== '/login') {
      router.replace('/login');
    }
  }, [isAuthenticated, pathname, router]);

  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-app)] relative">
      {/* Mobile Header */}
      <header className="flex md:hidden h-14 border-b border-gray-150 bg-white px-5 items-center justify-between fixed top-0 left-0 right-0 z-40">
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-gray-600 p-1 hover:text-[#8B1A1A] transition-colors focus:outline-none">
          {isSidebarOpen ? (
            <span className="text-xl">✕</span>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
        <div className="flex flex-col items-center leading-none">
          <span className="font-display text-xl italic font-semibold text-[#8B1A1A] leading-none mb-0.5">
            The Embassy
          </span>
          <span className="text-[7px] tracking-[0.35em] text-[#C9A84C] uppercase font-bold leading-none">
            Catering
          </span>
        </div>
        <button className="text-gray-600 p-1 hover:text-[#8B1A1A] transition-colors focus:outline-none">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </button>
      </header>

      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)} 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden animate-fade-in" 
        />
      )}

      {/* Sidebar */}
      <aside className={`w-56 flex-shrink-0 flex flex-col border-r border-gray-100 bg-white fixed md:relative top-0 bottom-0 left-0 z-50 md:z-auto transition-transform duration-300 md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo */}
        <div className="px-6 py-7 border-b border-gray-100 relative">
          <div className="flex flex-col items-start leading-none">
            <span className="font-display text-[26px] italic font-semibold tracking-wide text-[#8B1A1A] leading-none mb-1">
              The Embassy
            </span>
            <span className="text-[8px] tracking-[0.35em] text-[#C9A84C] uppercase font-bold pl-0.5 leading-none">
              Catering
            </span>
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
                className={`sidebar-nav-item ${isActive ? 'active text-[#8B1A1A]' : 'text-gray-600'}`}
              >
                <span className={`text-base w-5 text-center transition-colors duration-250 ${isActive ? 'text-[#8B1A1A]' : 'text-gray-400'}`}>
                  {item.icon}
                </span>
                <span className="font-semibold">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Gold rule + version */}
        <div className="px-3 py-4 border-t border-gray-100">
          <button onClick={logout}
            className="sidebar-nav-item w-full text-left text-xs text-gray-500 hover:text-red-600 hover:bg-red-500/5 hover:border-red-500/10">
            <span className="text-sm">⎋</span>
            <span>Sign out</span>
          </button>
          <div className="flex items-center justify-between px-3 mt-3 opacity-40">
            <p className="text-[9px] text-gray-400 font-mono">v2.0</p>
            <p className="text-[9px] text-gray-400 uppercase tracking-wider">Confidential</p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto bg-[#F9F9F9] pt-14 pb-16 md:pt-0 md:pb-0">
        {children}
      </main>

      {/* Sticky Bottom Navigation Bar for Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-150 flex items-center justify-around z-40 md:hidden px-2 shadow-[0_-2px_10px_rgba(0,0,0,0.03)]">
        {/* Dashboard */}
        <Link href="/" className={`flex flex-col items-center justify-center w-14 h-full transition-colors ${pathname === '/' ? 'text-[#8B1A1A]' : 'text-gray-400 hover:text-gray-600'}`}>
          <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span className="text-[9px] font-semibold tracking-wide">Dashboard</span>
        </Link>

        {/* Menus */}
        <Link href="/menus" className={`flex flex-col items-center justify-center w-14 h-full transition-colors ${pathname.startsWith('/menus') ? 'text-[#8B1A1A]' : 'text-gray-400 hover:text-gray-600'}`}>
          <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-[9px] font-semibold tracking-wide">Menus</span>
        </Link>

        {/* Add/Plus in Center */}
        <Link href="/menus/new" className="flex flex-col items-center justify-center -mt-5">
          <div className="w-12 h-12 rounded-full bg-[#8B1A1A] flex items-center justify-center text-white shadow-lg border-[3px] border-white active:scale-95 transition-transform">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </div>
        </Link>

        {/* Dishes */}
        <Link href="/repository" className={`flex flex-col items-center justify-center w-14 h-full transition-colors ${pathname.startsWith('/repository') ? 'text-[#8B1A1A]' : 'text-gray-400 hover:text-gray-600'}`}>
          <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
          <span className="text-[9px] font-semibold tracking-wide">Dishes</span>
        </Link>

        {/* More */}
        <Link href="/admin" className={`flex flex-col items-center justify-center w-14 h-full transition-colors ${pathname.startsWith('/admin') ? 'text-[#8B1A1A]' : 'text-gray-400 hover:text-gray-600'}`}>
          <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
          </svg>
          <span className="text-[9px] font-semibold tracking-wide">More</span>
        </Link>
      </nav>
    </div>
  );
}
