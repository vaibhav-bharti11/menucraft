'use client';
import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import type { CounterType } from '@/lib/types';

export default function AdminPage() {
  const [counterTypes, setCounterTypes] = useState<CounterType[]>([]);
  const [loading, setLoading] = useState(true);
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CounterType>>({});
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newForm, setNewForm] = useState<Partial<CounterType>>({
    veg_section_label: 'Vegetarian',
    non_veg_section_label: 'Non Vegetarian',
    is_active: true,
  });

  const fetchCounterTypes = () => {
    fetch('/api/counter-types').then(r => r.json()).then(data => {
      setCounterTypes(data.sort((a: CounterType, b: CounterType) => a.sort_order - b.sort_order));
      setLoading(false);
    });
  };

  useEffect(() => { fetchCounterTypes(); }, []);

  const handleEdit = (ct: CounterType) => {
    setEditId(ct.id);
    setEditForm({ ...ct });
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    await fetch('/api/counter-types', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    });
    setEditId(null);
    setSaving(false);
    fetchCounterTypes();
  };

  const handleAddNew = async () => {
    if (!newForm.display_name) return;
    setSaving(true);
    await fetch('/api/counter-types', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newForm),
    });
    setSaving(false);
    setShowAdd(false);
    setNewForm({ veg_section_label: 'Vegetarian', non_veg_section_label: 'Non Vegetarian', is_active: true });
    fetchCounterTypes();
  };

  const handleToggleActive = async (ct: CounterType) => {
    await fetch('/api/counter-types', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: ct.id, is_active: !ct.is_active }),
    });
    fetchCounterTypes();
  };

  const categories = Array.from(new Set(counterTypes.map(c => c.category)));

  return (
    <AppShell>
      <div className="p-8 max-w-5xl mx-auto animate-fade-in relative">
        {/* Ambient background glow */}
        <div className="absolute top-0 right-1/4 w-[400px] h-[250px] bg-[var(--crimson)]/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="flex items-center justify-between mb-6 relative z-10">
          <div>
            <h1 className="font-display text-4xl font-semibold italic text-gray-900">Admin Panel</h1>
            <p className="text-[var(--text-grey)] text-sm mt-1">Manage counter types, branding, and system settings</p>
          </div>
          <button onClick={() => setShowAdd(true)}
            className="btn-secondary text-[#8B1A1A] border-[#8B1A1A]/35 hover:bg-[#8B1A1A]/5 text-xs py-2 font-bold">+ Add Counter Type</button>
        </div>

        <div className="gold-rule mb-8" />

        {/* Counter Type Library */}
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-body font-semibold text-[var(--gold)]/80 text-xs uppercase tracking-[0.2em]">Counter Type Library</h2>
          </div>

          {loading ? (
            <p className="text-[var(--text-grey)] text-sm">Loading…</p>
          ) : (
            <div className="space-y-6">
              {categories.map(category => (
                <div key={category} className="space-y-2.5">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-gray-500 font-bold px-1">
                    {category}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {counterTypes.filter(c => c.category === category).map(ct => (
                      <div key={ct.id} className={`card px-5 py-4 flex flex-col justify-between transition-all duration-300 ${!ct.is_active ? 'opacity-35 hover:opacity-50' : ''}`}>
                        {editId === ct.id ? (
                          <div className="space-y-4 w-full">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <label className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 block font-bold">Display Name</label>
                                <input className="input-field py-1.5 text-xs bg-gray-50 focus:bg-white"
                                  value={editForm.display_name ?? ''}
                                  onChange={e => setEditForm(f => ({ ...f, display_name: e.target.value }))} />
                              </div>
                              <div>
                                <label className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 block font-bold">Category</label>
                                <input className="input-field py-1.5 text-xs bg-gray-50 focus:bg-white"
                                  value={editForm.category ?? ''}
                                  onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))} />
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 block font-bold">Default Description</label>
                              <textarea className="input-field text-xs resize-none bg-gray-50 focus:bg-white" rows={2}
                                value={editForm.default_description ?? ''}
                                onChange={e => setEditForm(f => ({ ...f, default_description: e.target.value }))} />
                            </div>
                            <div className="flex gap-2">
                              <button onClick={handleSaveEdit} disabled={saving}
                                className="btn-primary text-xs py-1.5 px-4 disabled:opacity-50">
                                {saving ? 'Saving…' : 'Save'}
                              </button>
                              <button onClick={() => setEditId(null)} className="btn-ghost text-xs py-1.5">Cancel</button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-4 h-full bg-white">
                            <div className="flex-1 min-w-0">
                              <div className="text-gray-800 text-sm font-semibold tracking-wide">{ct.display_name}</div>
                              <div className="text-gray-500 text-xs mt-2 line-clamp-2 italic leading-relaxed">{ct.default_description}</div>
                            </div>
                            <div className="flex flex-col items-end justify-between h-full min-h-[4.5rem] flex-shrink-0">
                              <button onClick={() => handleToggleActive(ct)}
                                className={`text-[10px] uppercase tracking-wider font-semibold py-1 px-2.5 rounded transition-all duration-200 ${ct.is_active ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200' : 'bg-red-50 text-red-700 border border-red-200 hover:bg-green-50 hover:text-green-700 hover:border-green-200'}`}>
                                {ct.is_active ? 'Active' : 'Inactive'}
                              </button>
                              <button onClick={() => handleEdit(ct)}
                                className="btn-ghost text-[10px] py-1 px-2.5 hover:text-[#8B1A1A] font-semibold">Edit</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add Counter Type Modal */}
        {showAdd && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-md mx-4 shadow-xl animate-slide-up">
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-150">
                <h3 className="font-display text-xl font-semibold text-gray-900">New Counter Type</h3>
                <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600 text-2xl transition-colors">&times;</button>
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-400 uppercase tracking-wider block font-bold">Display Name *</label>
                  <input className="input-field bg-gray-50 focus:bg-white" placeholder="e.g. Live Taco Bar"
                    value={newForm.display_name ?? ''}
                    onChange={e => setNewForm(f => ({ ...f, display_name: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-400 uppercase tracking-wider block font-bold">Category</label>
                  <input className="input-field bg-gray-50 focus:bg-white" placeholder="e.g. Latin Live"
                    value={newForm.category ?? ''}
                    onChange={e => setNewForm(f => ({ ...f, category: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-gray-400 uppercase tracking-wider block font-bold">Default Description</label>
                  <textarea className="input-field resize-none py-2 bg-gray-50 focus:bg-white" rows={3}
                    placeholder="Editorial description for client PDF"
                    value={newForm.default_description ?? ''}
                    onChange={e => setNewForm(f => ({ ...f, default_description: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowAdd(false)} className="btn-ghost flex-1">Cancel</button>
                <button onClick={handleAddNew} disabled={!newForm.display_name || saving}
                  className="btn-primary flex-1 disabled:opacity-50">
                  {saving ? 'Adding…' : 'Add Counter Type'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Branding info */}
        <div className="mt-12 relative z-10">
          <div className="gold-rule mb-6" />
          <h2 className="font-body font-semibold text-[var(--gold)]/80 text-xs uppercase tracking-[0.2em] mb-5">Branding & Settings</h2>
          <div className="card p-6 bg-white border border-gray-150">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { label: 'Heritage Crimson', hex: '#8B1A1A', sample: true },
                { label: 'Gold Accent', hex: '#C9A84C', sample: true },
                { label: 'Ivory Parchment', hex: '#FAF7F2', sample: true },
              ].map(token => (
                <div key={token.label} className="flex items-center gap-3.5 p-3 rounded-xl bg-gray-50 border border-gray-150">
                  <div className="w-10 h-10 rounded-lg border border-gray-200 flex-shrink-0"
                    style={{ background: token.hex }} />
                  <div>
                    <div className="text-gray-800 text-xs font-semibold">{token.label}</div>
                    <div className="text-gray-400 text-[10px] font-mono mt-0.5">{token.hex}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-5 border-t border-gray-150 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-gray-400 uppercase tracking-wider mb-1 font-bold">Default Sign-Off</div>
                <p className="text-gray-850 text-xs font-semibold">Pranay Bahl · 9899004852</p>
              </div>
              <p className="text-[var(--text-grey)] text-[10px] italic">Can be edited inside the builder per event</p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
