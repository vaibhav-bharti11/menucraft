'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import type { Menu } from '@/lib/types';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'status-draft',
  READY: 'status-ready',
  SENT: 'status-sent',
  CONFIRMED: 'status-confirmed',
  ARCHIVED: 'status-archived',
};

function StatCard({ 
  value, 
  label, 
  icon 
}: { 
  value: string | number; 
  label: string; 
  icon: string; 
}) {
  return (
    <div className="bg-white border border-[#C9A84C]/15 rounded-[4px] p-4.5 flex flex-col justify-between hover:shadow-[0_16px_40px_rgba(0,0,0,0.06)] hover:-translate-y-0.5 transition-all duration-300 h-full relative group">
      <div className="flex items-start justify-between gap-2">
        <span className="font-body text-[10px] text-[#C9A84C] font-semibold uppercase tracking-[0.26em] truncate">{label}</span>
        <span className="text-gray-400 group-hover:text-[#B11226] transition-colors duration-300 text-base flex-shrink-0">{icon}</span>
      </div>
      <div className="mt-3">
        <div className="font-display text-3xl font-light text-gray-900 leading-none">{value}</div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [dishCount, setDishCount] = useState(0);
  const router = useRouter();

  useEffect(() => {
    Promise.all([
      fetch('/api/menus').then(r => r.json()),
      fetch('/api/dishes').then(r => r.json()),
    ]).then(([menusData, dishesData]) => {
      setMenus(menusData);
      setDishCount(dishesData.length);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleNewMenu = () => router.push('/menus/new');

  const recent = menus
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);

  const sentCount = menus.filter(m => m.status === 'SENT').length;
  const confirmedCount = menus.filter(m => m.status === 'CONFIRMED').length;

  return (
    <AppShell>
      <div className="p-8 max-w-5xl mx-auto animate-fade-in relative bg-[#F9F9F9]">
        {/* Ambient background glow */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[300px] bg-[#8B1A1A]/3 rounded-full blur-[100px] pointer-events-none" />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 relative z-10">
          <div>
            <h1 className="font-display text-4xl font-semibold italic text-gray-900 mb-2">
              Good day, Chef
            </h1>
            <p className="text-gray-500 text-sm">
              Build a new client menu or continue where you left off
            </p>
          </div>
          <button onClick={handleNewMenu}
            className="btn-primary flex items-center justify-center gap-2 self-start sm:self-auto">
            <span className="text-lg font-light">+</span>
            <span>New Menu</span>
          </button>
        </div>

        {/* Gold divider */}
        <div className="gold-rule mb-8" />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 relative z-10">
          <StatCard value={menus.length} label="Total Menus" icon="≡" />
          <StatCard value={dishCount} label="Dishes in Repo" icon="◈" />
          <StatCard value={sentCount} label="Sent to Client" icon="✉" />
          <StatCard value={confirmedCount} label="Confirmed" icon="✓" />
        </div>

        {/* Quick Actions */}
        <div className="mb-10 relative z-10">
          <h2 className="font-body font-semibold text-gray-500 text-xs uppercase tracking-[0.2em] mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'New Menu from Template', desc: 'Start with a pre-built layout', icon: '⊕', href: '/menus/new' },
              { label: 'Browse Dish Repository', desc: '1400+ dishes, search instantly', icon: '◈', href: '/repository' },
              { label: 'Duplicate Last Menu', desc: 'Copy & adapt recent proposal', icon: '⧉', href: '/menus' },
            ].map(action => (
              <Link key={action.label} href={action.href}
                className="card rounded-[4px] p-6 cursor-pointer group flex flex-col justify-between hover:scale-card hover:border-[#C9A84C]/30 duration-300 transition-all bg-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#C9A84C]/5 to-transparent rounded-bl-full pointer-events-none transition-all duration-300 group-hover:scale-110" />
                <div>
                  <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center text-xl mb-4 group-hover:text-[#8B1A1A] transition-colors border border-gray-100 group-hover:border-[#C9A84C]/30">
                    {action.icon}
                  </div>
                  <div className="text-sm font-semibold text-gray-800 mb-1.5 group-hover:text-[#8B1A1A] transition-colors">{action.label}</div>
                  <div className="text-xs text-gray-400 leading-relaxed">{action.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Menus */}
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-body font-semibold text-gray-500 text-xs uppercase tracking-[0.2em]">
              Recent Menus
            </h2>
            <Link href="/menus" className="text-gray-500 text-xs font-semibold hover:text-[#8B1A1A] transition-colors flex items-center gap-1 group">
              <span>View all</span>
              <span className="transform transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
          </div>

          {loading ? (
            <div className="text-gray-400 text-sm">Loading menus…</div>
          ) : recent.length === 0 ? (
            <div className="card rounded-[4px] p-12 text-center border border-dashed border-gray-200 bg-white">
              <div className="text-4xl mb-3 opacity-30 text-[#8B1A1A]">≡</div>
              <p className="text-gray-400 text-sm">No menus yet. Create your first one!</p>
              <button onClick={handleNewMenu} className="btn-primary mt-4 text-xs">
                + New Menu
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recent.map(menu => (
                <Link key={menu.id} href={`/menus/${menu.id}`}
                  className="card rounded-[4px] px-6 py-4.5 flex items-center justify-between hover:border-[#C9A84C]/25 hover:bg-gray-50 group cursor-pointer transition-all duration-250 bg-white">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-[4px] flex items-center justify-center text-sm flex-shrink-0 bg-gray-50 border border-gray-150 group-hover:border-[#C9A84C]/35 transition-colors">
                      <span className="text-[#8B1A1A] font-bold">≡</span>
                    </div>
                    <div>
                      <div className="text-gray-800 text-sm font-semibold group-hover:text-[#8B1A1A] transition-colors">
                        {menu.client_name || 'Unnamed Menu'}
                      </div>
                      <div className="text-gray-400 text-xs mt-1">
                        {menu.event_date || 'No Date'} · {menu.guest_count || '—'} · {menu.venue || '—'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-gray-400 text-xs hidden md:block font-mono bg-gray-50 border border-gray-150 px-2.5 py-0.5 rounded-[4px]">
                      {menu.counters.length} counters
                    </span>
                    <span className={`status-badge ${STATUS_COLORS[menu.status]}`}>
                      {menu.status}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
