'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import type { Menu, MenuStatus } from '@/lib/types';

const STATUS_LABELS: Record<MenuStatus, string> = {
  DRAFT: 'Draft',
  READY: 'Ready',
  SENT: 'Sent',
  CONFIRMED: 'Confirmed',
  ARCHIVED: 'Archived',
};
const STATUS_CSS: Record<MenuStatus, string> = {
  DRAFT: 'status-draft',
  READY: 'status-ready',
  SENT: 'status-sent',
  CONFIRMED: 'status-confirmed',
  ARCHIVED: 'status-archived',
};

export default function MenusPage() {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<MenuStatus | ''>('');
  const router = useRouter();

  const fetchMenus = () => {
    fetch('/api/menus').then(r => r.json()).then(data => {
      setMenus(data);
      setLoading(false);
    });
  };

  useEffect(() => { fetchMenus(); }, []);

  const filtered = menus.filter(m => {
    const matchSearch = !search || m.client_name.toLowerCase().includes(search.toLowerCase()) || m.venue.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || m.status === statusFilter;
    return matchSearch && matchStatus;
  }).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  const handleDuplicate = async (menu: Menu) => {
    const dup: Partial<Menu> = {
      ...menu,
      id: undefined as unknown as string,
      client_name: `${menu.client_name} (Copy)`,
      status: 'DRAFT',
    };
    delete (dup as Record<string, unknown>).id;
    const res = await fetch('/api/menus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dup),
    });
    const newMenu = await res.json();
    fetchMenus();
    router.push(`/menus/${newMenu.id}`);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this menu?')) return;
    await fetch(`/api/menus?id=${id}`, { method: 'DELETE' });
    fetchMenus();
  };

  return (
    <AppShell>
      <div className="p-8 max-w-5xl mx-auto animate-fade-in relative">
        {/* Ambient background glow */}
        <div className="absolute top-0 right-1/4 w-[400px] h-[250px] bg-[var(--crimson)]/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative z-10">
          <div>
            <h1 className="font-display text-4xl font-semibold italic text-gray-900">Menus</h1>
            <p className="text-[var(--text-grey)] text-xs mt-1 uppercase tracking-wider font-semibold">{menus.length} proposals total</p>
          </div>
          <Link href="/menus/new"
            className="btn-primary flex items-center justify-center gap-2 self-start sm:self-auto">
            <span className="text-lg font-light">+</span>
            <span>New Menu</span>
          </Link>
        </div>

        <div className="gold-rule mb-6" />

        {/* Filters */}
        <div className="card p-4 flex flex-col sm:flex-row gap-3 mb-6 bg-white/[0.02] relative z-10">
          <div className="flex-1 relative">
            <input className="input-field pl-10 py-2.5" placeholder="Search by client or venue…"
              value={search} onChange={e => setSearch(e.target.value)} />
            <span className="absolute left-3.5 top-3.5 text-gray-400 text-sm pointer-events-none">🔍</span>
          </div>
          <select className="input-field w-full sm:w-44 py-2.5" value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as MenuStatus | '')}>
            <option value="">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {loading ? (
          <p className="text-[var(--text-grey)] text-sm">Loading…</p>
        ) : filtered.length === 0 ? (
          <div className="card p-16 text-center border border-dashed border-white/5 relative z-10">
            <div className="text-4xl mb-3 opacity-30">≡</div>
            <p className="text-[var(--text-grey)] text-sm mb-4">No menus match the criteria</p>
            <Link href="/menus/new" className="btn-primary text-xs">+ New Menu</Link>
          </div>
        ) : (
          <div className="space-y-3 relative z-10">
            {filtered.map(menu => (
              <div key={menu.id}
                className="card px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 hover:border-[var(--gold)]/20 group hover:bg-gray-50 transition-all duration-200">
                <Link href={`/menus/${menu.id}`} className="flex items-center gap-4 flex-1 min-w-0 w-full">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-sm bg-gray-50 border border-gray-150 group-hover:border-[var(--gold)]/30 transition-colors">
                    <span className="text-[#8B1A1A] font-semibold">≡</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-gray-800 text-sm font-semibold group-hover:text-[#8B1A1A] transition-colors truncate">
                      {menu.client_name || 'Unnamed Menu'}
                    </div>
                    <div className="text-[var(--text-grey)] text-xs mt-1 truncate">
                      {menu.event_date ? new Date(menu.event_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No date'} · {menu.guest_count || '0'} Pax · {menu.function_type} · {menu.venue || '—'}
                    </div>
                  </div>
                </Link>
                <div className="flex items-center justify-between sm:justify-end gap-3.5 flex-shrink-0 w-full sm:w-auto border-t sm:border-t-0 pt-2 sm:pt-0 border-gray-100">
                  <div className="flex items-center gap-3">
                    <span className="text-[var(--text-grey)] text-xs hidden lg:block font-mono bg-gray-50 border border-gray-150 px-2.5 py-0.5 rounded-md">
                      {menu.counters.length} counters
                    </span>
                    <span className={`status-badge ${STATUS_CSS[menu.status]}`}>{STATUS_LABELS[menu.status]}</span>
                  </div>
                  <div className="flex gap-1.5 sm:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <button onClick={() => handleDuplicate(menu)}
                      title="Duplicate" className="btn-ghost text-xs p-1.5 hover:text-[var(--gold)]">⧉</button>
                    <button onClick={() => handleDelete(menu.id)}
                      title="Delete" className="btn-ghost text-xs p-1.5 hover:text-red-400">✕</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
