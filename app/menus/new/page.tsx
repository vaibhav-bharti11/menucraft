'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import type { Template } from '@/lib/types';

// 6 PRD-specified templates with their counter structures
const TEMPLATES: Template[] = [
  {
    id: 'standard-wedding',
    name: 'Standard Wedding (Dinner)',
    description: '~14 counters — Chaat, Sushi, Dimsum, Indian Mains, Biryani, 2 Desserts',
    guest_scale_label: '200–400 Pax',
    counter_count: 14,
    counters: [
      { counter_type_id: 'arrival-bites', display_name: 'Arrival Bites & Phera Welcome', display_name_print: 'ARRIVAL BITES & PHERA WELCOME', description: 'A curated selection of refined tea-time favourites and warm savouries to welcome guests with comfort and familiarity.', sections: [] },
      { counter_type_id: 'passed-hors', display_name: "Passed Hors D'Oeuvres", display_name_print: "PASSED HORS D'OEUVRES", description: 'An elegant parade of handcrafted small plates served warm on pass-around.', sections: [] },
      { counter_type_id: 'chaat-atelier', display_name: 'The Chaat Atelier (Live)', display_name_print: 'THE CHAAT ATELIER (LIVE)', description: 'A reimagined Indian street food experience, prepared live with precision and finesse.', sections: [] },
      { counter_type_id: 'sushi-bar', display_name: 'Kampai Signature Sushi Bar (Live)', display_name_print: 'KAMPAI SIGNATURE SUSHI BAR (LIVE)', description: 'Hand-rolled sushi prepared live, showcasing Japanese precision and premium ingredients.', sections: [] },
      { counter_type_id: 'dimsum-station', display_name: 'Kampai Dim Sum & Gyoza Station (Live)', display_name_print: 'KAMPAI DIM SUM & GYOZA STATION (LIVE)', description: 'Steamed and pan-seared dumplings crafted live.', sections: [] },
      { counter_type_id: 'galouti', display_name: 'Galouti Counter (Live)', display_name_print: 'GALOUTI COUNTER (LIVE)', description: 'Delicate galouti kebabs on mahi/copper tawa.', sections: [] },
      { counter_type_id: 'soups', display_name: 'Soups & Broths (Live)', display_name_print: 'SOUPS & BROTHS (LIVE)', description: 'Global and Indian soups served live.', sections: [] },
      { counter_type_id: 'salads', display_name: 'Seasonal Salads & Fresh Greens', display_name_print: 'SEASONAL SALADS & FRESH GREENS', description: 'Crisp greens, global salads, herb-forward compositions.', sections: [] },
      { counter_type_id: 'mains-indian', display_name: 'Mains — Indian', display_name_print: 'MAINS — INDIAN', description: 'Indian curry section — veg + non-veg.', sections: [] },
      { counter_type_id: 'papad-raita', display_name: 'Papad & Raita Bar', display_name_print: 'PAPAD & RAITA BAR', description: 'Papads, achaar, raitas — Indian accompaniments.', sections: [] },
      { counter_type_id: 'biryani', display_name: 'Hyderabadi Biryani & Rice Kitchen', display_name_print: 'HYDERABADI BIRYANI & RICE KITCHEN', description: 'Dum-cooked biryanis with traditional accompaniments.', sections: [] },
      { counter_type_id: 'roti', display_name: 'Artisan Roti & Breads (Live)', display_name_print: 'ARTISAN ROTI & BREADS (LIVE)', description: 'Tandoor and tawa breads live.', sections: [] },
      { counter_type_id: 'indian-dessert', display_name: 'Indian Dessert Atelier', display_name_print: 'INDIAN DESSERT ATELIER', description: 'Live Indian sweets — jalebi, kulfi, halwa, khurchan.', sections: [] },
      { counter_type_id: 'western-dessert', display_name: 'Western Patisserie & Dessert Bar', display_name_print: 'WESTERN PATISSERIE & DESSERT BAR', description: 'European pastry, cakes, churros live.', sections: [] },
    ],
  },
  {
    id: 'premium-wedding',
    name: 'Premium Wedding (Dinner)',
    description: '~22 counters — Above + Artisan Grazing, Awadhi, Pasta, Ramen',
    guest_scale_label: '500–800 Pax',
    counter_count: 22,
    counters: [],
  },
  {
    id: 'grand-wedding',
    name: 'Grand Wedding (Cocktail + Dinner)',
    description: '~28 counters — Full Mr. Suri-style with arrival bites + all live stations',
    guest_scale_label: '700–1500 Pax',
    counter_count: 28,
    counters: [],
  },
  {
    id: 'corporate-dinner',
    name: 'Corporate Dinner',
    description: '~10 counters — Lighter, Continental-focused, simpler Indian mains',
    guest_scale_label: '100–300 Pax',
    counter_count: 10,
    counters: [],
  },
  {
    id: 'cocktail-party',
    name: 'Cocktail Party (Standing)',
    description: '~10 counters — Heavy starters, no formal mains, 2 dessert counters',
    guest_scale_label: '150–350 Pax',
    counter_count: 10,
    counters: [],
  },
  {
    id: 'house-party',
    name: 'House Party',
    description: '~8 counters — Intimate, curated, Indian + Asian blend',
    guest_scale_label: '100–200 Pax',
    counter_count: 8,
    counters: [],
  },
];

