// components/ai/CounterAIModal.tsx
// Counter / Section level AI assistant modal

'use client';
import { useState } from 'react';
import type { MenuCounter, DishRef } from '@/lib/types';
import type { DishSuggestion, GeneratedBatchDescriptionItem } from '@/lib/ai/types';

interface CounterAIModalProps {
  counter: MenuCounter;
  eventContext?: {
    functionType?: string;
    venue?: string;
    guestCount?: string;
    requirements?: string;
    exclusions?: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onUpdateCounter: (counterId: string, updates: Partial<MenuCounter>) => void;
  onBatchUpdateDescriptions: (counterId: string, updates: { dish_id: string; description: string }[]) => void;
  onAddSuggestedDish: (counterId: string, sectionKind: 'VEG' | 'NON_VEG', dish: DishRef) => void;
}

export default function CounterAIModal({
  counter,
  eventContext,
  isOpen,
  onClose,
  onUpdateCounter,
  onBatchUpdateDescriptions,
  onAddSuggestedDish,
}: CounterAIModalProps) {
  const [activeTab, setActiveTab] = useState<'intro' | 'batch_desc' | 'suggestions'>('intro');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Intro state
  const [introText, setIntroText] = useState(counter.description || '');
  const [accompanimentsText, setAccompanimentsText] = useState(counter.accompaniments || '');

  // Batch descriptions state
  const [batchResults, setBatchResults] = useState<GeneratedBatchDescriptionItem[]>([]);
  const [overwriteExisting, setOverwriteExisting] = useState(false);

  // Suggestions state
  const [suggestions, setSuggestions] = useState<DishSuggestion[]>([]);

  if (!isOpen) return null;

  const allDishes = counter.sections.flatMap((s) => s.dishes);
  const dishesMissingDesc = allDishes.filter((d) => !d.description || d.description.trim().length < 8);

  const handleGenerateIntro = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-section-intro',
          payload: {
            counterName: counter.display_name,
            counterDescription: counter.description,
            dishes: allDishes.map((d) => ({ name: d.name, dietary: d.dietary, description: d.description })),
            eventContext,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to generate section intro.');

      setIntroText(json.data.introduction);
      if (json.data.suggestedAccompaniments) {
        setAccompanimentsText(json.data.suggestedAccompaniments);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error generating section introduction.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyIntro = () => {
    onUpdateCounter(counter.id, {
      description: introText,
      accompaniments: accompanimentsText,
    });
    onClose();
  };

  const handleGenerateAllDescriptions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-all-descriptions',
          payload: {
            counterName: counter.display_name,
            dishes: allDishes.map((d) => ({
              dish_id: d.dish_id,
              name: d.name,
              dietary: d.dietary,
              currentDescription: d.description,
            })),
            overwriteExisting,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to batch generate descriptions.');

      setBatchResults(json.data.dishes || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error generating descriptions.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyBatchDescriptions = () => {
    if (batchResults.length === 0) return;
    const updates = batchResults.map((b) => ({ dish_id: b.dish_id, description: b.description }));
    onBatchUpdateDescriptions(counter.id, updates);
    onClose();
  };

  const handleFetchSuggestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const miniMenu = {
        client_name: 'Current Event',
        function_type: eventContext?.functionType || 'Dinner',
        guest_count: eventContext?.guestCount || '600 Pax',
        venue: eventContext?.venue || '',
        requirements_note: eventContext?.requirements || '',
        exclusions_note: eventContext?.exclusions || '',
        signed_by_name: '',
        signed_by_phone: '',
        status: 'DRAFT' as const,
        id: 'temp-menu',
        created_at: '',
        updated_at: '',
        counters: [counter],
      };

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'suggest-dishes',
          payload: {
            menu: miniMenu,
            targetCounterId: counter.id,
            count: 4,
          },
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to suggest dishes.');

      setSuggestions(json.data.suggestions || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error fetching dish suggestions.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm animate-fade-in p-4">
      <div
        className="bg-white border border-gray-200 rounded-2xl w-full max-w-2xl max-h-[85vh] shadow-2xl flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-150 flex items-center justify-between flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-gray-900 font-bold text-base">✨ Counter AI Suite</h3>
              <span className="text-xs font-semibold text-[#8B1A1A] bg-[#FAF0E6] px-2.5 py-0.5 rounded-full border border-[#C9A84C]/30">
                {counter.display_name}
              </span>
            </div>
            <p className="text-gray-400 text-xs mt-0.5">
              Refine copy, fill missing dish descriptions, and discover curated menu pairings.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none focus:outline-none transition-colors"
          >
            &times;
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-gray-150 px-6 bg-gray-50/50 flex-shrink-0">
          <button
            onClick={() => setActiveTab('intro')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'intro'
                ? 'border-[#8B1A1A] text-[#8B1A1A]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            📝 Section Intro & Notes
          </button>
          <button
            onClick={() => setActiveTab('batch_desc')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === 'batch_desc'
                ? 'border-[#8B1A1A] text-[#8B1A1A]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <span>✨ Batch Descriptions</span>
            {dishesMissingDesc.length > 0 && (
              <span className="bg-[#FAF0E6] text-[#8B1A1A] text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                {dishesMissingDesc.length} empty
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('suggestions')}
            className={`py-3 px-4 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'suggestions'
                ? 'border-[#8B1A1A] text-[#8B1A1A]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            💡 Suggested Dishes
          </button>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2 flex-shrink-0">
            <span>⚠️</span>
            <div className="flex-1">{error}</div>
          </div>
        )}

        {/* Scrollable Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* TAB 1: SECTION INTRO */}
          {activeTab === 'intro' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-800">Proposal Section Narrative</h4>
                  <p className="text-[11px] text-gray-500">
                    Generates a luxury 1-2 sentence introduction tailored for banquet presentation.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleGenerateIntro}
                  className="btn-primary text-xs py-1.5 px-3.5 font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-60"
                >
                  <span>✨</span>
                  <span>{loading ? 'Generating…' : 'Generate Intro'}</span>
                </button>
              </div>

              <div>
                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">
                  Section Introduction (Editable)
                </label>
                <textarea
                  rows={3}
                  value={introText}
                  onChange={(e) => setIntroText(e.target.value)}
                  placeholder="Click 'Generate Intro' to create an elegant section narrative..."
                  className="input-field text-xs py-2.5 px-3 bg-gray-50/50 border-gray-200 focus:bg-white resize-none leading-relaxed"
                />
              </div>

              <div>
                <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">
                  Recommended Accompaniments & Condiments
                </label>
                <input
                  type="text"
                  value={accompanimentsText}
                  onChange={(e) => setAccompanimentsText(e.target.value)}
                  placeholder="Laccha Onion, Mint Chutney, Burani Raita, Lemon Wedges..."
                  className="input-field text-xs py-2 px-3 bg-gray-50/50 border-gray-200 focus:bg-white"
                />
              </div>
            </div>
          )}

          {/* TAB 2: BATCH DESCRIPTIONS */}
          {activeTab === 'batch_desc' && (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="text-xs font-bold text-gray-800">Generate All Dish Descriptions</h4>
                  <p className="text-[11px] text-gray-500">
                    Automatically writes professional copy for all {allDishes.length} items in this section.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={loading || allDishes.length === 0}
                  onClick={handleGenerateAllDescriptions}
                  className="btn-primary text-xs py-1.5 px-3.5 font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-60 flex-shrink-0"
                >
                  <span>✨</span>
                  <span>{loading ? 'Processing…' : `Generate (${allDishes.length} Dishes)`}</span>
                </button>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overwriteExisting}
                    onChange={(e) => setOverwriteExisting(e.target.checked)}
                    className="accent-[#8B1A1A]"
                  />
                  <span>Also rewrite dishes with existing descriptions</span>
                </label>
              </div>

              {batchResults.length > 0 ? (
                <div className="space-y-2.5 pt-2">
                  <div className="text-[10px] font-bold uppercase text-gray-400">
                    Preview Generated Descriptions ({batchResults.length} Items):
                  </div>
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {batchResults.map((item, idx) => (
                      <div key={item.dish_id} className="p-3 bg-gray-50 border border-gray-150 rounded-xl space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold text-gray-800">
                          <span>{item.name}</span>
                          {item.wasUpdated && (
                            <span className="text-[9px] text-[#137333] bg-[#E6F4EA] px-2 py-0.2 rounded font-semibold">
                              New Copy
                            </span>
                          )}
                        </div>
                        <textarea
                          rows={2}
                          value={item.description}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBatchResults((prev) =>
                              prev.map((p, i) => (i === idx ? { ...p, description: val } : p))
                            );
                          }}
                          className="input-field text-[11px] py-1 px-2 bg-white border-gray-200 resize-none leading-relaxed"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-6 bg-gray-50/70 border border-dashed border-gray-200 rounded-xl text-center space-y-2">
                  <div className="text-gray-400 text-xs">
                    {dishesMissingDesc.length > 0
                      ? `${dishesMissingDesc.length} dishes in this section currently have empty or short descriptions.`
                      : 'All dishes currently have descriptions. Check "Also rewrite" if you wish to re-generate.'}
                  </div>
                  <p className="text-[10px] text-gray-400 italic">
                    Click "Generate" above to preview and edit before saving.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: SUGGESTIONS */}
          {activeTab === 'suggestions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-800">AI Dish Pairings</h4>
                  <p className="text-[11px] text-gray-500">
                    Dishes selected to balance cuisine, guest count, and counter flow.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleFetchSuggestions}
                  className="btn-secondary text-[#8B1A1A] border-[#8B1A1A]/35 hover:bg-[#8B1A1A]/5 text-xs py-1.5 px-3.5 font-bold flex items-center gap-1.5 disabled:opacity-60"
                >
                  <span>💡</span>
                  <span>{loading ? 'Analyzing…' : 'Find Suggestions'}</span>
                </button>
              </div>

              {suggestions.length > 0 ? (
                <div className="space-y-2.5">
                  {suggestions.map((sug) => (
                    <div
                      key={sug.id || sug.dishName}
                      className="p-3.5 bg-white border border-gray-150 rounded-xl shadow-sm flex items-start justify-between gap-3 hover:border-gray-300 transition-all"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: sug.dietary === 'NON_VEG' ? '#8B1A1A' : '#16803D' }}
                          />
                          <span className="text-gray-900 font-bold text-xs">{sug.dishName}</span>
                          <span className="text-[9px] text-gray-400 font-medium">({sug.category})</span>
                        </div>
                        <p className="text-gray-600 text-xs italic leading-relaxed">{sug.description}</p>
                        <p className="text-[10px] text-[#8B1A1A] font-medium">
                          ✦ Why: <span className="text-gray-600">{sug.reason}</span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onAddSuggestedDish(
                            counter.id,
                            sug.dietary === 'NON_VEG' ? 'NON_VEG' : 'VEG',
                            {
                              dish_id: `sug-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                              name: sug.dishName,
                              description: sug.description,
                              dietary: sug.dietary,
                            }
                          );
                          setSuggestions((prev) => prev.filter((s) => s.dishName !== sug.dishName));
                        }}
                        className="btn-primary text-xs py-1.5 px-3 font-bold flex-shrink-0 flex items-center gap-1"
                      >
                        <span>+ Add</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 bg-gray-50/70 border border-dashed border-gray-200 rounded-xl text-center space-y-2">
                  <p className="text-gray-400 text-xs">
                    Click "Find Suggestions" to discover complementary items for {counter.display_name}.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-150 flex items-center justify-end gap-3 flex-shrink-0 bg-gray-50/30">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs py-2 px-4 font-semibold text-gray-600"
          >
            Close
          </button>
          {activeTab === 'intro' && (
            <button
              type="button"
              disabled={loading || !introText.trim()}
              onClick={handleApplyIntro}
              className="btn-primary text-xs py-2 px-5 font-bold disabled:opacity-50"
            >
              Save Section Intro
            </button>
          )}
          {activeTab === 'batch_desc' && batchResults.length > 0 && (
            <button
              type="button"
              onClick={handleApplyBatchDescriptions}
              className="btn-primary text-xs py-2 px-5 font-bold"
            >
              Apply All ({batchResults.length}) Descriptions
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
