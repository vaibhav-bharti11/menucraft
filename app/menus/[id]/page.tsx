'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import AppShell from '@/components/AppShell';
import type { Menu, MenuCounter, CounterType, Dish, DishRef, MenuStatus } from '@/lib/types';

const STATUS_FLOW: MenuStatus[] = ['DRAFT', 'READY', 'SENT', 'CONFIRMED', 'ARCHIVED'];

// ─── Sortable Counter Block ────────────────────────────────────────────────────

function SortableCounter({
  counter,
  onUpdate,
  onRemove,
  onAddDish,
  onRemoveDish,
}: {
  counter: MenuCounter;
  onUpdate: (id: string, updates: Partial<MenuCounter>) => void;
  onRemove: (id: string) => void;
  onAddDish: (counterId: string) => void;
  onRemoveDish: (counterId: string, sectionKind: string, dishId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: counter.id });
  const [editingName, setEditingName] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [localName, setLocalName] = useState(counter.display_name);
  const [localDesc, setLocalDesc] = useState(counter.description);
  const [collapsed, setCollapsed] = useState(false);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const allDishes = counter.sections.flatMap(s => s.dishes);

  return (
    <div ref={setNodeRef} style={style}
      className={`counter-block mb-4 transition-all duration-300 ${isDragging ? 'ring-2 ring-[var(--gold)]/50 shadow-[0_12px_40px_rgba(201,168,76,0.25)] scale-[1.01] z-50' : 'border-white/5 shadow-md'}`}>
      {/* Counter Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/5 bg-white/[0.01]">
        {/* Drag handle */}
        <button {...attributes} {...listeners}
          className="text-white/35 cursor-grab active:cursor-grabbing hover:text-[var(--gold)] transition-colors text-sm flex-shrink-0 p-1">
          ⠿
        </button>

        {/* Name */}
        {editingName ? (
          <input
            className="input-field flex-1 py-1 px-2.5 text-sm"
            value={localName}
            autoFocus
            onChange={e => setLocalName(e.target.value)}
            onBlur={() => { setEditingName(false); onUpdate(counter.id, { display_name: localName, display_name_print: localName.toUpperCase() }); }}
            onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
          />
        ) : (
          <div className="flex-1 flex items-center gap-2 cursor-pointer group"
            onClick={() => setEditingName(true)}>
            <span className="text-white text-sm font-semibold tracking-wide group-hover:text-[var(--gold-light)] transition-colors">{counter.display_name}</span>
            <span className="text-[var(--gold)] text-xs opacity-0 group-hover:opacity-100 transition-opacity">✎</span>
          </div>
        )}

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-white/40 text-xs font-medium px-2 py-0.5 bg-white/3 rounded border border-white/5 font-mono">{allDishes.length} dishes</span>
          <button onClick={() => setCollapsed(c => !c)}
            className="btn-ghost text-xs p-1.5 hover:text-white">{collapsed ? '▼' : '▲'}</button>
          <button onClick={() => onRemove(counter.id)}
            className="btn-ghost text-xs p-1.5 hover:text-red-400">✕</button>
        </div>
      </div>

      {!collapsed && (
        <>
          {/* Description */}
          <div className="px-5 py-2.5 border-b border-white/5 bg-black/5">
            {editingDesc ? (
              <textarea
                className="input-field text-xs resize-none py-1.5 px-2.5"
                rows={2}
                value={localDesc}
                autoFocus
                onChange={e => setLocalDesc(e.target.value)}
                onBlur={() => { setEditingDesc(false); onUpdate(counter.id, { description: localDesc }); }}
              />
            ) : (
              <p className="text-[var(--text-grey)] text-xs italic cursor-pointer hover:text-white/75 transition-colors leading-relaxed"
                onClick={() => setEditingDesc(true)}>
                {counter.description || <span className="opacity-30">Click to add description…</span>}
              </p>
            )}
          </div>

          {/* Dishes by section */}
          <div className="px-5 py-4 space-y-4">
            {counter.sections.map(section => (
              <div key={section.kind} className="space-y-2">
                <div className="text-[9px] uppercase tracking-[0.18em] font-semibold flex items-center gap-2"
                  style={{ color: section.kind === 'NON_VEG' ? '#EF4444' : section.kind === 'VEG' ? '#10B981' : '#C9A84C' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: section.kind === 'NON_VEG' ? '#EF4444' : section.kind === 'VEG' ? '#10B981' : '#C9A84C' }} />
                  {section.label || (section.kind === 'VEG' ? 'Vegetarian' : section.kind === 'NON_VEG' ? 'Non Vegetarian' : 'Mixed')}
                </div>
                <div className="space-y-1.5">
                  {section.dishes.map(dish => (
                    <div key={dish.dish_id}
                      className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 group transition-all duration-200">
                      <div className="flex-1 min-w-0 pr-3">
                        <div className="text-white text-xs font-semibold truncate">{dish.name}</div>
                        {dish.description && (
                          <div className="text-[var(--text-grey)] text-[10px] truncate mt-0.5 italic">{dish.description}</div>
                        )}
                      </div>
                      <button onClick={() => onRemoveDish(counter.id, section.kind, dish.dish_id)}
                        className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400 transition-all duration-200 ml-2 text-xs flex-shrink-0 p-1">
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {counter.sections.length === 0 && (
              <p className="text-white/30 text-xs italic py-2">No dishes added yet</p>
            )}

            <button onClick={() => onAddDish(counter.id)}
              className="mt-1 text-xs font-semibold text-[var(--gold)] hover:text-[var(--gold-light)] transition-colors flex items-center gap-1.5 px-2 py-1 rounded bg-[var(--gold)]/5 hover:bg-[var(--gold)]/10 border border-[var(--gold)]/15">
              <span className="text-sm font-light">+</span>
              <span>Add Dish</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Dish Picker Slide Panel ───────────────────────────────────────────────────

function DishPickerPanel({
  counterId,
  counterTypeId,
  allDishIds,
  onClose,
  onAdd,
}: {
  counterId: string;
  counterTypeId: string;
  allDishIds: Set<string>;
  onClose: () => void;
  onAdd: (counterId: string, sectionKind: string, dish: DishRef) => void;
}) {
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dishes').then(r => r.json()).then((data: Dish[]) => {
      setDishes(data.filter(d => d.is_active));
      setLoading(false);
    });
  }, []);

  const filtered = dishes.filter(d => {
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase());
    const matchCounter = d.counter_type_ids.length === 0 || d.counter_type_ids.includes(counterTypeId);
    return matchSearch && matchCounter;
  });

  const handleAdd = (dish: Dish) => {
    onAdd(counterId, dish.dietary === 'NON_VEG' ? 'NON_VEG' : 'VEG', {
      dish_id: dish.id,
      name: dish.name,
      description: dish.description,
      dietary: dish.dietary,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm transition-opacity duration-300" onClick={onClose} />
      <div className="w-[26rem] bg-[#120608]/95 backdrop-blur-[32px] border-l border-white/5 flex flex-col shadow-[0_0_50px_rgba(0,0,0,0.7)] animate-slide-in">
        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-white/[0.01]">
          <h3 className="font-display text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-white to-[var(--gold-light)]">Add Dish</h3>
          <button onClick={onClose} className="text-white/40 hover:text-white text-2xl transition-colors">&times;</button>
        </div>

        <div className="px-5 py-4 border-b border-white/5 relative">
          <input className="input-field pl-9 py-2 text-sm" placeholder="Search dishes…"
            value={search} onChange={e => setSearch(e.target.value)} autoFocus />
          <span className="absolute left-8 top-5 text-white/30 text-sm">🔍</span>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {loading ? (
            <p className="text-[var(--text-grey)] text-sm">Loading repository…</p>
          ) : filtered.length === 0 ? (
            <p className="text-[var(--text-grey)] text-sm italic">No dishes match this counter category.</p>
          ) : filtered.map(dish => {
            const added = allDishIds.has(dish.id);
            return (
              <div key={dish.id}
                className={`p-3.5 rounded-xl border transition-all duration-200 ${added ? 'opacity-30 border-transparent bg-white/[0.01]' : 'border-white/5 hover:border-[var(--gold)]/30 cursor-pointer hover:bg-white/[0.03]'}`}
                onClick={added ? undefined : () => handleAdd(dish)}>
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-xs font-semibold flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: dish.dietary === 'NON_VEG' ? '#EF4444' : '#10B981' }} />
                      <span className="truncate">{dish.name}</span>
                      {dish.is_signature && <span className="badge-signature text-[8px] py-0 px-1.5 ml-1">★ Signature</span>}
                    </div>
                    {dish.description && (
                      <div className="text-[var(--text-grey)] text-[10px] mt-1.5 line-clamp-1 italic leading-normal">{dish.description}</div>
                    )}
                  </div>
                  {added ? (
                    <span className="text-[10px] text-[var(--gold)] ml-2 font-semibold font-mono uppercase bg-[var(--gold)]/5 px-2 py-0.5 rounded border border-[var(--gold)]/20">Added</span>
                  ) : (
                    <span className="text-[var(--gold)] hover:text-white text-xs font-bold ml-2 bg-white/3 hover:bg-[var(--gold)]/10 px-2 py-0.5 rounded border border-white/5 hover:border-[var(--gold)]/20 transition-all">+ Add</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Main Menu Builder Page ────────────────────────────────────────────────────

export default function MenuBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const [menu, setMenu] = useState<Menu | null>(null);
  const [counterTypes, setCounterTypes] = useState<CounterType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [activePickerCounterId, setActivePickerCounterId] = useState<string | null>(null);
  const [showCounterPicker, setShowCounterPicker] = useState(false);
  const [pdfMode, setPdfMode] = useState<'classic' | 'modern'>('classic');
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    const id = params.id as string;
    Promise.all([
      fetch(`/api/menus?id=${id}`).then(r => r.json()),
      fetch('/api/counter-types').then(r => r.json()),
    ]).then(([menuData, ctData]) => {
      setMenu(menuData);
      setCounterTypes(ctData);
      setLoading(false);
    });
  }, [params.id]);

  // Auto-save every 30 seconds
  const saveMenu = useCallback(async (m: Menu) => {
    setSaving(true);
    await fetch('/api/menus', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(m),
    });
    setSaving(false);
    setLastSaved(new Date().toLocaleTimeString());
    setIsDirty(false);
  }, []);

  useEffect(() => {
    if (!menu || !isDirty) return;
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => saveMenu(menu), 30000);
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); };
  }, [menu, isDirty, saveMenu]);

  const updateMenu = (updates: Partial<Menu>) => {
    setMenu(m => m ? { ...m, ...updates, updated_at: new Date().toISOString() } : null);
    setIsDirty(true);
  };

  const updateCounter = (id: string, updates: Partial<MenuCounter>) => {
    setMenu(m => m ? {
      ...m,
      counters: m.counters.map(c => c.id === id ? { ...c, ...updates } : c),
      updated_at: new Date().toISOString(),
    } : null);
    setIsDirty(true);
  };

  const removeCounter = (id: string) => {
    setMenu(m => m ? { ...m, counters: m.counters.filter(c => c.id !== id) } : null);
    setIsDirty(true);
  };

  const addDishToCounter = (counterId: string, sectionKind: string, dish: DishRef) => {
    setMenu(m => {
      if (!m) return null;
      return {
        ...m,
        counters: m.counters.map(c => {
          if (c.id !== counterId) return c;
          const existing = c.sections.find(s => s.kind === sectionKind);
          const sections = existing
            ? c.sections.map(s => s.kind === sectionKind ? { ...s, dishes: [...s.dishes, dish] } : s)
            : [...c.sections, { label: sectionKind === 'VEG' ? 'Vegetarian' : 'Non Vegetarian', kind: sectionKind as 'VEG' | 'NON_VEG', dishes: [dish] }];
          return { ...c, sections };
        }),
      };
    });
    setIsDirty(true);
  };

  const removeDishFromCounter = (counterId: string, sectionKind: string, dishId: string) => {
    setMenu(m => m ? {
      ...m,
      counters: m.counters.map(c => c.id !== counterId ? c : {
        ...c,
        sections: c.sections.map(s => s.kind === sectionKind ? { ...s, dishes: s.dishes.filter(d => d.dish_id !== dishId) } : s),
      }),
    } : null);
    setIsDirty(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !menu) return;
    const oldIndex = menu.counters.findIndex(c => c.id === active.id);
    const newIndex = menu.counters.findIndex(c => c.id === over.id);
    setMenu(m => m ? { ...m, counters: arrayMove(m.counters, oldIndex, newIndex) } : null);
    setIsDirty(true);
  };

  const addCounter = (ct: CounterType) => {
    const newCounter: MenuCounter = {
      id: `counter-${Date.now()}`,
      counter_type_id: ct.id,
      display_name: ct.display_name,
      display_name_print: ct.display_name.toUpperCase(),
      description: ct.default_description,
      accompaniments_label: null,
      accompaniments: null,
      sections: [],
    };
    setMenu(m => m ? { ...m, counters: [...m.counters, newCounter] } : null);
    setIsDirty(true);
    setShowCounterPicker(false);
  };

  const generatePdf = async () => {
    if (!menu) return;
    setGeneratingPdf(true);
    try {
      const res = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menu, mode: pdfMode }),
      });

      if (!res.ok) {
        alert('Failed to generate PDF. Please try again.');
        return;
      }

      const pdfMode_ = res.headers.get('X-PDF-Mode');
      const filename = res.headers.get('X-PDF-Filename') ||
        res.headers.get('Content-Disposition')?.match(/filename="?([^"]+)"?/)?.[1] ||
        `EMBASSY_Menu_${pdfMode}.pdf`;

      if (pdfMode_ === 'puppeteer') {
        // ✅ Real PDF binary — download directly, opens in any PDF reader
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      } else {
        // HTML fallback — open in new tab, auto-print dialog fires
        const html = await res.text();
        const printableHtml = html.replace(
          '</head>',
          `<script>
            window.addEventListener('load', function() {
              setTimeout(function() { window.print(); }, 800);
            });
          </script>
          </head>`
        );
        const blob = new Blob([printableHtml], { type: 'text/html; charset=utf-8' });
        const blobUrl = URL.createObjectURL(blob);
        const printWindow = window.open(blobUrl, '_blank');
        if (printWindow) {
          printWindow.addEventListener('load', () => {
            setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
          });
        } else {
          // Popup blocked — download HTML file with instructions
          const a = document.createElement('a');
          a.href = blobUrl;
          a.download = filename.replace(/\.pdf$/, '.html');
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
          alert('Popup blocked. Open the downloaded HTML in Chrome and press Ctrl+P → Save as PDF.');
        }
      }
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Could not generate PDF. Please try again.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  const allDishIdsInMenu = new Set(
    menu?.counters.flatMap(c => c.sections.flatMap(s => s.dishes.map(d => d.dish_id))) ?? []
  );

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full">
          <div className="text-[var(--text-grey)] text-sm">Loading menu…</div>
        </div>
      </AppShell>
    );
  }

  if (!menu) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full bg-gradient-to-br from-[#0c0507] via-[#0A0405] to-[#120608]">
          <div className="text-center card p-10 max-w-sm border-white/5 flex flex-col items-center">
            <div className="text-5xl mb-4 text-[var(--gold)]">≡</div>
            <p className="text-white text-sm font-semibold mb-4">Menu not found</p>
            <button onClick={() => router.push('/menus')} className="btn-primary text-xs">
              ← Back to Menus
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col h-full overflow-hidden">
        {/* Toolbar */}
        <div className="px-6 py-4.5 border-b border-white/5 flex items-center gap-4 flex-shrink-0 bg-[#110608] relative z-10">
          <button onClick={() => router.push('/menus')} className="text-white/40 hover:text-white text-sm transition-colors duration-200 flex items-center gap-1">
            <span>←</span>
            <span>Menus</span>
          </button>
          <div className="h-4 w-[1px] bg-white/10" />
          <div className="flex-1 flex items-center">
            <input
              className="bg-transparent border-none outline-none text-white font-display text-xl italic font-semibold placeholder:text-white/20 w-72 focus:placeholder:opacity-0 transition-opacity"
              placeholder="Client name…"
              value={menu.client_name}
              onChange={e => updateMenu({ client_name: e.target.value })}
            />
            {isDirty && (
              <span className="inline-flex items-center gap-1.5 text-[9px] text-red-400 bg-red-400/5 px-2 py-0.5 rounded border border-red-500/20 font-mono font-semibold ml-3 animate-pulse">
                ● Unsaved
              </span>
            )}
            {lastSaved && !isDirty && (
              <span className="inline-flex items-center gap-1.5 text-[9px] text-green-400 bg-green-400/5 px-2 py-0.5 rounded border border-green-500/20 font-mono font-semibold ml-3">
                ✓ Saved {lastSaved}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <select className="input-field py-1.5 text-xs w-36"
              value={menu.status}
              onChange={e => updateMenu({ status: e.target.value as MenuStatus })}>
              {STATUS_FLOW.map(s => <option key={s}>{s}</option>)}
            </select>
            <div className="flex items-center gap-1.5">
              <select className="input-field py-1.5 text-xs w-28"
                value={pdfMode}
                onChange={e => setPdfMode(e.target.value as 'classic' | 'modern')}>
                <option value="classic">Classic PDF</option>
                <option value="modern">Modern PDF</option>
              </select>
              <button onClick={generatePdf} disabled={generatingPdf}
                className="btn-secondary text-xs py-1.5 px-3.5 whitespace-nowrap disabled:opacity-50 flex items-center gap-1">
                <span>{generatingPdf ? '⏳' : '⬇'}</span>
                <span>Export PDF</span>
              </button>
            </div>
            <button onClick={() => saveMenu(menu)} disabled={saving}
              className="btn-primary text-xs py-1.5 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Left panel — Header form */}
          <aside className="w-72 flex-shrink-0 border-r border-white/5 overflow-y-auto p-5 bg-gradient-to-b from-[#110608] to-[#16080a]">
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--gold)]/80 mb-5">Event Details</h3>
            <div className="space-y-4">
              {(
                [
                  { label: 'Event Date', key: 'event_date', type: 'date' },
                  { label: 'Guest Count', key: 'guest_count', placeholder: '700 Pax' },
                  { label: 'Venue', key: 'venue', placeholder: 'Sanskriti Greens' },
                ] as { label: string; key: keyof Menu; type?: string; placeholder?: string }[]
              ).map(field => (
                <div key={field.key} className="space-y-1.5">
                  <label className="text-[10px] text-white/50 uppercase tracking-wider block font-medium">{field.label}</label>
                  <input className="input-field py-2 text-xs"
                    type={field.type || 'text'}
                    placeholder={field.placeholder}
                    value={(menu[field.key] as string) || ''}
                    onChange={e => updateMenu({ [field.key]: e.target.value })}
                  />
                </div>
              ))}
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/50 uppercase tracking-wider block font-medium">Function Type</label>
                <select className="input-field py-2 text-xs"
                  value={menu.function_type}
                  onChange={e => updateMenu({ function_type: e.target.value })}>
                  {['Cocktail Dinner', 'Dinner', 'Lunch', 'Brunch', 'Corporate Gala', 'Private Party', 'Other'].map(ft => (
                    <option key={ft}>{ft}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/50 uppercase tracking-wider block font-medium">Requirements</label>
                <textarea className="input-field text-xs resize-none py-2" rows={2}
                  value={menu.requirements_note}
                  onChange={e => updateMenu({ requirements_note: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] text-white/50 uppercase tracking-wider block font-medium">Exclusions</label>
                <textarea className="input-field text-xs resize-none py-2" rows={2}
                  value={menu.exclusions_note}
                  onChange={e => updateMenu({ exclusions_note: e.target.value })} />
              </div>

              <div className="gold-rule" />
              <h3 className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--gold)]/80 pt-1 mb-3">Sign-Off</h3>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-white/50 uppercase tracking-wider block font-medium">Name</label>
                  <input className="input-field py-2 text-xs" value={menu.signed_by_name}
                    onChange={e => updateMenu({ signed_by_name: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] text-white/50 uppercase tracking-wider block font-medium">Phone</label>
                  <input className="input-field py-2 text-xs" value={menu.signed_by_phone}
                    onChange={e => updateMenu({ signed_by_phone: e.target.value })} />
                </div>
              </div>
            </div>
          </aside>

          {/* Right panel — Counter canvas */}
          <main className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-[#0c0507] via-[#0A0405] to-[#120608]">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-[var(--gold-light)] font-display text-xl font-semibold italic">Menu Canvas</h2>
                <p className="text-[var(--text-grey)] text-xs mt-0.5">{menu.counters.length} counters total · drag to reorder</p>
              </div>
              <button onClick={() => setShowCounterPicker(true)}
                className="btn-secondary text-xs py-1.5 flex items-center gap-1">
                <span>+</span>
                <span>Add Counter</span>
              </button>
            </div>

            {menu.counters.length === 0 ? (
              <div className="card p-20 text-center border-dashed border-white/5 relative z-10 flex flex-col items-center">
                <div className="text-5xl mb-4 opacity-25 text-[var(--gold)]">≡</div>
                <p className="text-[var(--text-grey)] text-sm mb-4">This menu has no counters yet.</p>
                <button onClick={() => setShowCounterPicker(true)} className="btn-secondary text-xs flex items-center gap-1">
                  <span>+</span>
                  <span>Add Counter</span>
                </button>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={menu.counters.map(c => c.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-1.5">
                    {menu.counters.map(counter => (
                      <SortableCounter
                        key={counter.id}
                        counter={counter}
                        onUpdate={updateCounter}
                        onRemove={removeCounter}
                        onAddDish={id => setActivePickerCounterId(id)}
                        onRemoveDish={removeDishFromCounter}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </main>
        </div>
      </div>

      {/* Counter type picker modal */}
      {showCounterPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#120608]/95 backdrop-blur-[32px] border border-white/10 rounded-2xl p-6 w-full max-w-lg mx-4 shadow-[0_0_50px_rgba(0,0,0,0.7)] max-h-[75vh] flex flex-col animate-slide-up">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-white/5">
              <h3 className="font-display text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-white to-[var(--gold-light)]">Add Counter</h3>
              <button onClick={() => setShowCounterPicker(false)} className="text-white/40 hover:text-white text-2xl transition-colors">&times;</button>
            </div>
            <div className="overflow-y-auto space-y-2.5 pr-1">
              {counterTypes.filter(ct => ct.is_active).map(ct => (
                <button key={ct.id} onClick={() => addCounter(ct)}
                  className="w-full text-left px-4 py-3.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] hover:border-[var(--gold)]/30 border border-white/5 transition-all duration-200 flex flex-col justify-start">
                  <div className="text-white text-sm font-semibold tracking-wide">{ct.display_name}</div>
                  <div className="text-[var(--text-grey)] text-xs mt-1.5 leading-relaxed line-clamp-1 italic">{ct.default_description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Dish picker panel */}
      {activePickerCounterId && menu && (
        <DishPickerPanel
          counterId={activePickerCounterId}
          counterTypeId={menu.counters.find(c => c.id === activePickerCounterId)?.counter_type_id ?? ''}
          allDishIds={allDishIdsInMenu}
          onClose={() => setActivePickerCounterId(null)}
          onAdd={(cid, sk, dish) => { addDishToCounter(cid, sk, dish); }}
        />
      )}
    </AppShell>
  );
}