export default function NewMenuPage() {
  const [selected, setSelected] = useState<Template | null>(null);
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  const handleCreate = async () => {
    setCreating(true);
    const counters = (selected?.counters ?? []).map((tc, i) => ({
      id: `counter-${Date.now()}-${i}`,
      counter_type_id: tc.counter_type_id,
      display_name: tc.display_name,
      display_name_print: tc.display_name_print,
      description: tc.description,
      accompaniments_label: null,
      accompaniments: null,
      sections: tc.sections,
    }));

    const res = await fetch('/api/menus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name: '',
        event_date: '',
        function_type: 'Dinner',
        guest_count: selected?.guest_scale_label ?? '',
        venue: '',
        requirements_note: 'Water proof Kitchen area with water & light',
        exclusions_note: 'Tenting related items\nFlorist',
        signed_by_name: 'Pranay Bahl',
        signed_by_phone: '9899004852',
        status: 'DRAFT',
        counters,
      }),
    });
    const menu = await res.json();
    router.push(`/menus/${menu.id}`);
  };

  return (
    <AppShell>
      <div className="p-8 max-w-4xl mx-auto animate-fade-in relative">
        {/* Ambient background glow */}
        <div className="absolute top-0 right-1/4 w-[400px] h-[250px] bg-[var(--crimson)]/5 rounded-full blur-[120px] pointer-events-none" />

        <div className="mb-8 relative z-10">
          <h1 className="font-display text-4xl font-semibold italic text-transparent bg-clip-text bg-gradient-to-r from-white via-white to-[var(--gold-light)] mb-2">
            New Menu
          </h1>
          <p className="text-[var(--text-grey)] text-sm">
            Select a template or start blank — you can add/remove counters anytime
          </p>
        </div>

        <div className="gold-rule mb-8" />

        <div className="grid grid-cols-2 gap-4 mb-8 relative z-10">
          {/* Blank option */}
          <button
            onClick={() => setSelected(null)}
            className={`card p-6 text-left transition-all duration-300 border-2 ${!selected ? 'border-[var(--gold)] bg-[var(--gold)]/[0.04] shadow-[0_0_20px_rgba(201,168,76,0.15)]' : 'border-white/5 hover:border-[var(--gold)]/30'}`}>
            <div className="text-3xl mb-4 text-[var(--gold)]">⊡</div>
            <div className="text-white text-base font-semibold mb-1">Start Blank</div>
            <div className="text-[var(--text-grey)] text-xs leading-relaxed">0 counters — build from scratch</div>
          </button>

          {TEMPLATES.map(t => (
            <button
              key={t.id}
              onClick={() => setSelected(t)}
              className={`card p-6 text-left transition-all duration-300 border-2 ${selected?.id === t.id ? 'border-[var(--gold)] bg-[var(--gold)]/[0.04] shadow-[0_0_20px_rgba(201,168,76,0.15)]' : 'border-white/5 hover:border-[var(--gold)]/30'}`}>
              <div className="flex items-start justify-between mb-2">
                <div className="text-white text-base font-semibold leading-snug">{t.name}</div>
                <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[var(--crimson)]/10 text-red-300 border border-[var(--crimson)]/20 whitespace-nowrap ml-2 font-mono font-semibold uppercase tracking-wider">
                  {t.counter_count} counters
                </span>
              </div>
              <div className="text-[var(--text-grey)] text-xs mb-3 leading-relaxed">{t.description}</div>
              <div className="text-[var(--gold-light)] text-[10px] font-semibold uppercase tracking-wider">{t.guest_scale_label}</div>
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between relative z-10">
          <button onClick={() => router.back()} className="btn-ghost flex items-center gap-1">
            <span>←</span>
            <span>Back</span>
          </button>
          <button onClick={handleCreate} disabled={creating}
            className="btn-primary px-8 disabled:opacity-50">
            {creating ? 'Creating…' : `Create Menu ${selected ? `— ${selected.name}` : '(Blank)'}`}
          </button>
        </div>
      </div>
    </AppShell>
  );
}
