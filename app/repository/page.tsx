'use client';
import { useEffect, useState, useMemo } from 'react';
import Fuse from 'fuse.js';
import AppShell from '@/components/AppShell';
import type { Dish, DishFilters, Dietary } from '@/lib/types';

const CUISINE_OPTIONS = ['Continental', 'Indian', 'Asian', 'Japanese', 'Chinese', 'Mediterranean', 'European', 'Middle Eastern', 'Mexican', 'Latin'];
const COURSE_OPTIONS = ['Starter', 'Soup', 'Main', 'Dessert', 'Bread', 'Beverage'];

interface ImageMetadataMap {
  [dishId: string]: {
    filename: string;
    source?: string;
    provider?: string;
    generatedAt?: string;
  };
}

function DishCard({ 
  dish, 
  hasImage,
  onEdit,
  onViewImage 
}: { 
  dish: Dish; 
  hasImage: boolean;
  onEdit: (d: Dish) => void;
  onViewImage: (d: Dish) => void;
}) {
  return (
    <div className="card p-5 hover:border-[var(--gold)]/30 transition-all duration-300 hover:scale-card group relative flex flex-col justify-between h-full bg-white">
      <div>
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-gray-900 text-sm font-semibold leading-tight">{dish.name}</span>
              {dish.is_signature && (
                <span className="badge-signature text-[9px] py-0.5 px-2">★ Signature</span>
              )}
            </div>
            {dish.description && (
              <p className="text-gray-500 text-xs mt-2 leading-relaxed line-clamp-2 italic">
                {dish.description}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            {dish.dietary === 'VEG' ? (
              <span className="badge-veg">● Veg</span>
            ) : (
              <span className="badge-nonveg">● Non-Veg</span>
            )}
            {hasImage ? (
              <button
                type="button"
                onClick={() => onViewImage(dish)}
                className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 flex items-center gap-1 transition-colors"
                title="Verified food photo ready in library"
              >
                <span>✓</span>
                <span>Image</span>
              </button>
            ) : (
              <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-400 border border-gray-200" title="Image not yet generated">
                — Image
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
        <div className="flex flex-wrap gap-1.5">
          {dish.cuisine_tags.slice(0, 2).map(t => (
            <span key={t} className="text-[10px] px-2 py-0.5 rounded-md bg-gray-50 text-gray-500 border border-gray-150 font-medium">
              {t}
            </span>
          ))}
          {dish.course_tags.slice(0, 1).map(t => (
            <span key={t} className="text-[10px] px-2 py-0.5 rounded-md bg-[var(--gold)]/5 text-[var(--gold)] border border-[var(--gold)]/15 font-semibold">
              {t}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => onEdit(dish)}
            className="text-xs text-[var(--gold)] hover:text-[var(--gold-light)] transition-all duration-200 font-semibold">
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}

function ImagePreviewModal({
  dish,
  onClose,
  onRegenerate,
}: {
  dish: Dish;
  onClose: () => void;
  onRegenerate: () => Promise<void>;
}) {
  const [loading, setLoading] = useState(true);
  const [dataUri, setDataUri] = useState<string | null>(null);
  const [meta, setMeta] = useState<any>(null);
  const [generating, setGenerating] = useState(false);

  const fetchImage = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/dish-image?dishId=${dish.id}`);
      const json = await res.json();
      if (json.imageDataUri) {
        setDataUri(json.imageDataUri);
        setMeta(json.entry);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImage();
  }, [dish.id]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/admin/dish-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dishId: dish.id, force: true }),
      });
      const json = await res.json();
      if (json.imageDataUri) {
        setDataUri(json.imageDataUri);
        setMeta(json);
        await onRegenerate();
      }
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-[#120709] border border-[var(--gold)]/30 rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-slide-up text-white">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
          <div>
            <h3 className="font-display text-lg font-semibold text-white">{dish.name}</h3>
            <p className="text-[11px] text-[var(--gold-light)] font-mono">{dish.id} • {dish.dietary}</p>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white text-2xl leading-none">&times;</button>
        </div>

        <div className="space-y-4">
          <div className="aspect-[4/3] w-full rounded-xl overflow-hidden bg-black/50 border border-white/10 flex items-center justify-center relative">
            {loading || generating ? (
              <div className="flex flex-col items-center gap-2 text-sm text-[var(--gold)]">
                <span className="animate-spin text-2xl">⏳</span>
                <span>{generating ? 'Generating dedicated food image…' : 'Loading image…'}</span>
              </div>
            ) : dataUri ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={dataUri} alt={dish.name} className="w-full h-full object-cover" />
            ) : (
              <div className="text-center p-6 text-white/50 text-xs">
                <p className="text-3xl mb-2">🍽️</p>
                <p>No dedicated image currently exists in the library for this dish.</p>
              </div>
            )}
          </div>

          {meta && (
            <div className="bg-white/5 rounded-lg p-3 text-[11px] text-white/70 space-y-1 font-mono">
              <div className="flex justify-between">
                <span>Source:</span>
                <span className="text-[var(--gold)] uppercase font-semibold">{meta.source || 'Generated'}</span>
              </div>
              {meta.provider && (
                <div className="flex justify-between">
                  <span>Provider / Model:</span>
                  <span className="text-white">{meta.provider} ({meta.model || 'v1'})</span>
                </div>
              )}
              {meta.generatedAt && (
                <div className="flex justify-between">
                  <span>Generated At:</span>
                  <span className="text-white/60">{new Date(meta.generatedAt).toLocaleString()}</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6 pt-4 border-t border-white/10">
          <button onClick={onClose} className="btn-ghost flex-1 text-xs py-2 text-white/80">
            Close
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="btn-primary flex-1 text-xs py-2 font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5"
            style={{ background: 'linear-gradient(135deg, #8B1A1A, #b91c1c)' }}
          >
            <span>{generating ? '⏳ Generating…' : (dataUri ? '🔄 Regenerate Image' : '✨ Generate Image')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function AddDishModal({ 
  onClose, 
  onSave,
  dishToEdit
}: { 
  onClose: () => void; 
  onSave: (d: Partial<Dish>) => Promise<void>;
  dishToEdit?: Dish;
}) {
  const [form, setForm] = useState<Partial<Dish>>({
    dietary: 'VEG', is_signature: false, is_active: true,
    cuisine_tags: [], course_tags: [], counter_type_ids: [],
    ...dishToEdit
  });
  const [saving, setSaving] = useState(false);
  const [aiGenerating, setAiGenerating] = useState(false);

  const update = (k: keyof Dish, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-[var(--bg-card)] border border-[var(--border)]/30 rounded-2xl p-6 w-full max-w-lg mx-4 shadow-panel animate-slide-up">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display text-xl font-semibold text-white">{dishToEdit ? 'Edit Dish' : 'Add New Dish'}</h3>
          <button onClick={onClose} className="text-[var(--text-grey)] hover:text-white text-xl">×</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-[var(--text-grey)] uppercase tracking-wider mb-1.5 block">Dish Name *</label>
            <input className="input-field" placeholder="e.g. Galouti Kebab" value={form.name ?? ''}
              onChange={e => update('name', e.target.value)} />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-[var(--text-grey)] uppercase tracking-wider block">Description</label>
              <button
                type="button"
                disabled={!form.name || aiGenerating}
                onClick={async () => {
                  if (!form.name) return;
                  setAiGenerating(true);
                  try {
                    const res = await fetch('/api/ai', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        action: 'generate-description',
                        payload: {
                          dishName: form.name,
                          category: form.dietary,
                          cuisine: form.cuisine_tags?.[0],
                          course: form.course_tags?.[0],
                          currentDescription: form.description,
                        },
                      }),
                    });
                    const json = await res.json();
                    if (json.success && json.data?.description) {
                      update('description', json.data.description);
                    }
                  } catch (err) {
                    console.error(err);
                  } finally {
                    setAiGenerating(false);
                  }
                }}
                className="text-[10px] bg-[#FAF0E6] text-[#8B1A1A] hover:bg-[#F3E5D8] px-2 py-0.5 rounded font-bold flex items-center gap-1 border border-[#C9A84C]/30 disabled:opacity-40 transition-colors"
              >
                <span>✨</span>
                <span>{aiGenerating ? 'Generating…' : 'AI Generate'}</span>
              </button>
            </div>
            <textarea className="input-field resize-none" rows={3}
              placeholder="Italic line in PDF — max 200 chars"
              value={form.description ?? ''}
              onChange={e => update('description', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[var(--text-grey)] uppercase tracking-wider mb-1.5 block">Dietary</label>
              <select className="input-field" value={form.dietary}
                onChange={e => update('dietary', e.target.value)}>
                <option value="VEG">Vegetarian</option>
                <option value="NON_VEG">Non-Vegetarian</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--text-grey)] uppercase tracking-wider mb-1.5 block">Cuisine</label>
              <select className="input-field" value={form.cuisine_tags?.[0] ?? ''}
                onChange={e => update('cuisine_tags', e.target.value ? [e.target.value] : [])}>
                <option value="">Select…</option>
                {CUISINE_OPTIONS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-[var(--text-grey)] uppercase tracking-wider mb-1.5 block">Course</label>
            <select className="input-field" value={form.course_tags?.[0] ?? ''}
              onChange={e => update('course_tags', e.target.value ? [e.target.value] : [])}>
              <option value="">Select…</option>
              {COURSE_OPTIONS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.is_signature ?? false}
              onChange={e => update('is_signature', e.target.checked)}
              className="accent-[var(--crimson)]" />
            <span className="text-sm text-[var(--text-grey)]">★ Embassy Signature dish</span>
          </label>
        </div>

        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button onClick={handleSave} disabled={!form.name || saving}
            className="btn-primary flex-1 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #8B1A1A, #b91c1c)' }}>
            {saving ? 'Saving…' : (dishToEdit ? 'Save Changes' : 'Add Dish')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RepositoryPage() {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<DishFilters & { imageStatus?: 'has_image' | 'no_image' | '' }>({ is_active: true });
  const [showAdd, setShowAdd] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [previewDish, setPreviewDish] = useState<Dish | null>(null);
  const [availableDishIds, setAvailableDishIds] = useState<Set<string>>(new Set());

  const fetchDishes = () => {
    fetch('/api/dishes').then(r => r.json()).then(data => {
      setDishes(data);
      setLoading(false);
    });
  };

  const fetchImageMetadata = () => {
    fetch('/api/admin/dish-image')
      .then(r => r.json())
      .then(data => {
        if (data.availableDishIds && Array.isArray(data.availableDishIds)) {
          setAvailableDishIds(new Set(data.availableDishIds));
        }
      })
      .catch(() => {});
  };

  useEffect(() => { 
    fetchDishes(); 
    fetchImageMetadata();
  }, []);

  const fuse = useMemo(() => new Fuse(dishes, {
    keys: ['name', 'description', 'cuisine_tags', 'course_tags', 'id'],
    threshold: 0.35,
  }), [dishes]);

  const filtered = useMemo(() => {
    let result = search
      ? fuse.search(search).map(r => r.item)
      : [...dishes];

    if (filters.dietary) result = result.filter(d => d.dietary === filters.dietary);
    if (filters.cuisine) result = result.filter(d => d.cuisine_tags.includes(filters.cuisine!));
    if (filters.course) result = result.filter(d => d.course_tags.includes(filters.course!));
    if (filters.is_signature) result = result.filter(d => d.is_signature);
    if (filters.imageStatus === 'has_image') result = result.filter(d => availableDishIds.has(d.id));
    if (filters.imageStatus === 'no_image') result = result.filter(d => !availableDishIds.has(d.id));
    result = result.filter(d => d.is_active);

    return result;
  }, [dishes, search, filters, fuse, availableDishIds]);

  const handleSave = async (form: Partial<Dish>) => {
    const isEdit = !!form.id;
    const url = '/api/dishes';
    const method = isEdit ? 'PATCH' : 'POST';

    await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isEdit ? form : { ...form, created_by: 'Admin' }),
    });
    fetchDishes();
  };

  const vegCount = filtered.filter(d => d.dietary === 'VEG').length;
  const nonVegCount = filtered.filter(d => d.dietary === 'NON_VEG').length;

  return (
    <AppShell>
      <div className="flex flex-col lg:flex-row lg:h-full min-h-screen lg:min-h-0 animate-fade-in relative">
        {/* Filters Sidebar */}
        <aside className="w-full lg:w-56 flex-shrink-0 border-b lg:border-b-0 lg:border-r border-white/5 p-5 bg-gradient-to-b from-[#110608] to-[#16080b]">
          <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--gold)]/80 mb-5">Filters</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-4">
            <div>
              <label className="text-[10px] text-white/50 uppercase tracking-wider mb-1.5 block">Dietary</label>
              <select className="input-field text-xs py-2"
                value={filters.dietary ?? ''}
                onChange={e => setFilters(f => ({ ...f, dietary: (e.target.value as Dietary | '') || undefined }))}>
                <option value="">All</option>
                <option value="VEG">Vegetarian</option>
                <option value="NON_VEG">Non-Vegetarian</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-white/50 uppercase tracking-wider mb-1.5 block">Cuisine</label>
              <select className="input-field text-xs py-2"
                value={filters.cuisine ?? ''}
                onChange={e => setFilters(f => ({ ...f, cuisine: e.target.value || undefined }))}>
                <option value="">All Cuisines</option>
                {CUISINE_OPTIONS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className="text-[10px] text-white/50 uppercase tracking-wider mb-1.5 block">Course</label>
              <select className="input-field text-xs py-2"
                value={filters.course ?? ''}
                onChange={e => setFilters(f => ({ ...f, course: e.target.value || undefined }))}>
                <option value="">All Courses</option>
                {COURSE_OPTIONS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="mt-4 lg:mt-6">
            <label className="flex items-center gap-2 cursor-pointer pt-2 group">
              <input type="checkbox" checked={filters.is_signature ?? false}
                onChange={e => setFilters(f => ({ ...f, is_signature: e.target.checked || undefined }))}
                className="accent-[var(--gold)]" />
              <span className="text-xs text-[var(--text-grey)] group-hover:text-white transition-colors">★ Signature only</span>
            </label>
          </div>

          <div className="mt-6 lg:mt-8 pt-5 border-t border-white/5">
            <div className="text-xs text-[var(--text-grey)] bg-white/[0.02] border border-white/5 rounded-xl p-4 space-y-2">
              <div className="flex justify-between items-center pb-1.5 border-b border-white/5">
                <span className="font-medium text-white/60">Showing</span>
                <span className="text-white font-mono font-semibold">{filtered.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>● Veg</span>
                <span className="text-green-400 font-mono font-semibold">{vegCount}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>● Non-Veg</span>
                <span className="text-red-400 font-mono font-semibold">{nonVegCount}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 flex flex-col lg:overflow-hidden bg-gradient-to-br from-[#0c0507] via-[#0A0405] to-[#120608]">
          {/* Header */}
          <div className="px-6 py-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-transparent via-[#8B1A1A]/3 to-transparent">
            <div>
              <h1 className="font-display text-2xl font-semibold italic text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-[var(--gold-light)]">Dish Repository</h1>
              <p className="text-xs text-[var(--text-grey)] mt-0.5">{dishes.length} dishes total in culinary master library</p>
            </div>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="relative flex-1 md:flex-none">
                <input
                  className="input-field w-full md:w-64 pl-9 py-2"
                  placeholder="Search dishes by name or ID…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
                <span className="absolute left-3 top-2 text-white/30 text-sm">🔍</span>
              </div>
              <button onClick={() => setShowAdd(true)}
                className="btn-primary text-xs whitespace-nowrap">
                + Add Dish
              </button>
            </div>
          </div>

          {/* Grid */}
          <div className="flex-1 lg:overflow-y-auto p-6 pb-20 lg:pb-6">
            {loading ? (
              <div className="text-[var(--text-grey)] text-sm">Loading repository…</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-24 text-[var(--text-grey)]">
                <div className="text-5xl mb-4 opacity-25">◈</div>
                <p className="text-sm font-medium">No dishes found. Try adjusting filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map(dish => (
                  <DishCard 
                    key={dish.id} 
                    dish={dish} 
                    hasImage={availableDishIds.has(dish.id)}
                    onEdit={(d) => setEditingDish(d)} 
                    onViewImage={(d) => setPreviewDish(d)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showAdd && (
        <AddDishModal onClose={() => setShowAdd(false)} onSave={handleSave} />
      )}

      {editingDish && (
        <AddDishModal dishToEdit={editingDish} onClose={() => setEditingDish(null)} onSave={handleSave} />
      )}

      {previewDish && (
        <ImagePreviewModal
          dish={previewDish}
          onClose={() => setPreviewDish(null)}
          onRegenerate={async () => {
            fetchImageMetadata();
          }}
        />
      )}
    </AppShell>
  );
}
