// components/ai/GlobalAIAssistantModal.tsx
// Global AI Suite for MenuCraft

'use client';
import { useState } from 'react';
import type { Menu, MenuCounter, DishRef } from '@/lib/types';
import type {
  MenuReviewResult,
  DishSuggestion,
  ProposalContentResult,
  GeneratedBatchDescriptionItem,
} from '@/lib/ai/types';

interface GlobalAIAssistantModalProps {
  menu: Menu;
  isOpen: boolean;
  onClose: () => void;
  onUpdateMenu: (updates: Partial<Menu>) => void;
  onAddDishToCounter: (counterId: string, sectionKind: 'VEG' | 'NON_VEG', dish: DishRef) => void;
  onBatchUpdateDishDescriptions: (updates: { dish_id: string; description: string }[]) => void;
}

export default function GlobalAIAssistantModal({
  menu,
  isOpen,
  onClose,
  onUpdateMenu,
  onAddDishToCounter,
  onBatchUpdateDishDescriptions,
}: GlobalAIAssistantModalProps) {
  const [activeTab, setActiveTab] = useState<'review' | 'suggestions' | 'batch_desc' | 'proposal'>('review');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Review State
  const [reviewResult, setReviewResult] = useState<MenuReviewResult | null>(null);

  // Suggestions State
  const [suggestions, setSuggestions] = useState<DishSuggestion[]>([]);
  const [selectedCounterIdForSug, setSelectedCounterIdForSug] = useState<string>('');

  // Global Batch Descriptions State
  const [batchResults, setBatchResults] = useState<GeneratedBatchDescriptionItem[]>([]);
  const [overwriteExisting, setOverwriteExisting] = useState(false);

  // Proposal Content State
  const [proposalResult, setProposalResult] = useState<ProposalContentResult | null>(null);
  const [copiedNotification, setCopiedNotification] = useState(false);

  if (!isOpen) return null;

  const allDishes = menu.counters.flatMap((c) =>
    c.sections.flatMap((s) => s.dishes.map((d) => ({ ...d, counterName: c.display_name, counterId: c.id })))
  );
  const dishesMissingDesc = allDishes.filter((d) => !d.description || d.description.trim().length < 8);

  // Feature 5: Review Menu
  const handleReviewMenu = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'review-menu',
          payload: { menu },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to review menu.');
      setReviewResult(json.data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error reviewing menu.');
    } finally {
      setLoading(false);
    }
  };

  // Feature 6: Suggest Dishes
  const handleFetchSuggestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'suggest-dishes',
          payload: {
            menu,
            targetCounterId: selectedCounterIdForSug || undefined,
            count: 5,
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

  // Feature 4: Generate All Missing Descriptions
  const handleGenerateAllMissing = async () => {
    setLoading(true);
    setError(null);
    try {
      const targetDishes = overwriteExisting ? allDishes : dishesMissingDesc;
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-all-descriptions',
          payload: {
            counterName: 'Entire Menu',
            dishes: targetDishes.map((d) => ({
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
      setError(err.message || 'Error generating batch descriptions.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyBatchDescriptions = () => {
    if (batchResults.length === 0) return;
    const updates = batchResults.map((b) => ({ dish_id: b.dish_id, description: b.description }));
    onBatchUpdateDishDescriptions(updates);
    onClose();
  };

  // Feature 9: Generate Proposal Content
  const handleGenerateProposal = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-proposal',
          payload: { menu },
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to generate proposal content.');
      setProposalResult(json.data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Error generating proposal narrative.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in p-4">
      <div
        className="bg-white border border-gray-200 rounded-2xl w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-gray-150 flex items-center justify-between flex-shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FAF0E6] border border-[#C9A84C]/40 text-[#8B1A1A] flex items-center justify-center font-bold text-lg">
              ✨
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-gray-900 font-bold text-base">MenuCraft AI Assistant</h2>
                <span className="bg-[#FAF0E6] text-[#8B1A1A] border border-[#C9A84C]/30 text-[10px] font-bold px-2 py-0.2 rounded-full uppercase tracking-wider">
                  Live Gateway
                </span>
              </div>
              <p className="text-gray-400 text-xs mt-0.5">
                Event-aware catering intelligence for {menu.client_name || 'Current Event'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none focus:outline-none transition-colors"
          >
            &times;
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-150 px-6 bg-gray-50/60 flex-shrink-0 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('review')}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'review'
                ? 'border-[#8B1A1A] text-[#8B1A1A]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <span>🔍 Menu Review & Balance</span>
          </button>
          <button
            onClick={() => setActiveTab('suggestions')}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'suggestions'
                ? 'border-[#8B1A1A] text-[#8B1A1A]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <span>💡 Dish Suggestions</span>
          </button>
          <button
            onClick={() => setActiveTab('batch_desc')}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'batch_desc'
                ? 'border-[#8B1A1A] text-[#8B1A1A]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <span>✨ Missing Descriptions</span>
            {dishesMissingDesc.length > 0 && (
              <span className="bg-[#FAF0E6] text-[#8B1A1A] text-[9px] px-1.5 py-0.2 rounded-full font-bold">
                {dishesMissingDesc.length} empty
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('proposal')}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 whitespace-nowrap transition-all flex items-center gap-1.5 ${
              activeTab === 'proposal'
                ? 'border-[#8B1A1A] text-[#8B1A1A]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            <span>📄 Proposal Narrative</span>
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mx-6 mt-4 p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2 flex-shrink-0">
            <span className="font-bold">⚠️</span>
            <div className="flex-1 leading-relaxed">{error}</div>
          </div>
        )}

        {/* Scrollable Main Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: MENU REVIEW */}
          {activeTab === 'review' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between bg-[#FAF0E6]/30 border border-[#C9A84C]/25 rounded-2xl p-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Comprehensive Catering Audit</h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Analyzes menu balance, dietary ratios, protein variety, exclusions, and banquet flow.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleReviewMenu}
                  className="btn-primary text-xs py-2 px-4 font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-60"
                >
                  <span>🔍</span>
                  <span>{loading ? 'Analyzing Menu…' : 'Run Full Review'}</span>
                </button>
              </div>

              {reviewResult ? (
                <div className="space-y-5 animate-fade-in">
                  {/* Score & Summary Card */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white border border-gray-150 rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">
                        Catering Score
                      </div>
                      <div className="text-3xl font-mono font-bold text-[#8B1A1A]">
                        {reviewResult.overallScore}
                        <span className="text-xs text-gray-400 font-normal">/100</span>
                      </div>
                      <div className="text-[10px] text-green-700 font-bold mt-1 bg-green-50 px-2 py-0.5 rounded-full">
                        {reviewResult.overallScore >= 80 ? 'Banquet Ready' : 'Optimization Recommended'}
                      </div>
                    </div>

                    <div className="md:col-span-3 bg-white border border-gray-150 rounded-2xl p-4 shadow-sm flex flex-col justify-center">
                      <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">
                        Executive Assessment
                      </div>
                      <p className="text-xs text-gray-700 leading-relaxed italic">{reviewResult.summary}</p>
                    </div>
                  </div>

                  {/* Strengths */}
                  {reviewResult.strengths && reviewResult.strengths.length > 0 && (
                    <div className="bg-[#E6F4EA]/30 border border-green-200 rounded-2xl p-4 space-y-2">
                      <div className="text-xs font-bold text-[#137333] flex items-center gap-1.5">
                        <span>✓</span>
                        <span>Key Menu Strengths</span>
                      </div>
                      <ul className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-700">
                        {reviewResult.strengths.map((str, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-[#137333] font-bold">•</span>
                            <span>{str}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Identified Issues */}
                  <div className="space-y-3">
                    <div className="text-xs font-bold text-gray-800 flex items-center justify-between">
                      <span>Detected Issues & Optimizations ({reviewResult.issues?.length || 0})</span>
                    </div>

                    <div className="space-y-2.5">
                      {reviewResult.issues && reviewResult.issues.length > 0 ? (
                        reviewResult.issues.map((issue) => (
                          <div
                            key={issue.id || issue.title}
                            className={`p-3.5 rounded-xl border flex items-start gap-3 transition-all ${
                              issue.severity === 'high'
                                ? 'bg-red-50/50 border-red-200 text-red-900'
                                : issue.severity === 'medium'
                                ? 'bg-amber-50/40 border-amber-200 text-amber-900'
                                : 'bg-gray-50 border-gray-200 text-gray-800'
                            }`}
                          >
                            <span className="text-sm mt-0.5">
                              {issue.severity === 'high' ? '🚨' : issue.severity === 'medium' ? '⚠️' : 'ℹ️'}
                            </span>
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs">{issue.title}</span>
                                <span
                                  className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded-full ${
                                    issue.severity === 'high'
                                      ? 'bg-red-100 text-red-700'
                                      : issue.severity === 'medium'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-gray-200 text-gray-700'
                                  }`}
                                >
                                  {issue.severity} priority
                                </span>
                              </div>
                              <p className="text-xs leading-relaxed opacity-90">{issue.message}</p>
                              {issue.suggestedAction && (
                                <p className="text-[11px] font-semibold text-[#8B1A1A] pt-0.5">
                                  Action: {issue.suggestedAction}
                                </p>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-center text-xs text-green-800 font-semibold">
                          🎉 No issues found! The menu is exceptionally balanced and complete.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Suggestions included in review */}
                  {reviewResult.suggestions && reviewResult.suggestions.length > 0 && (
                    <div className="space-y-3 pt-2">
                      <div className="text-xs font-bold text-gray-800">
                        Recommended Additions from Review ({reviewResult.suggestions.length})
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {reviewResult.suggestions.map((sug) => (
                          <div
                            key={sug.id || sug.dishName}
                            className="bg-white border border-gray-200 rounded-xl p-3.5 shadow-sm space-y-2 flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-gray-900">{sug.dishName}</span>
                                <span
                                  className="w-2 h-2 rounded-full"
                                  style={{ background: sug.dietary === 'NON_VEG' ? '#8B1A1A' : '#16803D' }}
                                />
                              </div>
                              <p className="text-[11px] text-gray-600 italic mt-1">{sug.description}</p>
                              <p className="text-[10px] text-[#8B1A1A] mt-1.5 font-medium">✦ {sug.reason}</p>
                            </div>
                            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                              <span className="text-[10px] text-gray-400 truncate">
                                For: {sug.suggestedCounterName || 'General'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const targetCid =
                                    sug.suggestedCounterId ||
                                    menu.counters[0]?.id;
                                  if (targetCid) {
                                    onAddDishToCounter(
                                      targetCid,
                                      sug.dietary === 'NON_VEG' ? 'NON_VEG' : 'VEG',
                                      {
                                        dish_id: `rev-sug-${Date.now()}`,
                                        name: sug.dishName,
                                        description: sug.description,
                                        dietary: sug.dietary,
                                      }
                                    );
                                    alert(`Added "${sug.dishName}" to menu!`);
                                  }
                                }}
                                className="btn-primary text-[11px] py-1 px-3 font-bold"
                              >
                                + Add Dish
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-12 text-center border border-dashed border-gray-200 rounded-2xl space-y-3 bg-gray-50/50">
                  <div className="text-4xl opacity-30 text-[#8B1A1A]">📋</div>
                  <h4 className="text-xs font-bold text-gray-700">No review performed yet</h4>
                  <p className="text-[11px] text-gray-500 max-w-md mx-auto">
                    Click "Run Full Review" to let the AI verify your menu items, balance, dietary ratios, and
                    alignment with event notes.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SUGGEST DISHES */}
          {activeTab === 'suggestions' && (
            <div className="space-y-5">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-[#FAF0E6]/30 border border-[#C9A84C]/25 rounded-2xl p-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-gray-900">Event-Aware Dish Recommendations</h3>
                  <p className="text-xs text-gray-600">
                    Calculated for: <span className="font-semibold">{menu.function_type || 'Dinner'}</span> with{' '}
                    <span className="font-semibold">{menu.guest_count || '600 Pax'}</span> at{' '}
                    <span className="font-semibold">{menu.venue || 'Venue'}</span>.
                  </p>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  <select
                    value={selectedCounterIdForSug}
                    onChange={(e) => setSelectedCounterIdForSug(e.target.value)}
                    className="input-field text-xs py-2 bg-white text-gray-700 border-gray-250 max-w-[180px]"
                  >
                    <option value="">All Counters</option>
                    {menu.counters.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.display_name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleFetchSuggestions}
                    className="btn-primary text-xs py-2 px-4 font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-60 whitespace-nowrap"
                  >
                    <span>💡</span>
                    <span>{loading ? 'Finding Pairings…' : 'Generate Suggestions'}</span>
                  </button>
                </div>
              </div>

              {suggestions.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {suggestions.map((sug) => (
                    <div
                      key={sug.id || sug.dishName}
                      className="bg-white border border-gray-150 rounded-2xl p-4 shadow-sm space-y-3 flex flex-col justify-between hover:border-gray-300 transition-all"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ background: sug.dietary === 'NON_VEG' ? '#8B1A1A' : '#16803D' }}
                            />
                            <span className="text-xs font-bold text-gray-900">{sug.dishName}</span>
                          </div>
                          <span className="text-[10px] text-gray-400 font-medium">{sug.category}</span>
                        </div>
                        <p className="text-xs text-gray-600 italic leading-relaxed">{sug.description}</p>
                        <p className="text-[11px] text-[#8B1A1A] font-medium pt-1">
                          ✦ Why: <span className="text-gray-700">{sug.reason}</span>
                        </p>
                      </div>

                      <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                        <span className="text-[10px] text-gray-400 truncate">
                          Target: {sug.suggestedCounterName || 'Matching Counter'}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            // Find target counter or first counter
                            const target =
                              menu.counters.find((c) => c.id === sug.suggestedCounterId) ||
                              menu.counters.find((c) => c.display_name.toLowerCase().includes((sug.suggestedCounterName || '').toLowerCase())) ||
                              menu.counters[0];

                            if (target) {
                              onAddDishToCounter(
                                target.id,
                                sug.dietary === 'NON_VEG' ? 'NON_VEG' : 'VEG',
                                {
                                  dish_id: `sug-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
                                  name: sug.dishName,
                                  description: sug.description,
                                  dietary: sug.dietary,
                                }
                              );
                              setSuggestions((prev) => prev.filter((s) => s.dishName !== sug.dishName));
                              alert(`Added "${sug.dishName}" to ${target.display_name}!`);
                            } else {
                              alert('Please add a counter to the menu first.');
                            }
                          }}
                          className="btn-primary text-xs py-1.5 px-3.5 font-bold flex items-center gap-1"
                        >
                          <span>+ Add to Menu</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center border border-dashed border-gray-200 rounded-2xl space-y-3 bg-gray-50/50">
                  <div className="text-4xl opacity-30 text-[#8B1A1A]">💡</div>
                  <h4 className="text-xs font-bold text-gray-700">No suggestions requested yet</h4>
                  <p className="text-[11px] text-gray-500 max-w-md mx-auto">
                    Click "Generate Suggestions" to discover curated regional, signature, and dietary complementary
                    dishes.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: BATCH MISSING DESCRIPTIONS */}
          {activeTab === 'batch_desc' && (
            <div className="space-y-5">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 bg-[#FAF0E6]/30 border border-[#C9A84C]/25 rounded-2xl p-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Auto-Generate All Missing Descriptions</h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Found {dishesMissingDesc.length} dishes across the entire menu with empty or short descriptions.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={overwriteExisting}
                      onChange={(e) => setOverwriteExisting(e.target.checked)}
                      className="accent-[#8B1A1A]"
                    />
                    <span>Rewrite all ({allDishes.length})</span>
                  </label>
                  <button
                    type="button"
                    disabled={loading || (!overwriteExisting && dishesMissingDesc.length === 0)}
                    onClick={handleGenerateAllMissing}
                    className="btn-primary text-xs py-2 px-4 font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-60 whitespace-nowrap"
                  >
                    <span>✨</span>
                    <span>
                      {loading
                        ? 'Writing Copy…'
                        : `Generate (${overwriteExisting ? allDishes.length : dishesMissingDesc.length} Items)`}
                    </span>
                  </button>
                </div>
              </div>

              {batchResults.length > 0 ? (
                <div className="space-y-3 animate-fade-in">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-800">
                    <span>Generated Descriptions Preview ({batchResults.length} dishes)</span>
                    <span className="text-[10px] text-gray-500 font-normal">You can edit before applying.</span>
                  </div>

                  <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                    {batchResults.map((item, idx) => (
                      <div key={item.dish_id} className="p-3.5 bg-gray-50 border border-gray-150 rounded-xl space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold text-gray-900">
                          <span>{item.name}</span>
                          <span className="text-[9px] bg-[#E6F4EA] text-[#137333] px-2 py-0.2 rounded font-semibold">
                            AI Generated
                          </span>
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
                          className="input-field text-xs py-1.5 px-2.5 bg-white border-gray-200 resize-none leading-relaxed"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleApplyBatchDescriptions}
                      className="btn-primary text-xs py-2 px-6 font-bold shadow-md"
                    >
                      ✓ Apply All ({batchResults.length}) Descriptions to Menu
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center border border-dashed border-gray-200 rounded-2xl space-y-3 bg-gray-50/50">
                  <div className="text-4xl opacity-30 text-[#8B1A1A]">✍️</div>
                  <h4 className="text-xs font-bold text-gray-700">
                    {dishesMissingDesc.length > 0
                      ? `${dishesMissingDesc.length} dishes need descriptions.`
                      : 'All dishes currently have complete descriptions.'}
                  </h4>
                  <p className="text-[11px] text-gray-500 max-w-md mx-auto">
                    Click "Generate" above to batch generate culinary copy for all pending dishes in one go.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: PROPOSAL CONTENT */}
          {activeTab === 'proposal' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between bg-[#FAF0E6]/30 border border-[#C9A84C]/25 rounded-2xl p-4">
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Luxury Catering Proposal Copy</h3>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Synthesizes client details, culinary narrative, and service guarantees for client proposals.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleGenerateProposal}
                  className="btn-primary text-xs py-2 px-4 font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-60"
                >
                  <span>📄</span>
                  <span>{loading ? 'Synthesizing…' : 'Generate Proposal'}</span>
                </button>
              </div>

              {proposalResult ? (
                <div className="space-y-4 animate-fade-in bg-white border border-gray-150 rounded-2xl p-5 shadow-sm">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <h4 className="text-xs font-bold text-[#8B1A1A] uppercase tracking-wider">
                      Proposal Draft Narrative
                    </h4>
                    <button
                      type="button"
                      onClick={() =>
                        copyToClipboard(
                          `${proposalResult.clientGreeting}\n\nEXECUTIVE SUMMARY:\n${proposalResult.executiveSummary}\n\nCULINARY JOURNEY:\n${proposalResult.culinaryNarrative}\n\nEXPERIENCE HIGHLIGHTS:\n${proposalResult.curatedExperienceNotes.map((n) => `• ${n}`).join('\n')}\n\nSERVICE ASSURANCE:\n${proposalResult.serviceStyleNote}`
                        )
                      }
                      className="btn-secondary text-[11px] py-1 px-3 font-semibold"
                    >
                      {copiedNotification ? '✓ Copied!' : '📋 Copy Full Narrative'}
                    </button>
                  </div>

                  <div className="space-y-3 text-xs text-gray-700">
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-0.5">
                        Client Greeting
                      </span>
                      <p className="font-semibold text-gray-900">{proposalResult.clientGreeting}</p>
                    </div>

                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-0.5">
                        Executive Summary
                      </span>
                      <p className="leading-relaxed">{proposalResult.executiveSummary}</p>
                    </div>

                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-0.5">
                        Culinary Journey & Vision
                      </span>
                      <p className="leading-relaxed italic">{proposalResult.culinaryNarrative}</p>
                    </div>

                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-1">
                        Curated Highlights
                      </span>
                      <ul className="space-y-1">
                        {proposalResult.curatedExperienceNotes?.map((note, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-[#8B1A1A] font-bold">•</span>
                            <span>{note}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-0.5">
                        Service & Execution Guarantee
                      </span>
                      <p className="leading-relaxed text-gray-600">{proposalResult.serviceStyleNote}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center border border-dashed border-gray-200 rounded-2xl space-y-3 bg-gray-50/50">
                  <div className="text-4xl opacity-30 text-[#8B1A1A]">📜</div>
                  <h4 className="text-xs font-bold text-gray-700">No proposal content generated yet</h4>
                  <p className="text-[11px] text-gray-500 max-w-md mx-auto">
                    Click "Generate Proposal" to synthesize your menu items, requirements, and exclusions into a
                    luxurious client presentation.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-gray-150 flex items-center justify-between flex-shrink-0 bg-gray-50/50">
          <div className="text-[11px] text-gray-400">
            MenuCraft AI v2.0 • Secured via Central Gateway
          </div>
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs py-1.5 px-4 font-semibold text-gray-700"
          >
            Close Assistant
          </button>
        </div>
      </div>
    </div>
  );
}
