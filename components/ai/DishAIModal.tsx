// components/ai/DishAIModal.tsx
// Native modal for dish-level AI generation and improvement

'use client';
import { useState } from 'react';
import type { Dietary } from '@/lib/types';
import type { DescriptionTone } from '@/lib/ai/types';

interface DishAIModalProps {
  dish: {
    dish_id: string;
    name: string;
    description: string;
    dietary?: Dietary;
  };
  eventContext?: {
    functionType?: string;
    venue?: string;
    guestCount?: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onApply: (dishId: string, newDescription: string) => void;
}

export default function DishAIModal({
  dish,
  eventContext,
  isOpen,
  onClose,
  onApply,
}: DishAIModalProps) {
  const [tone, setTone] = useState<DescriptionTone>('standard');
  const [loading, setLoading] = useState(false);
  const [generatedText, setGeneratedText] = useState(dish.description || '');
  const [keyNotes, setKeyNotes] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasGenerated, setHasGenerated] = useState(false);

  if (!isOpen) return null;

  const handleGenerate = async (action: 'generate-description' | 'improve-description') => {
    setLoading(true);
    setError(null);

    try {
      const payload =
        action === 'generate-description'
          ? {
              dishName: dish.name,
              category: dish.dietary,
              currentDescription: dish.description,
              tone,
              eventContext,
            }
          : {
              dishName: dish.name,
              currentDescription: generatedText || dish.description,
              category: dish.dietary,
              tone,
            };

      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, payload }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to generate AI copy.');
      }

      setGeneratedText(json.data.description);
      setKeyNotes(json.data.keyNotes || null);
      setHasGenerated(true);
    } catch (err: any) {
      console.error('AI generate error:', err);
      setError(err.message || 'Unable to connect to AI gateway. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    onApply(dish.dish_id, generatedText);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-sm animate-fade-in p-4">
      <div
        className="bg-white border border-gray-200 rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-5 animate-slide-up flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-150 pb-3.5">
          <div className="flex items-center gap-2">
            <span className="text-[#8B1A1A] font-bold text-base">✨ AI Dish Copywriter</span>
            <span className="text-[10px] bg-[#FAF0E6] text-[#8B1A1A] font-semibold px-2 py-0.5 rounded border border-[#C9A84C]/30">
              Smart Assistant
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none focus:outline-none transition-colors"
          >
            &times;
          </button>
        </div>

        {/* Dish Info Card */}
        <div className="bg-gray-50 border border-gray-150 rounded-xl p-3.5 flex items-start gap-2.5">
          <span
            className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0"
            style={{ background: dish.dietary === 'NON_VEG' ? '#8B1A1A' : '#16803D' }}
          />
          <div className="flex-1 min-w-0">
            <h4 className="text-gray-900 font-bold text-sm truncate">{dish.name}</h4>
            <p className="text-gray-500 text-xs italic mt-0.5">
              Current: {dish.description ? `"${dish.description}"` : '(No description written yet)'}
            </p>
          </div>
        </div>

        {/* Tone Selection */}
        <div className="space-y-1.5">
          <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
            Select Tone / Style
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 'standard', label: 'Balanced', desc: 'Appetizing & Clear' },
                { id: 'premium', label: 'Luxury Banquet', desc: 'Elevated & Artisanal' },
                { id: 'concise', label: 'Concise', desc: 'Punchy 1-Liner' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTone(t.id)}
                className={`px-3 py-2 rounded-xl text-left border transition-all ${
                  tone === t.id
                    ? 'border-[#8B1A1A] bg-[#FAF0E6]/50 text-[#8B1A1A] font-bold shadow-sm'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                }`}
              >
                <div className="text-xs font-semibold">{t.label}</div>
                <div className="text-[9px] text-gray-400 mt-0.5">{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            disabled={loading}
            onClick={() => handleGenerate('generate-description')}
            className="btn-primary flex-1 text-xs py-2.5 font-bold flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-60"
          >
            <span>✨</span>
            <span>{loading ? 'Thinking…' : 'Generate Description'}</span>
          </button>
          {dish.description && (
            <button
              type="button"
              disabled={loading}
              onClick={() => handleGenerate('improve-description')}
              className="btn-secondary text-[#8B1A1A] border-[#8B1A1A]/35 hover:bg-[#8B1A1A]/5 flex-1 text-xs py-2.5 font-bold flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              <span>🪄</span>
              <span>{loading ? 'Refining…' : 'Improve Existing'}</span>
            </button>
          )}
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2 animate-fade-in">
            <span className="font-bold">⚠️</span>
            <div className="flex-1 leading-relaxed">{error}</div>
          </div>
        )}

        {/* Result Editor */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">
              {hasGenerated ? 'AI Result (Editable Preview)' : 'Description Content'}
            </label>
            {keyNotes && (
              <span className="text-[9px] text-[#C9A84C] font-semibold uppercase tracking-wider">
                Note: {keyNotes}
              </span>
            )}
          </div>
          <textarea
            rows={3}
            value={generatedText}
            onChange={(e) => setGeneratedText(e.target.value)}
            placeholder="Generated description will appear here. You can edit before applying..."
            className="input-field text-xs py-2.5 px-3 bg-gray-50/50 border-gray-200 focus:bg-white resize-none leading-relaxed"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-150">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs py-2 px-4 font-semibold text-gray-600"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading || !generatedText.trim()}
            onClick={handleApply}
            className="btn-primary text-xs py-2 px-5 font-bold flex items-center gap-1.5 disabled:opacity-50"
          >
            <span>✓</span>
            <span>Use This Description</span>
          </button>
        </div>
      </div>
    </div>
  );
}
