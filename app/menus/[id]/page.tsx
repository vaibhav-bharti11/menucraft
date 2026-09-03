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
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import AppShell from '@/components/AppShell';
import type { Menu, MenuCounter, CounterType, Dish, DishRef, MenuStatus } from '@/lib/types';
import DishAIModal from '@/components/ai/DishAIModal';
import CounterAIModal from '@/components/ai/CounterAIModal';
import GlobalAIAssistantModal from '@/components/ai/GlobalAIAssistantModal';

const STATUS_FLOW: MenuStatus[] = ['DRAFT', 'READY', 'SENT', 'CONFIRMED', 'ARCHIVED'];

// ─── Sortable Counter Block ────────────────────────────────────────────────────

function SortableCounter({
  counter,
  index,
  onUpdate,
  onRemove,
  onAddDish,
  onRemoveDish,
  onOpenDishAI,
  onOpenCounterAI,
}: {
  counter: MenuCounter;
  index: number;
  onUpdate: (id: string, updates: Partial<MenuCounter>) => void;
  onRemove: (id: string) => void;
  onAddDish: (counterId: string) => void;
  onRemoveDish: (counterId: string, sectionKind: string, dishId: string) => void;
  onOpenDishAI: (dish: DishRef, counterId: string) => void;
  onOpenCounterAI: (counter: MenuCounter) => void;
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

  const vegSection = counter.sections.find(s => s.kind === 'VEG') || { kind: 'VEG', label: 'Vegetarian', dishes: [] };
  const nonVegSection = counter.sections.find(s => s.kind === 'NON_VEG') || { kind: 'NON_VEG', label: 'Non Vegetarian', dishes: [] };
  const vegCount = vegSection.dishes.length;
  const nonVegCount = nonVegSection.dishes.length;

  return (
    <div ref={setNodeRef} style={style}
      className={`counter-block mb-4 transition-all duration-300 ${isDragging ? 'ring-2 ring-[#C9A84C]/50 shadow-[0_12px_40px_rgba(201,168,76,0.15)] scale-[1.01] z-50' : 'border-gray-200 shadow-sm'}`}>
      <div className="flex overflow-hidden bg-white">
        {/* Left Number Box */}
        <div className="w-12 bg-gray-50 border-r border-gray-200 flex items-center justify-center font-mono font-bold text-gray-500 text-sm flex-shrink-0">
          {index + 1}
        </div>

        {/* Right Content Column */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 bg-white group">
            <button {...attributes} {...listeners}
              className="text-gray-300 cursor-grab active:cursor-grabbing hover:text-[#C9A84C] transition-colors text-sm flex-shrink-0 p-1">
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
              <div className="flex items-center gap-2 cursor-pointer"
                onClick={() => setEditingName(true)}>
                <span className="text-[#8B1A1A] text-sm font-bold tracking-wide">{counter.display_name}</span>
                {counter.display_name.toUpperCase().includes('LIVE') && (
                  <span className="bg-[#E6F4EA] text-[#137333] font-semibold rounded px-2 py-0.5 text-[9px] tracking-wide uppercase font-mono leading-none">
                    LIVE
                  </span>
                )}
                <span className="text-gray-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity ml-1">✏</span>
              </div>
            )}

            {/* Chevron and Actions */}
            <div className="flex items-center gap-3 ml-auto">
              {collapsed && (
                <div className="flex items-center gap-1.5">
                  {vegCount > 0 && (
                    <span className="bg-[#E6F4EA] text-[#137333] font-semibold rounded px-2 py-0.5 text-[10px] whitespace-nowrap">
                      {vegCount} Veg
                    </span>
                  )}
                  {nonVegCount > 0 && (
                    <span className="bg-[#FCE8E6] text-[#C5221F] font-semibold rounded px-2 py-0.5 text-[10px] whitespace-nowrap">
                      {nonVegCount} Non-Veg
                    </span>
                  )}
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onOpenCounterAI(counter)}
                  title="AI Counter Tools"
                  className="text-[11px] bg-[#FAF0E6] hover:bg-[#F3E5D8] text-[#8B1A1A] border border-[#C9A84C]/35 font-bold px-2 py-0.5 rounded flex items-center gap-1 transition-colors shadow-2xs"
                >
                  <span>✨</span>
                  <span className="hidden sm:inline">AI Tools</span>
                </button>
                <button onClick={() => setEditingName(true)} className="text-gray-400 hover:text-gray-700 text-xs p-1">✏</button>
                <button onClick={() => onRemove(counter.id)} title="Delete" className="text-gray-400 hover:text-red-600 text-xs p-1">🗑</button>
                <button onClick={() => setCollapsed(c => !c)} className="text-gray-400 hover:text-gray-700 text-xs p-1">
                  {collapsed ? '⌄' : '⌃'}
                </button>
              </div>
            </div>
          </div>

          {!collapsed && (
            <>
              {/* Description */}
              <div className="px-5 py-2.5 border-b border-gray-100 bg-gray-50/50">
                {editingDesc ? (
                  <textarea
                    className="input-field text-xs resize-none py-1.5 px-2.5 bg-white"
                    rows={2}
                    value={localDesc}
                    autoFocus
                    onChange={e => setLocalDesc(e.target.value)}
                    onBlur={() => { setEditingDesc(false); onUpdate(counter.id, { description: localDesc }); }}
                  />
                ) : (
                  <p className="text-gray-500 text-xs italic cursor-pointer hover:text-gray-700 transition-colors leading-relaxed"
                    onClick={() => setEditingDesc(true)}>
                    {counter.description || <span className="opacity-30">Click to add description…</span>}
                  </p>
                )}
              </div>

              {/* Side-by-Side Dishes Sections */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 bg-white">
                {/* Non Veg Column */}
                <div className="border border-red-100 rounded-xl p-4 bg-[#FAF2F2]/10 flex flex-col justify-between min-h-[220px]">
                  <div>
                    <div className="flex items-center justify-between border-b border-red-100 pb-2 mb-3">
                      <span className="text-[#8B1A1A] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#8B1A1A]" />
                        NON-VEG
                      </span>
                      <button onClick={() => onAddDish(counter.id)} className="text-[#8B1A1A] hover:text-[#701212] text-xs font-semibold flex items-center gap-1 focus:outline-none">
                        <span>+ Add Dish</span>
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {nonVegSection.dishes.map(dish => (
                        <div key={dish.dish_id}
                          className="flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-gray-100 shadow-sm hover:border-gray-250 group transition-all duration-150">
                          <div className="flex-1 min-w-0 pr-2">
                            <div className="text-gray-800 text-xs font-semibold truncate">{dish.name}</div>
                            {dish.description && (
                              <div className="text-gray-400 text-[10px] truncate mt-0.5 italic">{dish.description}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => onOpenDishAI(dish, counter.id)}
                              title="Generate or improve description with AI"
                              className="opacity-0 group-hover:opacity-100 text-[10px] bg-[#FAF0E6] hover:bg-[#F3E5D8] text-[#8B1A1A] border border-[#C9A84C]/30 font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 transition-all duration-150"
                            >
                              <span>✨</span>
                              <span>AI</span>
                            </button>
                            <button onClick={() => onRemoveDish(counter.id, 'NON_VEG', dish.dish_id)}
                              className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all duration-200 ml-1 text-xs flex-shrink-0 p-1">
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                      {nonVegSection.dishes.length === 0 && (
                        <p className="text-gray-300 text-[10px] italic py-6 text-center">No dishes added</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-red-100/50">
                    <div className="text-[9px] uppercase tracking-wider text-[#8B1A1A] font-bold mb-1">Accompaniments</div>
                    <input 
                      className="bg-transparent border-none outline-none text-gray-600 text-xs leading-relaxed focus:bg-white focus:ring-1 focus:ring-[#8B1A1A]/20 px-1 py-0.5 rounded w-full"
                      value={counter.accompaniments || ''}
                      placeholder="Laccha Onion, Mint Chutney, Burani Raita, Lemon Wedges..."
                      onChange={e => onUpdate(counter.id, { accompaniments: e.target.value })}
                    />
                  </div>
                </div>

                {/* Veg Column */}
                <div className="border border-green-100 rounded-xl p-4 bg-[#F2FAF4]/10 flex flex-col justify-between min-h-[220px]">
                  <div>
                    <div className="flex items-center justify-between border-b border-green-100 pb-2 mb-3">
                      <span className="text-[#16803D] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#16803D]" />
                        VEG
                      </span>
                      <button onClick={() => onAddDish(counter.id)} className="text-[#16803D] hover:text-[#137333] text-xs font-semibold flex items-center gap-1 focus:outline-none">
                        <span>+ Add Dish</span>
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      {vegSection.dishes.map(dish => (
                        <div key={dish.dish_id}
                          className="flex items-center justify-between px-3 py-2 rounded-lg bg-white border border-gray-100 shadow-sm hover:border-gray-250 group transition-all duration-150">
                          <div className="flex-1 min-w-0 pr-2">
                            <div className="text-gray-800 text-xs font-semibold truncate">{dish.name}</div>
                            {dish.description && (
                              <div className="text-gray-400 text-[10px] truncate mt-0.5 italic">{dish.description}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <button
                              type="button"
                              onClick={() => onOpenDishAI(dish, counter.id)}
                              title="Generate or improve description with AI"
                              className="opacity-0 group-hover:opacity-100 text-[10px] bg-[#FAF0E6] hover:bg-[#F3E5D8] text-[#8B1A1A] border border-[#C9A84C]/30 font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5 transition-all duration-150"
                            >
                              <span>✨</span>
                              <span>AI</span>
                            </button>
                            <button onClick={() => onRemoveDish(counter.id, 'VEG', dish.dish_id)}
                              className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all duration-200 ml-1 text-xs flex-shrink-0 p-1">
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                      {vegSection.dishes.length === 0 && (
                        <p className="text-gray-300 text-[10px] italic py-6 text-center">No dishes added</p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-green-100/50">
                    <div className="text-[9px] uppercase tracking-wider text-[#16803D] font-bold mb-1">Accompaniments</div>
                    <input 
                      className="bg-transparent border-none outline-none text-gray-600 text-xs leading-relaxed focus:bg-white focus:ring-1 focus:ring-[#8B1A1A]/20 px-1 py-0.5 rounded w-full"
                      value={counter.accompaniments || ''}
                      placeholder="Laccha Onion, Mint Chutney, Burani Raita, Lemon Wedges..."
                      onChange={e => onUpdate(counter.id, { accompaniments: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Dish Picker Panel ────────────────────────────────────────────────────────

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
  const [dietary, setDietary] = useState<'VEG' | 'NON_VEG' | ''>('');
  const [cuisine, setCuisine] = useState('');
  const [course, setCourse] = useState('');
  const [signatureOnly, setSignatureOnly] = useState(false);

  useEffect(() => {
    fetch('/api/dishes').then(r => r.json()).then((data: Dish[]) => {
      setDishes(data.filter(d => d.is_active));
      setLoading(false);
    });
  }, []);

  const filtered = dishes.filter(d => {
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase());
    const matchCounter = d.counter_type_ids.length === 0 || d.counter_type_ids.includes(counterTypeId);
    const matchDietary = !dietary || d.dietary === dietary;
    const matchCuisine = !cuisine || d.cuisine_tags.includes(cuisine);
    const matchCourse = !course || d.course_tags.includes(course);
    const matchSignature = !signatureOnly || d.is_signature;
    return matchSearch && matchCounter && matchDietary && matchCuisine && matchCourse && matchSignature;
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
    <aside className="w-full md:w-80 border-l border-gray-200 bg-white flex flex-col h-full flex-shrink-0 animate-slide-in relative z-20">
      {/* Title */}
      <div className="px-5 py-4.5 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-gray-900 text-sm font-bold">Dish Browser</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl focus:outline-none">&times;</button>
      </div>

      {/* Filters Form */}
      <div className="p-4 border-b border-gray-100 space-y-3">
        {/* Search */}
        <div className="relative">
          <input className="input-field pl-9 py-2 text-xs" placeholder="Search dishes…"
            value={search} onChange={e => setSearch(e.target.value)} autoFocus />
          <span className="absolute left-3 top-2.5 text-gray-400 text-xs">🔍</span>
        </div>

        {/* Dietary / Cuisine */}
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div>
            <label className="text-gray-400 font-bold uppercase mb-1 block">Dietary</label>
            <select className="input-field py-1 text-xs" value={dietary} onChange={e => setDietary(e.target.value as '' | 'VEG' | 'NON_VEG')}>
              <option value="">All</option>
              <option value="VEG">Veg</option>
              <option value="NON_VEG">Non-Veg</option>
            </select>
          </div>
          <div>
            <label className="text-gray-400 font-bold uppercase mb-1 block">Cuisine</label>
            <select className="input-field py-1 text-xs" value={cuisine} onChange={e => setCuisine(e.target.value)}>
              <option value="">All</option>
              {['Indian', 'Asian', 'Continental', 'Mediterranean', 'Chinese', 'Japanese'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Course / Counter Type */}
        <div className="grid grid-cols-2 gap-2 text-[10px]">
          <div>
            <label className="text-gray-400 font-bold uppercase mb-1 block">Course</label>
            <select className="input-field py-1 text-xs" value={course} onChange={e => setCourse(e.target.value)}>
              <option value="">All</option>
              {['Starter', 'Soup', 'Main', 'Dessert', 'Bread', 'Beverage'].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-gray-400 font-bold uppercase mb-1 block">Counter Type</label>
            <select className="input-field py-1 text-xs disabled opacity-60" disabled value={counterTypeId}>
              <option value={counterTypeId}>Auto Filtered</option>
            </select>
          </div>
        </div>

        {/* Toggles */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-600">
            <input type="checkbox" checked={signatureOnly} onChange={e => setSignatureOnly(e.target.checked)} className="accent-[#8B1A1A]" />
            <span>★ Signature Only</span>
          </label>
          <span className="text-[10px] text-gray-400 font-mono font-medium">{filtered.length} found</span>
        </div>
      </div>

      {/* Dishes Scrollable List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5 bg-gray-50/50">
        {loading ? (
          <p className="text-gray-400 text-xs italic text-center py-6">Loading repository…</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-400 text-xs italic text-center py-6">No dishes match categories.</p>
        ) : filtered.map(dish => {
          const added = allDishIds.has(dish.id);
          return (
            <div key={dish.id}
              className={`p-3 rounded-lg border bg-white transition-all duration-150 flex items-start justify-between ${added ? 'border-gray-100 opacity-40' : 'border-gray-150 hover:border-gray-300 hover:shadow-sm cursor-pointer'}`}
              onClick={added ? undefined : () => handleAdd(dish)}>
              <div className="min-w-0 flex-1 pr-2">
                <div className="text-gray-800 text-xs font-bold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{ background: dish.dietary === 'NON_VEG' ? '#8B1A1A' : '#16803D' }} />
                  <span className="truncate">{dish.name}</span>
                  {dish.is_signature && <span className="text-[9px] text-[#b59238]">★</span>}
                </div>
                {dish.description && (
                  <div className="text-gray-400 text-[10px] mt-1 line-clamp-2 italic leading-relaxed">{dish.description}</div>
                )}
              </div>
              <button 
                disabled={added}
                className={`text-xs font-bold px-2 py-0.5 rounded border flex-shrink-0 transition-colors ${added ? 'text-gray-400 border-gray-100 bg-gray-50' : 'text-[#16803D] border-green-150 hover:bg-green-50'}`}>
                {added ? 'Added' : '+ Add'}
              </button>
            </div>
          );
        })}
      </div>

      {/* Create New Dish button */}
      <div className="p-4 border-t border-gray-100 bg-white flex flex-col z-10 shadow-md">
        <button className="btn-secondary text-[#8B1A1A] border-[#8B1A1A]/35 hover:bg-[#8B1A1A]/5 text-xs py-2 w-full font-bold">
          + Create New Dish
        </button>
      </div>
    </aside>
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

  // Mobile View States
  const [isMobile, setIsMobile] = useState(false);
  const [activeMobileCounterId, setActiveMobileCounterId] = useState<string | null>(null);
  const [showMobileClientEdit, setShowMobileClientEdit] = useState(false);
  const [showMobileCounterOptionsId, setShowMobileCounterOptionsId] = useState<string | null>(null);
  const [editingMobileCounterId, setEditingMobileCounterId] = useState<string | null>(null);
  const [editCounterName, setEditCounterName] = useState('');
  const [editCounterDesc, setEditCounterDesc] = useState('');
  const [editingAccompanimentsId, setEditingAccompanimentsId] = useState<string | null>(null);
  const [editAccompanimentsVal, setEditAccompanimentsVal] = useState('');
  const [mobileExpandedCounters, setMobileExpandedCounters] = useState<Record<string, boolean>>({});

  // AI States
  const [activeAIDish, setActiveAIDish] = useState<{ dish: DishRef; counterId: string } | null>(null);
  const [activeAICounter, setActiveAICounter] = useState<MenuCounter | null>(null);
  const [showGlobalAIModal, setShowGlobalAIModal] = useState(false);

  const handleApplyDishDescription = (dishId: string, newDescription: string) => {
    if (!menu) return;
    const updated = {
      ...menu,
      counters: menu.counters.map(c => ({
        ...c,
        sections: c.sections.map(s => ({
          ...s,
          dishes: s.dishes.map(d => d.dish_id === dishId ? { ...d, description: newDescription } : d),
        })),
      })),
    };
    setMenu(updated);
    setIsDirty(true);
  };

  const handleBatchUpdateDescriptions = (counterId: string, updates: { dish_id: string; description: string }[]) => {
    if (!menu) return;
    const updateMap = new Map(updates.map(u => [u.dish_id, u.description]));
    const updated = {
      ...menu,
      counters: menu.counters.map(c => {
        if (c.id !== counterId) return c;
        return {
          ...c,
          sections: c.sections.map(s => ({
            ...s,
            dishes: s.dishes.map(d => updateMap.has(d.dish_id) ? { ...d, description: updateMap.get(d.dish_id)! } : d),
          })),
        };
      }),
    };
    setMenu(updated);
    setIsDirty(true);
  };

  const handleGlobalBatchUpdateDescriptions = (updates: { dish_id: string; description: string }[]) => {
    if (!menu) return;
    const updateMap = new Map(updates.map(u => [u.dish_id, u.description]));
    const updated = {
      ...menu,
      counters: menu.counters.map(c => ({
        ...c,
        sections: c.sections.map(s => ({
          ...s,
          dishes: s.dishes.map(d => updateMap.has(d.dish_id) ? { ...d, description: updateMap.get(d.dish_id)! } : d),
        })),
      })),
    };
    setMenu(updated);
    setIsDirty(true);
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const duplicateCounter = (counterId: string) => {
    if (!menu) return;
    const counterIndex = menu.counters.findIndex(c => c.id === counterId);
    if (counterIndex === -1) return;
    const original = menu.counters[counterIndex];
    const duplicated: MenuCounter = {
      ...original,
      id: `counter-${Date.now()}`,
      display_name: `${original.display_name} (Copy)`,
      display_name_print: `${original.display_name_print} (COPY)`,
      sections: original.sections.map(s => ({
        ...s,
        dishes: s.dishes.map(d => ({ ...d })),
      })),
    };
    const updatedCounters = [...menu.counters];
    updatedCounters.splice(counterIndex + 1, 0, duplicated);
    const updated = { ...menu, counters: updatedCounters };
    setMenu(updated);
    setIsDirty(true);
  };

  const moveCounterUp = (counterId: string) => {
    if (!menu) return;
    const counterIndex = menu.counters.findIndex(c => c.id === counterId);
    if (counterIndex <= 0) return;
    const updatedCounters = [...menu.counters];
    const [item] = updatedCounters.splice(counterIndex, 1);
    updatedCounters.splice(counterIndex - 1, 0, item);
    const updated = { ...menu, counters: updatedCounters };
    setMenu(updated);
    setIsDirty(true);
  };

  const moveCounterDown = (counterId: string) => {
    if (!menu) return;
    const counterIndex = menu.counters.findIndex(c => c.id === counterId);
    if (counterIndex === -1 || counterIndex >= menu.counters.length - 1) return;
    const updatedCounters = [...menu.counters];
    const [item] = updatedCounters.splice(counterIndex, 1);
    updatedCounters.splice(counterIndex + 1, 0, item);
    const updated = { ...menu, counters: updatedCounters };
    setMenu(updated);
    setIsDirty(true);
  };

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

  const saveMenu = useCallback(async (m: Menu) => {
    setSaving(true);
    await fetch('/api/menus', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(m),
    });
    setSaving(false);
    setLastSaved(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    setIsDirty(false);
  }, []);

  useEffect(() => {
    if (!menu) return;
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    if (isDirty) {
      autoSaveRef.current = setTimeout(() => {
        saveMenu(menu);
      }, 5000);
    }
    return () => {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    };
  }, [menu, isDirty, saveMenu]);

  const updateMenu = (updates: Partial<Menu>) => {
    if (!menu) return;
    setMenu(m => {
      if (!m) return null;
      const updated = { ...m, ...updates };
      setIsDirty(true);
      return updated;
    });
  };

  const addCounter = (ct: CounterType) => {
    if (!menu) return;
    const newCounter: MenuCounter = {
      id: `counter-${Date.now()}`,
      counter_type_id: ct.id,
      display_name: ct.display_name,
      display_name_print: ct.display_name.toUpperCase(),
      description: ct.default_description,
      accompaniments_label: 'Accompaniments',
      accompaniments: 'Laccha Onion, Mint Chutney, Burani Raita, Lemon Wedges',
      sections: [
        { label: 'Vegetarian', kind: 'VEG', dishes: [] },
        { label: 'Non Vegetarian', kind: 'NON_VEG', dishes: [] },
      ],
    };
    const updated = { ...menu, counters: [...menu.counters, newCounter] };
    setMenu(updated);
    setIsDirty(true);
    setShowCounterPicker(false);
  };

  const updateCounter = (counterId: string, updates: Partial<MenuCounter>) => {
    if (!menu) return;
    const updated = {
      ...menu,
      counters: menu.counters.map(c => (c.id === counterId ? { ...c, ...updates } : c)),
    };
    setMenu(updated);
    setIsDirty(true);
  };

  const removeCounter = (counterId: string) => {
    if (!confirm('Remove this counter from the menu?')) return;
    if (!menu) return;
    const updated = {
      ...menu,
      counters: menu.counters.filter(c => c.id !== counterId),
    };
    setMenu(updated);
    setIsDirty(true);
  };

  const addDishToCounter = (counterId: string, sectionKind: string, dish: DishRef) => {
    if (!menu) return;
    const updated = {
      ...menu,
      counters: menu.counters.map(c => {
        if (c.id !== counterId) return c;
        return {
          ...c,
          sections: c.sections.map(s => {
            if (s.kind !== sectionKind) return s;
            if (s.dishes.some(d => d.dish_id === dish.dish_id)) return s;
            return { ...s, dishes: [...s.dishes, dish] };
          }),
        };
      }),
    };
    setMenu(updated);
    setIsDirty(true);
  };

  const removeDishFromCounter = (counterId: string, sectionKind: string, dishId: string) => {
    if (!menu) return;
    const updated = {
      ...menu,
      counters: menu.counters.map(c => {
        if (c.id !== counterId) return c;
        return {
          ...c,
          sections: c.sections.map(s => {
            if (s.kind !== sectionKind) return s;
            return { ...s, dishes: s.dishes.filter(d => d.dish_id !== dishId) };
          }),
        };
      }),
    };
    setMenu(updated);
    setIsDirty(true);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !menu) return;

    const oldIndex = menu.counters.findIndex(c => c.id === active.id);
    const newIndex = menu.counters.findIndex(c => c.id === over.id);

    const reordered = [...menu.counters];
    const [removed] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, removed);

    setMenu({ ...menu, counters: reordered });
    setIsDirty(true);
  };

  const generatePdf = async (action: 'download' | 'preview' = 'download') => {
    if (!menu) return;
    
    // Open a blank tab IMMEDIATELY to bypass popup blockers
    let previewWin: Window | null = null;
    if (action === 'preview') {
      previewWin = window.open('', '_blank');
      if (previewWin) {
        previewWin.document.write('<html><body style="display:flex;justify-content:center;align-items:center;height:100vh;font-family:sans-serif;color:#555;"><h2>Generating PDF Preview...</h2></body></html>');
      } else {
        alert('Popup blocked! Please allow popups to preview the proposal.');
        return; // Abort if blocked immediately
      }
    }

    setGeneratingPdf(true);
    try {
      const res = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ menu, mode: pdfMode, preview: action === 'preview' }),
      });
      if (!res.ok) throw new Error('PDF Generation failed');

      const contentType = res.headers.get('Content-Type') || '';
      if (contentType.includes('text/html')) {
        const htmlText = await res.text();
        const printWindow = previewWin || window.open('', '_blank');
        if (printWindow) {
          printWindow.document.body.innerHTML = '';
          printWindow.document.write(htmlText);
          printWindow.document.close();
          printWindow.onload = () => {
            printWindow.print();
          };
          setTimeout(() => {
            try { printWindow.print(); } catch {}
          }, 500);
        } else {
          alert('Popup blocked! Please allow popups to view the proposal.');
        }
      } else {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);

        if (action === 'preview') {
          if (previewWin) {
            previewWin.location.href = url;
          }
        } else {
          const clientSlug = (menu.client_name || 'Client').replace(/[^\w-]/g, '_');
          const a = document.createElement('a');
          a.href = url;
          a.download = `The_Embassy_Catering_${clientSlug}_Proposal.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
        setTimeout(() => window.URL.revokeObjectURL(url), 60000);
      }
    } catch (err) {
      console.error(err);
      if (previewWin) previewWin.close();
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full bg-[#F9F9F9]">
          <div className="text-gray-400 text-sm">Loading menu…</div>
        </div>
      </AppShell>
    );
  }

  if (!menu) {
    return (
      <AppShell>
        <div className="flex items-center justify-center h-full bg-[#F9F9F9]">
          <div className="text-center card p-10 max-w-sm border-gray-200 flex flex-col items-center">
            <div className="text-5xl mb-4 text-[#8B1A1A]">≡</div>
            <p className="text-gray-800 text-sm font-semibold mb-4">Menu not found</p>
            <button onClick={() => router.push('/menus')} className="btn-primary text-xs">
              ← Back to Menus
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  const allDishIdsInMenu = new Set(
    menu.counters.flatMap(c => c.sections.flatMap(s => s.dishes.map(d => d.dish_id)))
  );

  const renderMobileBottomSheets = () => {
    if (!menu) return null;

    const optionsCounter = menu.counters.find(c => c.id === showMobileCounterOptionsId);
    const optionsCounterIdx = menu.counters.findIndex(c => c.id === showMobileCounterOptionsId);

    return (
      <>
        {/* Counter Options Bottom Sheet */}
        {optionsCounter && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => setShowMobileCounterOptionsId(null)}>
            <div 
              className="bg-white rounded-t-2xl w-full max-w-lg shadow-2xl p-4 pb-6 space-y-4 animate-slide-up flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-1 flex-shrink-0" />
              
              <div className="text-gray-500 text-xs font-bold text-center border-b border-gray-100 pb-3">
                {optionsCounter.display_name} Actions
              </div>

              <div className="space-y-1">
                <button 
                  onClick={() => {
                    setEditCounterName(optionsCounter.display_name);
                    setEditCounterDesc(optionsCounter.description);
                    setEditingMobileCounterId(optionsCounter.id);
                    setShowMobileCounterOptionsId(null);
                  }}
                  className="w-full flex items-center gap-3.5 px-4 py-3 text-gray-700 text-sm font-semibold hover:bg-gray-50 rounded-xl transition-colors text-left"
                >
                  <span className="text-gray-400">✏️</span>
                  <span>Edit Counter</span>
                </button>

                <button 
                  onClick={() => {
                    duplicateCounter(optionsCounter.id);
                    setShowMobileCounterOptionsId(null);
                  }}
                  className="w-full flex items-center gap-3.5 px-4 py-3 text-gray-700 text-sm font-semibold hover:bg-gray-50 rounded-xl transition-colors text-left"
                >
                  <span className="text-gray-450">⧉</span>
                  <span>Duplicate Counter</span>
                </button>

                <button 
                  onClick={() => {
                    if (confirm('Delete this counter from the menu?')) {
                      removeCounter(optionsCounter.id);
                      setActiveMobileCounterId(null);
                      setShowMobileCounterOptionsId(null);
                    }
                  }}
                  className="w-full flex items-center gap-3.5 px-4 py-3 text-[#C5221F] text-sm font-semibold hover:bg-red-50/50 rounded-xl transition-colors text-left"
                >
                  <span className="text-red-400">🗑️</span>
                  <span>Delete Counter</span>
                </button>

                <button 
                  onClick={() => {
                    moveCounterUp(optionsCounter.id);
                    setShowMobileCounterOptionsId(null);
                  }}
                  disabled={optionsCounterIdx === 0}
                  className="w-full flex items-center gap-3.5 px-4 py-3 text-gray-700 text-sm font-semibold hover:bg-gray-50 rounded-xl transition-colors text-left disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <span className="text-gray-400">↑</span>
                  <span>Move Up</span>
                </button>

                <button 
                  onClick={() => {
                    moveCounterDown(optionsCounter.id);
                    setShowMobileCounterOptionsId(null);
                  }}
                  disabled={optionsCounterIdx === menu.counters.length - 1}
                  className="w-full flex items-center gap-3.5 px-4 py-3 text-gray-700 text-sm font-semibold hover:bg-gray-50 rounded-xl transition-colors text-left disabled:opacity-40 disabled:hover:bg-transparent"
                >
                  <span className="text-gray-400">↓</span>
                  <span>Move Down</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Counter Display Name and Description Modal */}
        {editingMobileCounterId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white border border-gray-200 rounded-2xl p-5 w-full max-w-md mx-4 shadow-xl space-y-4 animate-slide-up">
              <div className="flex items-center justify-between border-b border-gray-150 pb-2">
                <h3 className="font-bold text-gray-900 text-sm">Edit Counter Details</h3>
                <button onClick={() => setEditingMobileCounterId(null)} className="text-gray-400 hover:text-gray-600 text-xl focus:outline-none">&times;</button>
              </div>
              
              <div className="space-y-3.5">
                <div>
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Counter Name</label>
                  <input 
                    className="input-field text-xs py-2 px-3 bg-gray-50 border-gray-200 focus:bg-white"
                    value={editCounterName}
                    onChange={e => setEditCounterName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Description</label>
                  <textarea 
                    rows={3}
                    className="input-field text-xs py-2 px-3 bg-gray-50 border-gray-200 focus:bg-white resize-none leading-relaxed"
                    value={editCounterDesc}
                    onChange={e => setEditCounterDesc(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex items-center gap-3.5 pt-2">
                <button 
                  onClick={() => {
                    updateCounter(editingMobileCounterId, { display_name: editCounterName, display_name_print: editCounterName.toUpperCase(), description: editCounterDesc });
                    setEditingMobileCounterId(null);
                  }}
                  className="btn-primary text-xs flex-1 font-bold py-2"
                >
                  Save Changes
                </button>
                <button 
                  onClick={() => setEditingMobileCounterId(null)}
                  className="btn-secondary text-xs flex-1 font-bold py-2"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Client & Event Details Edit Sheet */}
        {showMobileClientEdit && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => setShowMobileClientEdit(false)}>
            <div 
              className="bg-white rounded-t-2xl w-full max-w-lg shadow-2xl p-5 pb-6 space-y-4 animate-slide-up flex flex-col max-h-[90vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-1 flex-shrink-0" />
              
              <div className="flex items-center justify-between border-b border-gray-150 pb-2 flex-shrink-0">
                <h3 className="font-bold text-gray-900 text-sm">Edit Client Details</h3>
                <button onClick={() => setShowMobileClientEdit(false)} className="text-gray-400 hover:text-gray-655 text-xl focus:outline-none">&times;</button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                <div>
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Client Name / Proposal Title</label>
                  <input 
                    className="input-field text-xs py-2 bg-gray-50 focus:bg-white"
                    value={menu.client_name}
                    onChange={e => updateMenu({ client_name: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Date</label>
                    <input 
                      type="date"
                      className="input-field text-xs py-2 bg-gray-50 focus:bg-white"
                      value={menu.event_date ? menu.event_date.split('T')[0] : ''}
                      onChange={e => updateMenu({ event_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Function Type</label>
                    <select 
                      className="input-field text-xs py-2 bg-gray-50 focus:bg-white"
                      value={menu.function_type}
                      onChange={e => updateMenu({ function_type: e.target.value })}
                    >
                      {['Cocktail Dinner', 'Dinner', 'Lunch', 'Brunch', 'Corporate Gala', 'Private Party', 'Other'].map(ft => (
                        <option key={ft} value={ft}>{ft}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Guest Count (Pax)</label>
                    <input 
                      className="input-field text-xs py-2 bg-gray-50 focus:bg-white"
                      value={menu.guest_count}
                      onChange={e => updateMenu({ guest_count: e.target.value })}
                      placeholder="600 Pax"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Venue</label>
                    <input 
                      className="input-field text-xs py-2 bg-gray-50 focus:bg-white"
                      value={menu.venue}
                      onChange={e => updateMenu({ venue: e.target.value })}
                      placeholder="The Leela Palace, Delhi"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Requirements Note</label>
                  <textarea 
                    rows={2}
                    className="input-field text-xs py-2 bg-gray-50 focus:bg-white resize-none leading-relaxed"
                    value={menu.requirements_note}
                    onChange={e => updateMenu({ requirements_note: e.target.value })}
                    placeholder="Tenting, lighting details..."
                  />
                </div>

                <div>
                  <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Exclusions Note</label>
                  <textarea 
                    rows={2}
                    className="input-field text-xs py-2 bg-gray-50 focus:bg-white resize-none leading-relaxed"
                    value={menu.exclusions_note}
                    onChange={e => updateMenu({ exclusions_note: e.target.value })}
                    placeholder="Florist exclusions..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Signed By (Name)</label>
                    <input 
                      className="input-field text-xs py-2 bg-gray-50 focus:bg-white"
                      value={menu.signed_by_name}
                      onChange={e => updateMenu({ signed_by_name: e.target.value })}
                      placeholder="Chef Name"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">Signed By (Phone)</label>
                    <input 
                      className="input-field text-xs py-2 bg-gray-50 focus:bg-white"
                      value={menu.signed_by_phone}
                      onChange={e => updateMenu({ signed_by_phone: e.target.value })}
                      placeholder="Phone Number"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3.5 pt-4 border-t border-gray-100 flex-shrink-0">
                <button 
                  onClick={() => setShowMobileClientEdit(false)}
                  className="btn-primary text-xs flex-1 font-bold py-2.5"
                >
                  Save & Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Counter type picker modal for mobile */}
        {showCounterPicker && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in" onClick={() => setShowCounterPicker(false)}>
            <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-lg mx-4 shadow-xl max-h-[75vh] flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-150">
                <h3 className="font-display text-xl font-bold text-gray-900">Add Counter</h3>
                <button onClick={() => setShowCounterPicker(false)} className="text-gray-400 hover:text-gray-600 text-2xl transition-colors">&times;</button>
              </div>
              <div className="overflow-y-auto space-y-2.5 pr-1">
                {counterTypes.filter(ct => ct.is_active).map(ct => (
                  <button key={ct.id} onClick={() => { addCounter(ct); }}
                    className="w-full text-left px-4 py-3.5 rounded-[4px] bg-gray-50 hover:bg-gray-100 hover:border-gray-300 border border-gray-150 transition-all duration-200 flex flex-col justify-start">
                    <div className="text-gray-900 text-sm font-semibold tracking-wide">{ct.display_name}</div>
                    <div className="text-gray-500 text-xs mt-1.5 leading-relaxed line-clamp-1 italic">{ct.default_description}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  if (isMobile) {
    const activeMobileCounter = menu.counters.find(c => c.id === activeMobileCounterId);
    const activeMobileCounterIndex = menu.counters.findIndex(c => c.id === activeMobileCounterId);

    if (activeMobileCounter) {
      const vegSection = activeMobileCounter.sections.find(s => s.kind === 'VEG') || { kind: 'VEG', label: 'Vegetarian', dishes: [] };
      const nonVegSection = activeMobileCounter.sections.find(s => s.kind === 'NON_VEG') || { kind: 'NON_VEG', label: 'Non Vegetarian', dishes: [] };

      return (
        <AppShell>
          <div className="fixed inset-0 z-50 bg-[#F9F9F9] flex flex-col animate-fade-in pb-16">
            {/* Header */}
            <div className="h-14 border-b border-gray-150 bg-white px-4 flex items-center justify-between flex-shrink-0">
              <button 
                onClick={() => setActiveMobileCounterId(null)}
                className="text-gray-600 hover:text-gray-800 p-1 flex items-center gap-1 focus:outline-none"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-gray-900 text-sm font-bold tracking-wide">Counter Details</h2>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setActiveAICounter(activeMobileCounter)}
                  className="bg-[#FAF0E6] text-[#8B1A1A] border border-[#C9A84C]/35 font-bold text-xs px-2 py-1 rounded-lg flex items-center gap-1 shadow-2xs"
                >
                  <span>✨</span>
                  <span>AI Tools</span>
                </button>
                <button 
                  onClick={() => setShowMobileCounterOptionsId(activeMobileCounter.id)}
                  className="text-gray-600 hover:text-gray-850 p-1.5 focus:outline-none"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-20">
              {/* Counter Title Card */}
              <div className="bg-white rounded-xl border border-gray-150 p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-150 flex items-center justify-center font-mono font-bold text-gray-500 text-sm flex-shrink-0">
                    {activeMobileCounterIndex + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-gray-900 font-bold text-base tracking-wide truncate">{activeMobileCounter.display_name}</h3>
                      {activeMobileCounter.display_name.toUpperCase().includes('LIVE') && (
                        <span className="bg-[#E6F4EA] text-[#137333] font-bold rounded px-1.5 py-0.5 text-[8px] tracking-wide uppercase font-mono">
                          LIVE
                        </span>
                      )}
                      <button 
                        onClick={() => {
                          setEditCounterName(activeMobileCounter.display_name);
                          setEditCounterDesc(activeMobileCounter.description);
                          setEditingMobileCounterId(activeMobileCounter.id);
                        }} 
                        className="text-gray-400 hover:text-gray-650 p-0.5"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </button>
                    </div>
                    <p className="text-gray-500 text-xs italic mt-1 leading-relaxed">
                      {activeMobileCounter.description || "No description provided"}
                    </p>
                  </div>
                </div>
              </div>

              {/* NON-VEG SECTION */}
              <div className="bg-white rounded-xl border border-gray-150 p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-red-100 pb-2">
                  <span className="text-[#8B1A1A] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8B1A1A]" />
                    NON-VEG
                  </span>
                  <button 
                    onClick={() => setActivePickerCounterId(activeMobileCounter.id)}
                    className="text-[#8B1A1A] hover:text-[#701212] text-xs font-bold flex items-center gap-0.5"
                  >
                    <span>+ Add Dish</span>
                  </button>
                </div>
                <div className="space-y-2">
                  {nonVegSection.dishes.map((dish) => (
                    <div key={dish.dish_id} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                        <span className="text-gray-300 font-mono text-xs cursor-grab select-none">⠿</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-gray-800 text-xs font-semibold truncate">{dish.name}</div>
                          {dish.description && (
                            <div className="text-gray-400 text-[10px] truncate mt-0.5 italic">{dish.description}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => setActiveAIDish({ dish, counterId: activeMobileCounter.id })}
                          className="text-[10px] bg-[#FAF0E6] text-[#8B1A1A] border border-[#C9A84C]/30 font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5"
                        >
                          <span>✨</span>
                          <span>AI</span>
                        </button>
                        <button 
                          onClick={() => removeDishFromCounter(activeMobileCounter.id, 'NON_VEG', dish.dish_id)}
                          className="text-gray-400 hover:text-red-500 p-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                  {nonVegSection.dishes.length === 0 && (
                    <p className="text-gray-300 text-[11px] italic py-4 text-center">No dishes added</p>
                  )}
                </div>
              </div>

              {/* VEG SECTION */}
              <div className="bg-white rounded-xl border border-gray-150 p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between border-b border-green-100 pb-2">
                  <span className="text-[#16803D] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16803D]" />
                    VEG
                  </span>
                  <button 
                    onClick={() => setActivePickerCounterId(activeMobileCounter.id)}
                    className="text-[#16803D] hover:text-[#137333] text-xs font-bold flex items-center gap-0.5"
                  >
                    <span>+ Add Dish</span>
                  </button>
                </div>
                <div className="space-y-2">
                  {vegSection.dishes.map((dish) => (
                    <div key={dish.dish_id} className="flex items-center justify-between px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-100 shadow-sm">
                      <div className="flex items-center gap-2 flex-1 min-w-0 pr-2">
                        <span className="text-gray-300 font-mono text-xs cursor-grab select-none">⠿</span>
                        <div className="min-w-0 flex-1">
                          <div className="text-gray-800 text-xs font-semibold truncate">{dish.name}</div>
                          {dish.description && (
                            <div className="text-gray-400 text-[10px] truncate mt-0.5 italic">{dish.description}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => setActiveAIDish({ dish, counterId: activeMobileCounter.id })}
                          className="text-[10px] bg-[#FAF0E6] text-[#8B1A1A] border border-[#C9A84C]/30 font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5"
                        >
                          <span>✨</span>
                          <span>AI</span>
                        </button>
                        <button 
                          onClick={() => removeDishFromCounter(activeMobileCounter.id, 'VEG', dish.dish_id)}
                          className="text-gray-400 hover:text-red-500 p-1"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                  {vegSection.dishes.length === 0 && (
                    <p className="text-gray-300 text-[11px] italic py-4 text-center">No dishes added</p>
                  )}
                </div>
              </div>

              {/* ACCOMPANIMENTS */}
              <div className="bg-white rounded-xl border border-gray-150 p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[#8B1A1A] text-xs font-bold uppercase tracking-wider">ACCOMPANIMENTS</span>
                  <button 
                    onClick={() => {
                      setEditingAccompanimentsId(activeMobileCounter.id);
                      setEditAccompanimentsVal(activeMobileCounter.accompaniments || '');
                    }} 
                    className="text-gray-400 hover:text-gray-650 p-0.5"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>
                {editingAccompanimentsId === activeMobileCounter.id ? (
                  <div className="flex items-center gap-2 mt-2">
                    <input 
                      className="input-field text-xs py-1.5 px-2 bg-gray-50 border-gray-250 flex-1 focus:bg-white"
                      value={editAccompanimentsVal}
                      onChange={e => setEditAccompanimentsVal(e.target.value)}
                      placeholder="Pickled ginger, Wasabi, Soy..."
                      autoFocus
                    />
                    <button 
                      onClick={() => {
                        updateCounter(activeMobileCounter.id, { accompaniments: editAccompanimentsVal });
                        setEditingAccompanimentsId(null);
                      }} 
                      className="btn-primary text-xs py-1.5 px-3"
                    >
                      ✓
                    </button>
                    <button 
                      onClick={() => setEditingAccompanimentsId(null)} 
                      className="btn-secondary text-xs py-1.5 px-2.5"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <p className="text-gray-600 text-xs italic leading-relaxed pt-1">
                    {activeMobileCounter.accompaniments || "No accompaniments specified"}
                  </p>
                )}
              </div>
            </div>

            {/* Mobile Bottom Sheets */}
            {renderMobileBottomSheets()}

            {/* Dish Picker Panel */}
            {activePickerCounterId && (
              <div className="fixed inset-0 z-50 bg-white flex flex-col animate-slide-up">
                <DishPickerPanel
                  counterId={activePickerCounterId}
                  counterTypeId={menu.counters.find(c => c.id === activePickerCounterId)?.counter_type_id ?? ''}
                  allDishIds={allDishIdsInMenu}
                  onClose={() => setActivePickerCounterId(null)}
                  onAdd={(cid, sk, dish) => { addDishToCounter(cid, sk, dish); }}
                />
              </div>
            )}
          </div>
        </AppShell>
      );
    }

    return (
      <AppShell>
        <div className="p-4 bg-[#F9F9F9] min-h-screen pb-20 animate-fade-in">
          {/* Header */}
          <div className="mb-4">
            <h1 className="text-2xl font-bold font-display text-gray-900 leading-tight">Menu Builder</h1>
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span>Draft saved</span>
              <span className="text-gray-400">· Just now</span>
            </div>
          </div>

          {/* Event Details Card */}
          <div className="bg-white rounded-xl border border-gray-150 p-4 shadow-sm space-y-4 mb-5">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-display font-semibold text-gray-800 text-lg">{menu.client_name}</span>
                <span className="status-badge bg-yellow-100 text-yellow-850 border border-yellow-250 font-bold text-[9px] px-2 py-0.5 rounded-md">
                  {menu.status}
                </span>
              </div>
              <button onClick={() => setShowMobileClientEdit(true)} className="text-gray-400 hover:text-gray-655">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>

            {/* Dense 2-row layout */}
            <div className="grid grid-cols-2 gap-x-2 gap-y-3.5 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <span className="text-[#8B1A1A] text-sm">📅</span>
                <span className="font-semibold truncate">{menu.event_date ? new Date(menu.event_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No Date'}</span>
              </div>
              <div className="flex items-center gap-2 border-l border-gray-100 pl-3">
                <span className="text-[#8B1A1A] text-sm">🍷</span>
                <span className="font-semibold truncate">{menu.function_type || 'Wedding Dinner'}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[#8B1A1A] text-sm">👥</span>
                <span className="font-semibold truncate">{menu.guest_count || '600 Pax'}</span>
              </div>
              <div className="flex items-center gap-2 border-l border-gray-100 pl-3">
                <span className="text-[#8B1A1A] text-sm">📍</span>
                <span className="font-semibold truncate">{menu.venue || 'Venue Unset'}</span>
              </div>
            </div>

            {/* Classic/Modern Toggle for Mobile */}
            <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-1.5 mb-3.5">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Proposal Style</span>
              <div className="flex items-center bg-gray-50 p-0.5 rounded-lg border border-gray-150">
                <button 
                  onClick={() => setPdfMode('classic')}
                  className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all duration-150 ${pdfMode === 'classic' ? 'bg-[#8B1A1A] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Classic
                </button>
                <button 
                  onClick={() => setPdfMode('modern')}
                  className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all duration-150 ${pdfMode === 'modern' ? 'bg-[#8B1A1A] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Modern
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={() => setShowMobileClientEdit(true)}
                className="bg-[#8B1A1A] hover:bg-[#701212] text-white py-2.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 active:scale-98 transition-all"
              >
                <span>Edit &gt;</span>
              </button>
              <button 
                onClick={() => setShowGlobalAIModal(true)}
                className="bg-[#FAF0E6] text-[#8B1A1A] border border-[#C9A84C]/45 hover:bg-[#F3E5D8] py-2.5 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1 active:scale-98 transition-all shadow-2xs"
              >
                <span>✨ AI Suite</span>
              </button>
              <button 
                onClick={() => generatePdf('download')}
                disabled={generatingPdf}
                className="border border-[#C9A84C]/45 bg-white hover:bg-gray-50 text-[#8B1A1A] py-2.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1 active:scale-98 transition-all disabled:opacity-50"
              >
                <span>{generatingPdf ? 'PDF…' : 'PDF 📥'}</span>
              </button>
            </div>
          </div>

          {/* Counters Control Header */}
          <div className="flex items-center justify-between mb-3.5 px-0.5">
            <span className="text-gray-800 font-bold text-sm">{menu.counters.length} Counters</span>
            <button 
              onClick={() => {
                alert("Use the three dots actions on the Counter Details page to reorder (Move Up / Move Down)!");
              }}
              className="text-[#8B1A1A] hover:text-[#701212] text-xs font-semibold flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              <span>Reorder</span>
            </button>
          </div>

          {/* Counters List */}
          <div className="space-y-3.5">
            {menu.counters.map((counter, idx) => {
              const vegSection = counter.sections.find(s => s.kind === 'VEG') || { kind: 'VEG', label: 'Vegetarian', dishes: [] };
              const nonVegSection = counter.sections.find(s => s.kind === 'NON_VEG') || { kind: 'NON_VEG', label: 'Non Vegetarian', dishes: [] };
              const vegCount = vegSection.dishes.length;
              const nonVegCount = nonVegSection.dishes.length;
              const isExpanded = !!mobileExpandedCounters[counter.id];

              return (
                <div 
                  key={counter.id} 
                  className="bg-white rounded-xl border border-gray-150 overflow-hidden shadow-sm flex active:bg-gray-50/50 transition-colors"
                  onClick={() => setActiveMobileCounterId(counter.id)}
                >
                  {/* Left Number Box */}
                  <div className="w-12 bg-gray-50 border-r border-gray-150 flex items-center justify-center font-mono font-bold text-gray-500 text-sm flex-shrink-0">
                    {idx + 1}
                  </div>

                  {/* Content Box */}
                  <div className="flex-1 p-3.5 min-w-0 flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-gray-900 font-bold text-sm tracking-wide truncate">{counter.display_name}</span>
                          {counter.display_name.toUpperCase().includes('LIVE') && (
                            <span className="bg-[#E6F4EA] text-[#137333] font-bold rounded px-1 py-0.2 text-[8px] tracking-wide uppercase font-mono scale-90">
                              LIVE
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setMobileExpandedCounters(prev => ({
                            ...prev,
                            [counter.id]: !prev[counter.id]
                          }));
                        }} 
                        className="text-gray-400 hover:text-gray-655 p-1 flex-shrink-0"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          {isExpanded ? (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          )}
                        </svg>
                      </button>
                    </div>

                    {isExpanded && (
                      <p className="text-gray-500 text-xs italic mt-1.5 leading-relaxed line-clamp-2">
                        {counter.description || "No description provided"}
                      </p>
                    )}

                    <div className="flex items-center gap-1.5 mt-2.5">
                      {vegCount > 0 && (
                        <span className="bg-[#E6F4EA] text-[#16803D] font-bold rounded-lg px-2 py-0.5 text-[9px] border border-green-150">
                          {vegCount} Veg
                        </span>
                      )}
                      {nonVegCount > 0 && (
                        <span className="bg-[#FCE8E6] text-[#8B1A1A] font-bold rounded-lg px-2 py-0.5 text-[9px] border border-red-150">
                          {nonVegCount} Non-Veg
                        </span>
                      )}
                      {vegCount === 0 && nonVegCount === 0 && (
                        <span className="bg-gray-100 text-gray-500 font-semibold rounded-lg px-2 py-0.5 text-[9px] border border-gray-200">
                          Mixed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button 
            onClick={() => setShowCounterPicker(true)}
            className="w-full border-2 border-dashed border-[#8B1A1A]/40 text-[#8B1A1A] py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 bg-white hover:bg-[#8B1A1A]/5 active:scale-99 transition-all mt-5 mb-10"
          >
            <span>+ Add Counter</span>
          </button>

          {renderMobileBottomSheets()}
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="flex flex-col h-full overflow-hidden bg-[#F9F9F9]">
        {/* Top Header Bar */}
        <div className="h-14 border-b border-gray-150 bg-white px-6 flex items-center justify-between flex-shrink-0 z-20">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/menus')} className="text-gray-400 hover:text-gray-700 text-lg focus:outline-none">
              ☰
            </button>
            <h1 className="text-gray-900 text-sm font-bold tracking-wide">Menu Builder</h1>
            <span className="h-4 w-[1px] bg-gray-200" />
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              <span>Draft Saved</span>
              <span className="text-gray-400 ml-1">Just now</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* AI Assistant */}
            <button 
              onClick={() => setShowGlobalAIModal(true)} 
              className="btn-secondary text-[#8B1A1A] border-[#8B1A1A]/35 bg-[#FAF0E6]/60 hover:bg-[#FAF0E6] text-xs py-1.5 px-3.5 flex items-center gap-1.5 font-bold shadow-2xs transition-all"
            >
              <span>✨</span>
              <span>AI Assistant</span>
            </button>

            {/* Classic/Modern Toggle Button Group */}
            <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200">
              <button 
                onClick={() => setPdfMode('classic')}
                className={`px-3.5 py-1 text-xs font-semibold rounded-md transition-all duration-150 ${pdfMode === 'classic' ? 'bg-[#8B1A1A] text-white shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
              >
                Classic
              </button>
              <button 
                onClick={() => setPdfMode('modern')}
                className={`px-3.5 py-1 text-xs font-semibold rounded-md transition-all duration-150 ${pdfMode === 'modern' ? 'bg-[#8B1A1A] text-white shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}
              >
                Modern
              </button>
            </div>

            {/* Preview PDF */}
            <button 
              onClick={() => generatePdf('preview')} 
              disabled={generatingPdf}
              className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 disabled:opacity-50"
            >
              <span>👁</span>
              <span>Preview PDF</span>
            </button>

            {/* Export PDF */}
            <button 
              onClick={() => generatePdf('download')} 
              disabled={generatingPdf} 
              className="btn-primary text-xs py-1.5 px-4 flex items-center gap-1.5"
            >
              <span>⬇</span>
              <span>{generatingPdf ? 'Generating PDF…' : 'Export PDF'}</span>
            </button>

            <span className="h-6 w-[1px] bg-gray-200" />

            {/* User Profile */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#FAF0E6] border border-[#C9A84C]/30 text-[#8B1A1A] font-semibold text-xs flex items-center justify-center">
                PB
              </div>
              <div className="hidden lg:block text-left leading-tight">
                <div className="text-xs font-bold text-gray-800">Pranay Bahl</div>
                <div className="text-[9px] text-gray-400 font-medium">Sales Team</div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex flex-1 overflow-hidden relative">
          {/* Main Canvas */}
          <main className="flex-1 overflow-y-auto p-6 bg-[#F9F9F9] pb-24">
            <button onClick={() => router.push('/menus')} className="text-gray-500 hover:text-gray-850 text-xs font-semibold flex items-center gap-1 mb-3">
              <span>←</span> Back to Menus
            </button>

            {/* Mr. Kapoor Info Block */}
            <div className="flex items-center gap-3 mb-6">
              <input
                className="bg-transparent border-none outline-none text-gray-900 font-display text-3xl font-semibold placeholder:text-gray-400 focus:bg-white focus:ring-1 focus:ring-[#8B1A1A]/20 px-2 py-0.5 rounded"
                value={menu.client_name}
                onChange={e => updateMenu({ client_name: e.target.value })}
              />
              <select
                className="status-badge bg-yellow-100 text-yellow-850 border border-yellow-250 font-bold text-[10px] px-2 py-0.5 rounded cursor-pointer outline-none"
                value={menu.status}
                onChange={e => updateMenu({ status: e.target.value as MenuStatus })}
              >
                {STATUS_FLOW.map(s => (
                  <option key={s} value={s} className="bg-white text-gray-800">{s}</option>
                ))}
              </select>
            </div>

            {/* Event Details Card */}
            <div className="card p-6 bg-white mb-6 border border-gray-200">
              {/* Row 1 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 pb-6 border-b border-gray-100">
                {/* Date */}
                <div className="flex items-start gap-3">
                  <span className="text-red-750 text-lg mt-0.5">📅</span>
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-400 uppercase tracking-wider block font-bold mb-1">Date</label>
                    <input 
                      type="date"
                      className="bg-transparent border-none outline-none text-gray-800 text-xs font-semibold focus:bg-gray-50 p-1 rounded w-full"
                      value={menu.event_date ? menu.event_date.split('T')[0] : ''}
                      onChange={e => updateMenu({ event_date: e.target.value })}
                    />
                  </div>
                </div>

                {/* Function Type */}
                <div className="flex items-start gap-3">
                  <span className="text-red-755 text-lg mt-0.5">📋</span>
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-400 uppercase tracking-wider block font-bold mb-1">Function Type</label>
                    <select 
                      className="bg-transparent border-none outline-none text-gray-800 text-xs font-semibold focus:bg-gray-50 p-0.5 rounded w-full"
                      value={menu.function_type}
                      onChange={e => updateMenu({ function_type: e.target.value })}
                    >
                      {['Cocktail Dinner', 'Dinner', 'Lunch', 'Brunch', 'Corporate Gala', 'Private Party', 'Other'].map(ft => (
                        <option key={ft} value={ft}>{ft}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Guests */}
                <div className="flex items-start gap-3">
                  <span className="text-red-760 text-lg mt-0.5">👥</span>
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-400 uppercase tracking-wider block font-bold mb-1">Guests</label>
                    <input 
                      className="bg-transparent border-none outline-none text-gray-800 text-xs font-semibold focus:bg-gray-50 p-1 rounded w-full"
                      placeholder="600 Pax"
                      value={menu.guest_count}
                      onChange={e => updateMenu({ guest_count: e.target.value })}
                    />
                  </div>
                </div>

                {/* Venue */}
                <div className="flex items-start gap-3">
                  <span className="text-red-765 text-lg mt-0.5">📍</span>
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-400 uppercase tracking-wider block font-bold mb-1">Venue</label>
                    <input 
                      className="bg-transparent border-none outline-none text-gray-800 text-xs font-semibold focus:bg-gray-50 p-1 rounded w-full"
                      placeholder="The Leela Palace, Delhi"
                      value={menu.venue}
                      onChange={e => updateMenu({ venue: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Row 2 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
                {/* Requirements */}
                <div className="flex items-start gap-3">
                  <span className="text-red-770 text-lg mt-0.5">♨</span>
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-400 uppercase tracking-wider block font-bold mb-1">Requirements</label>
                    <textarea 
                      rows={2}
                      className="bg-transparent border-none outline-none text-gray-850 text-xs font-semibold focus:bg-gray-50 p-1 rounded w-full resize-none leading-relaxed"
                      placeholder="Water proof Kitchen area with water & light..."
                      value={menu.requirements_note}
                      onChange={e => updateMenu({ requirements_note: e.target.value })}
                    />
                  </div>
                </div>

                {/* Exclusions */}
                <div className="flex items-start gap-3">
                  <span className="text-red-775 text-lg mt-0.5">❌</span>
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-400 uppercase tracking-wider block font-bold mb-1">Exclusions</label>
                    <textarea 
                      rows={2}
                      className="bg-transparent border-none outline-none text-gray-850 text-xs font-semibold focus:bg-gray-50 p-1 rounded w-full resize-none leading-relaxed"
                      placeholder="Tenting related items / Florist..."
                      value={menu.exclusions_note}
                      onChange={e => updateMenu({ exclusions_note: e.target.value })}
                    />
                  </div>
                </div>

                {/* Signed By */}
                <div className="flex items-start gap-3">
                  <span className="text-red-780 text-lg mt-0.5">👤</span>
                  <div className="flex-1">
                    <label className="text-[10px] text-gray-400 uppercase tracking-wider block font-bold mb-1">Signed By</label>
                    <div className="flex items-center gap-2">
                      <input 
                        className="bg-transparent border-none outline-none text-gray-850 text-xs font-semibold focus:bg-gray-50 p-1 rounded w-full"
                        placeholder="Name"
                        value={menu.signed_by_name}
                        onChange={e => updateMenu({ signed_by_name: e.target.value })}
                      />
                      <span className="text-gray-300">/</span>
                      <input 
                        className="bg-transparent border-none outline-none text-gray-850 text-xs font-semibold focus:bg-gray-50 p-1 rounded w-full"
                        placeholder="Phone"
                        value={menu.signed_by_phone}
                        onChange={e => updateMenu({ signed_by_phone: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Counters Control Header */}
            <div className="flex items-center justify-between mb-5 relative z-10">
              <div className="text-gray-800 font-bold text-sm tracking-wide">{menu.counters.length} Counters</div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowCounterPicker(true)} className="btn-secondary text-[#8B1A1A] border-[#8B1A1A]/35 hover:bg-[#8B1A1A]/5 text-xs py-1.5 font-bold">
                  + Add Counter
                </button>
                <button className="btn-secondary text-gray-600 border-gray-200 hover:bg-gray-50 text-xs py-1.5 font-semibold">
                  ⇅ Reorder Counters
                </button>
              </div>
            </div>

            {menu.counters.length === 0 ? (
              <div className="card p-20 text-center border-dashed border-gray-200 relative z-10 flex flex-col items-center">
                <div className="text-5xl mb-4 opacity-25 text-[#8B1A1A]">≡</div>
                <p className="text-gray-400 text-sm mb-4">This menu has no counters yet.</p>
                <button onClick={() => setShowCounterPicker(true)} className="btn-secondary text-xs flex items-center gap-1">
                  <span>+</span>
                  <span>Add Counter</span>
                </button>
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={menu.counters.map(c => c.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-4">
                    {menu.counters.map((counter, i) => (
                      <SortableCounter
                        key={counter.id}
                        counter={counter}
                        index={i}
                        onUpdate={updateCounter}
                        onRemove={removeCounter}
                        onAddDish={id => setActivePickerCounterId(id)}
                        onRemoveDish={removeDishFromCounter}
                        onOpenDishAI={(dish, cid) => setActiveAIDish({ dish, counterId: cid })}
                        onOpenCounterAI={c => setActiveAICounter(c)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </main>

          {/* Dish Picker Panel */}
          {activePickerCounterId && menu && (
            <DishPickerPanel
              counterId={activePickerCounterId}
              counterTypeId={menu.counters.find(c => c.id === activePickerCounterId)?.counter_type_id ?? ''}
              allDishIds={allDishIdsInMenu}
              onClose={() => setActivePickerCounterId(null)}
              onAdd={(cid, sk, dish) => { addDishToCounter(cid, sk, dish); }}
            />
          )}
        </div>

        {/* Bottom Sticky Footer */}
        <footer className="h-16 border-t border-gray-200 bg-white px-6 flex items-center justify-between flex-shrink-0 z-20">
          <div className="text-xs text-gray-400 font-medium">
            Last saved: {lastSaved || 'Just now'}
          </div>
          <div className="flex items-center gap-3">
            <button className="btn-secondary text-xs py-1.5 px-4 font-semibold">
              Duplicate Menu
            </button>
            <button className="btn-secondary text-xs py-1.5 px-4 font-semibold">
              Save as Template
            </button>
            <button onClick={() => saveMenu(menu)} disabled={saving} className="btn-primary text-xs py-1.5 px-6 font-semibold">
              {saving ? 'Saving…' : 'Save Menu'}
            </button>
          </div>
        </footer>
      </div>

      {/* Counter type picker modal */}
      {showCounterPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-lg mx-4 shadow-xl max-h-[75vh] flex flex-col animate-slide-up">
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-gray-150">
              <h3 className="font-display text-xl font-bold text-gray-900">Add Counter</h3>
              <button onClick={() => setShowCounterPicker(false)} className="text-gray-400 hover:text-gray-600 text-2xl transition-colors">&times;</button>
            </div>
            <div className="overflow-y-auto space-y-2.5 pr-1">
              {counterTypes.filter(ct => ct.is_active).map(ct => (
                <button key={ct.id} onClick={() => addCounter(ct)}
                  className="w-full text-left px-4 py-3.5 rounded-xl bg-gray-50 hover:bg-gray-100 hover:border-gray-300 border border-gray-150 transition-all duration-200 flex flex-col justify-start">
                  <div className="text-gray-900 text-sm font-semibold tracking-wide">{ct.display_name}</div>
                  <div className="text-gray-500 text-xs mt-1.5 leading-relaxed line-clamp-1 italic">{ct.default_description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* AI Modals */}
      {activeAIDish && (
        <DishAIModal
          isOpen={!!activeAIDish}
          dish={activeAIDish.dish}
          eventContext={{
            functionType: menu.function_type,
            venue: menu.venue,
            guestCount: menu.guest_count,
          }}
          onClose={() => setActiveAIDish(null)}
          onApply={handleApplyDishDescription}
        />
      )}

      {activeAICounter && (
        <CounterAIModal
          isOpen={!!activeAICounter}
          counter={activeAICounter}
          eventContext={{
            functionType: menu.function_type,
            venue: menu.venue,
            guestCount: menu.guest_count,
            requirements: menu.requirements_note,
            exclusions: menu.exclusions_note,
          }}
          onClose={() => setActiveAICounter(null)}
          onUpdateCounter={updateCounter}
          onBatchUpdateDescriptions={handleBatchUpdateDescriptions}
          onAddSuggestedDish={addDishToCounter}
        />
      )}

      {showGlobalAIModal && (
        <GlobalAIAssistantModal
          isOpen={showGlobalAIModal}
          menu={menu}
          onClose={() => setShowGlobalAIModal(false)}
          onUpdateMenu={updateMenu}
          onAddDishToCounter={addDishToCounter}
          onBatchUpdateDishDescriptions={handleGlobalBatchUpdateDescriptions}
        />
      )}
    </AppShell>
  );
}
