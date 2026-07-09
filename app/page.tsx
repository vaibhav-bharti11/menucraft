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

function StatCard({ value, label, icon }: { value: string | number; label: string; icon: string }) {
  return (
    <div className="card p-6 flex items-center gap-4 hover:scale-card transition-all duration-300">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 bg-gradient-to-br from-[#8B1A1A]/20 to-[#C9A84C]/10 border border-[#8B1A1A]/30 shadow-[0_0_12px_rgba(139,26,26,0.15)]">
        <span className="text-[var(--gold)]">{icon}</span>
      </div>
      <div>
        <div className="text-2xl font-display font-semibold text-white tracking-wide">{value}</div>
        <div className="text-xs text-[var(--text-grey)] font-medium uppercase tracking-wider mt-0.5">{label}</div>
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
      <div className="p-8 max-w-5xl mx-auto animate-fade-in relative">
        {/* Ambient background glow */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[300px] bg-[var(--crimson)]/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between mb-8 relative z-10">
          <div>
            <h1 className="font-display text-4xl font-semibold italic text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-[var(--gold-light)] mb-2">
              Good day, Chef
            </h1>
            <p className="text-[var(--text-grey)] text-sm">
              Build a new client menu or continue where you left off
            </p>
          </div>
          <button onClick={handleNewMenu}
            className="btn-primary flex items-center gap-2">
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
          <h2 className="font-body font-semibold text-[var(--gold)]/80 text-xs uppercase tracking-[0.2em] mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'New Menu from Template', desc: 'Start with a pre-built layout', icon: '⊕', href: '/menus/new' },
              { label: 'Browse Dish Repository', desc: '1400+ dishes, search instantly', icon: '◈', href: '/repository' },
              { label: 'Duplicate Last Menu', desc: 'Copy & adapt recent proposal', icon: '⧉', href: '/menus' },
            ].map(action => (
              <Link key={action.label} href={action.href}
                className="card p-6 cursor-pointer group flex flex-col justify-between hover:scale-card hover:border-[var(--gold)]/30 duration-300 transition-all relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[var(--gold)]/5 to-transparent rounded-bl-full pointer-events-none transition-all duration-300 group-hover:scale-110" />
                <div>
                  <div className="w-10 h-10 rounded-lg bg-white/3 flex items-center justify-center text-xl mb-4 group-hover:text-[var(--gold)] transition-colors border border-white/5 group-hover:border-[var(--gold)]/30">
                    {action.icon}
                  </div>
                  <div className="text-sm font-semibold text-white mb-1.5 group-hover:text-[var(--gold-light)] transition-colors">{action.label}</div>
                  <div className="text-xs text-[var(--text-grey)] leading-relaxed">{action.desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Menus */}
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-body font-semibold text-[var(--gold)]/80 text-xs uppercase tracking-[0.2em]">
              Recent Menus
            </h2>
            <Link href="/menus" className="text-[var(--gold)] text-xs font-medium hover:text-[var(--gold-light)] transition-colors flex items-center gap-1 group">
              <span>View all</span>
              <span className="transform transition-transform group-hover:translate-x-0.5">→</span>
            </Link>
          </div>

          {loading ? (
            <div className="text-[var(--text-grey)] text-sm">Loading menus…</div>
          ) : recent.length === 0 ? (
            <div className="card p-12 text-center border border-dashed border-white/5">
              <div className="text-4xl mb-3 opacity-30">≡</div>
              <p className="text-[var(--text-grey)] text-sm">No menus yet. Create your first one!</p>
              <button onClick={handleNewMenu} className="btn-primary mt-4 text-xs">
                + New Menu
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recent.map(menu => (
                <Link key={menu.id} href={`/menus/${menu.id}`}
                  className="card px-6 py-4.5 flex items-center justify-between hover:border-[var(--gold)]/20 hover:bg-white/1 group cursor-pointer transition-all duration-250">
                  <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center text-sm flex-shrink-0 bg-gradient-to-br from-white/5 to-white/0 border border-white/10 group-hover:border-[var(--gold)]/30 transition-colors">
                      <span className="text-[var(--gold)] font-medium">≡</span>
                    </div>
                    <div>
                      <div className="text-white text-sm font-semibold group-hover:text-[var(--gold-light)] transition-colors">
                        {menu.client_name || 'Unnamed Menu'}
                      </div>
                      <div className="text-[var(--text-grey)] text-xs mt-1">
                        {menu.event_date || 'No Date'} · {menu.guest_count || '—'} · {menu.venue || '—'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-[var(--text-grey)] text-xs hidden md:block font-mono bg-white/3 border border-white/5 px-2.5 py-0.5 rounded-md">
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
