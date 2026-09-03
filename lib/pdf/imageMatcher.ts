// lib/pdf/imageMatcher.ts
// Deterministic, local-only image matching engine.
// NO AI, NO external APIs, NO LLM calls, NO image generation, NO web downloads.
// Matches individual menu items and section dividers using a 7-Level Semantic Hierarchy.

import { IMAGE_REGISTRY } from './imageRegistry';
import type { MenuImageEntry } from './imageRegistry';

// ─── Deterministic Culinary Taxonomy & Synonym Dictionary ────────────────────

export type MatchLevel =
  | 'LEVEL 0 — Exact dish ID match'
  | 'LEVEL 1 — Exact dish'
  | 'LEVEL 2 — Strong dish/ingredient match'
  | 'LEVEL 3 — Primary ingredient/protein match'
  | 'LEVEL 4 — Preparation/cooking-method + ingredient match'
  | 'LEVEL 5 — Cuisine + category match'
  | 'LEVEL 6 — Safe category fallback'
  | 'LEVEL 7 — Text-only';

export type MatchConfidence = 'High' | 'Medium' | 'Low' | 'Safe fallback';

export interface CulinaryTaxonomy {
  family: string;
  substances: string[];
  preparations: string[];
  cuisines: string[];
  dietary: 'vegetarian' | 'non-vegetarian' | 'seafood' | 'unknown';
}

export const CULINARY_FAMILIES: Record<string, CulinaryTaxonomy> = {
  PANEER: {
    family: 'PANEER',
    substances: ['paneer', 'cottage-cheese', 'chenna'],
    preparations: ['tikka', 'kadhai', 'shahi', 'butter-masala', 'makhani', 'bhurji', 'pasanda', 'lababdar'],
    cuisines: ['indian', 'north-indian', 'punjabi', 'mughlai'],
    dietary: 'vegetarian',
  },
  CHICKEN: {
    family: 'CHICKEN',
    substances: ['chicken', 'murgh', 'murg', 'poultry', 'tikka', 'tangdi', 'kebab'],
    preparations: ['butter-chicken', 'curry', 'korma', 'tikka-masala', 'roast', 'tandoori', 'biryani'],
    cuisines: ['indian', 'north-indian', 'mughlai', 'punjabi'],
    dietary: 'non-vegetarian',
  },
  MUTTON: {
    family: 'MUTTON',
    substances: ['mutton', 'gosht', 'lamb', 'meat', 'boti', 'seekh'],
    preparations: ['rogan-josh', 'korma', 'nihari', 'galouti', 'shammi', 'keema', 'curry', 'biryani'],
    cuisines: ['indian', 'mughlai', 'awadhi', 'kashmiri'],
    dietary: 'non-vegetarian',
  },
  FISH: {
    family: 'FISH',
    substances: ['fish', 'machli', 'pomfret', 'salmon', 'tuna', 'sole', 'surmai', 'rawas', 'cod', 'snapper'],
    preparations: ['curry', 'tandoori', 'grilled', 'fried', 'steamed', 'pan-seared', 'rava-fry', 'koliwada'],
    cuisines: ['indian', 'south-indian', 'kerala', 'goan', 'bengali', 'continental'],
    dietary: 'seafood',
  },
  SEAFOOD: {
    family: 'SEAFOOD',
    substances: ['prawn', 'shrimp', 'jhinga', 'crab', 'lobster', 'squid', 'calamari'],
    preparations: ['curry', 'tandoori', 'grilled', 'butter-garlic', 'tempura'],
    cuisines: ['indian', 'coastal', 'asian', 'continental'],
    dietary: 'seafood',
  },
  BIRYANI: {
    family: 'BIRYANI',
    substances: ['biryani', 'dum-biryani', 'pulao', 'pilaf', 'rice'],
    preparations: ['dum', 'handi', 'dastarkhwan', 'awadhi', 'hyderabadi', 'lucknowi'],
    cuisines: ['indian', 'mughlai', 'awadhi', 'hyderabadi'],
    dietary: 'unknown',
  },
  DAL: {
    family: 'DAL',
    substances: ['dal', 'daal', 'makhani', 'lentil', 'urad', 'chana-dal', 'toor-dal', 'moong-dal'],
    preparations: ['makhani', 'tadka', 'fry', 'slow-cooked', 'bukhara'],
    cuisines: ['indian', 'north-indian', 'punjabi'],
    dietary: 'vegetarian',
  },
  DESSERT: {
    family: 'DESSERT',
    substances: ['dessert', 'sweet', 'mithai', 'gulab-jamun', 'jamun', 'rasmalai', 'rasgulla', 'halwa', 'kheer', 'kulfi', 'jalebi', 'phirni', 'cake', 'pastry', 'pudding', 'ice-cream'],
    preparations: ['syrup', 'rabri', 'baked', 'steamed', 'frozen'],
    cuisines: ['indian', 'continental', 'french'],
    dietary: 'vegetarian',
  },
  SUSHI: {
    family: 'SUSHI',
    substances: ['sushi', 'sashimi', 'nigiri', 'maki', 'uramaki', 'temaki', 'norimaki'],
    preparations: ['raw', 'roll', 'platter', 'seared'],
    cuisines: ['japanese', 'asian'],
    dietary: 'seafood',
  },
  SAMOSA: {
    family: 'SAMOSA',
    substances: ['samosa', 'chaat', 'snack', 'pakoda', 'pakora', 'kachori'],
    preparations: ['fried', 'crisp', 'stuffed'],
    cuisines: ['indian', 'north-indian'],
    dietary: 'vegetarian',
  },
  SANDWICH: {
    family: 'SANDWICH',
    substances: ['sandwich', 'canapes', 'bread', 'toast', 'crostini', 'sub', 'panini', 'bruschetta'],
    preparations: ['layered', 'grilled', 'toasted', 'crustless'],
    cuisines: ['continental', 'western'],
    dietary: 'unknown',
  },
  PASTA: {
    family: 'PASTA',
    substances: ['pasta', 'spaghetti', 'penne', 'fusilli', 'ravioli', 'linguine', 'fettuccine', 'lasagna', 'gnocchi'],
    preparations: ['arrabbiata', 'alfredo', 'carbonara', 'pesto', 'aglio-e-olio', 'baked'],
    cuisines: ['italian', 'continental'],
    dietary: 'unknown',
  },
  PIZZA: {
    family: 'PIZZA',
    substances: ['pizza', 'neapolitan', 'margherita', 'flatbread', 'calzone'],
    preparations: ['wood-fired', 'stone-baked', 'thin-crust'],
    cuisines: ['italian', 'continental'],
    dietary: 'unknown',
  },
};

// Generic filler words that MUST NOT be treated as major culinary matches
const STOP_WORDS = new Set([
  'and', 'with', 'in', 'on', 'of', 'the', 'a', 'an', 'for', 'our', 'special',
  'fresh', 'style', 'assorted', 'size', 'bite', 'bites', 'selection', 'platter',
  'choice', 'classic', 'supreme', 'deluxe', 'signature', 'traditional', 'royal',
  'handcrafted', 'artisanal', 'crisp', 'crispy', 'mini', 'small', 'welcoming',
  'welcome', 'arrival', 'prelude', 'house', 'served', 'alongside', 'topped',
  'morsels', 'skewers', 'delight', 'medley', 'trio', 'duo', 'bites', 'plate'
]);

// ─── Text Normalisation ───────────────────────────────────────────────────────

export function normalizeMenuText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // strip accents
    .replace(/[^a-z0-9\s]/g, ' ')      // replace punctuation with space
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Tokenise unexpanded raw keywords
 */
export function extractRawTokens(text: string): string[] {
  const norm = normalizeMenuText(text);
  return norm.split(' ').filter(t => t.length > 1 && !STOP_WORDS.has(t));
}

/**
 * Infer the culinary family of a dish from its name, description, and metadata
 */
export function inferDishFamily(itemName: string, description = '', dietary = ''): string {
  const norm = `${normalizeMenuText(itemName)} ${normalizeMenuText(description)} ${normalizeMenuText(dietary)}`;
  const tokens = extractRawTokens(norm);

  // Direct keyword matching against taxonomy families
  if (tokens.some(t => ['paneer', 'cottage'].includes(t))) return 'PANEER';
  if (tokens.some(t => ['butter', 'murgh', 'murg', 'chicken', 'poultry'].includes(t)) && !tokens.includes('paneer')) return 'CHICKEN';
  if (tokens.some(t => ['biryani', 'dum-biryani'].includes(t))) return 'BIRYANI';
  if (tokens.some(t => ['dal', 'daal', 'makhani', 'lentil', 'urad'].includes(t))) return 'DAL';
  if (tokens.some(t => ['gulab', 'jamun', 'rasmalai', 'rasgulla', 'kheer', 'halwa', 'kulfi', 'jalebi', 'phirni', 'mithai', 'dessert', 'sweet'].includes(t))) return 'DESSERT';
  if (tokens.some(t => ['sushi', 'sashimi', 'nigiri', 'maki', 'uramaki'].includes(t))) return 'SUSHI';
  if (tokens.some(t => ['pomfret', 'fish', 'machli', 'salmon', 'tuna', 'sole', 'surmai', 'rawas', 'cod'].includes(t))) return 'FISH';
  if (tokens.some(t => ['prawn', 'shrimp', 'jhinga', 'crab', 'lobster', 'seafood'].includes(t))) return 'SEAFOOD';
  if (tokens.some(t => ['mutton', 'gosht', 'lamb', 'nihari', 'galouti', 'shammi', 'rogan', 'josh'].includes(t))) return 'MUTTON';
  if (tokens.some(t => ['samosa', 'chaat', 'pakoda', 'pakora', 'kachori'].includes(t))) return 'SAMOSA';
  if (tokens.some(t => ['sandwich', 'canape', 'canapes', 'crostini', 'toast', 'panini', 'bruschetta'].includes(t))) return 'SANDWICH';
  if (tokens.some(t => ['pasta', 'spaghetti', 'penne', 'fusilli', 'ravioli', 'linguine', 'fettuccine', 'arrabbiata', 'alfredo'].includes(t))) return 'PASTA';
  if (tokens.some(t => ['pizza', 'neapolitan', 'margherita', 'flatbread', 'calzone'].includes(t))) return 'PIZZA';

  return 'GENERAL';
}

// ─── Query Interfaces ─────────────────────────────────────────────────────────

export interface MenuItemMatchQuery {
  dishId?: string;
  itemName: string;
  description?: string;
  category?: string | string[];
  cuisine?: string | string[];
  dietary?: string;            // 'VEG', 'NON_VEG', 'vegetarian', 'non-vegetarian', 'seafood'
  sectionName?: string;
  counterName?: string;
}

export interface SectionMatchQuery {
  counterName: string;
  description?: string;
  /** Course/category hints (e.g. ['starter', 'welcome-bites']) */
  categoryHints?: string[];
  cuisineHints?: string[];
  /** Explicit suitableFor tag hints — same as categoryHints when omitted */
  suitableForHints?: string[];
}

export interface MenuItemEvaluation {
  entry: MenuImageEntry | null;
  score: number;
  matchLevel: MatchLevel;
  matchReason: string;
  confidence: MatchConfidence;
}

// ─── 7-Level Semantic Evaluator ───────────────────────────────────────────────

/**
 * Evaluates an individual registry image against a menu item query
 * using strict hierarchical level classification and hard isolation boundaries.
 */
export function evaluateItemAgainstEntry(
  entry: MenuImageEntry,
  item: MenuItemMatchQuery
): { score: number; level: MatchLevel; reason: string; confidence: MatchConfidence } {
  // ─── LEVEL 0: EXACT DISH ID MATCH (Highest Priority) ────────────────────────
  if (item.dishId) {
    if (entry.dishId === item.dishId || entry.id === item.dishId) {
      return {
        score: 500,
        level: 'LEVEL 0 — Exact dish ID match',
        reason: `Direct dish ID match ("${item.dishId}")`,
        confidence: 'High'
      };
    }
  }

  const normDish = normalizeMenuText(item.itemName);
  const normEntryName = normalizeMenuText(entry.name);
  const dishTokens = [...extractRawTokens(item.itemName), ...(item.description ? extractRawTokens(item.description) : [])];
  const entryKeywords = entry.keywords.map(k => normalizeMenuText(k));
  const entryNameTokens = extractRawTokens(entry.name);

  const dishFamily = inferDishFamily(item.itemName, item.description, item.dietary);
  const entryFamily = entry.family || inferDishFamily(entry.name);

  const normDietary = (item.dietary || '').toLowerCase();
  const isDishVeg = normDietary === 'veg' || normDietary === 'vegetarian';
  const isDishNonVeg = normDietary === 'non_veg' || normDietary === 'non-veg' || normDietary === 'non-vegetarian';
  const isDishSeafood = normDietary === 'seafood' || dishFamily === 'FISH' || dishFamily === 'SEAFOOD';

  // ─── HARD ISOLATION GUARDS (Negative Constraints) ───────────────────────────
  // Negative Case 1: Vegetarian dish assigned Non-Veg / Seafood image
  if (isDishVeg && (entry.dietary === 'non-vegetarian' || entry.dietary === 'seafood')) {
    return { score: -500, level: 'LEVEL 7 — Text-only', reason: 'Vegetarian dish cannot use non-veg/seafood image', confidence: 'Safe fallback' };
  }

  // Negative Case 2: Non-Veg / Seafood dish assigned Vegetarian image
  if ((isDishNonVeg || isDishSeafood) && entry.dietary === 'vegetarian') {
    return { score: -500, level: 'LEVEL 7 — Text-only', reason: 'Non-veg/seafood dish cannot use vegetarian image', confidence: 'Safe fallback' };
  }

  // Negative Case 3: Seafood (Fish / Pomfret / Prawn) assigned Poultry / Red Meat (Chicken / Mutton)
  if (isDishSeafood && (entryFamily === 'CHICKEN' || entryFamily === 'MUTTON')) {
    return { score: -500, level: 'LEVEL 7 — Text-only', reason: 'Seafood dish cannot use chicken/mutton image', confidence: 'Safe fallback' };
  }

  // Negative Case 4: Poultry / Red Meat assigned Seafood
  if ((dishFamily === 'CHICKEN' || dishFamily === 'MUTTON') && (entry.dietary === 'seafood' || entryFamily === 'SUSHI' || entryFamily === 'FISH')) {
    return { score: -500, level: 'LEVEL 7 — Text-only', reason: 'Meat dish cannot use seafood/sushi image', confidence: 'Safe fallback' };
  }

  // Negative Case 5: Sushi / Japanese isolation
  const isDishSushi = dishFamily === 'SUSHI' || dishTokens.some(t => ['sushi', 'sashimi', 'nigiri', 'maki', 'uramaki', 'japanese'].includes(t));
  const isEntrySushi = entryFamily === 'SUSHI' || entry.cuisine.includes('japanese');
  if (isDishSushi !== isEntrySushi) {
    return { score: -500, level: 'LEVEL 7 — Text-only', reason: 'Sushi/Japanese items strictly isolated from non-Japanese dishes', confidence: 'Safe fallback' };
  }

  // Negative Case 6: Dessert vs Savory isolation
  const isDishDessert = dishFamily === 'DESSERT';
  const isEntryDessert = entryFamily === 'DESSERT' || entry.category.includes('dessert');
  if (isDishDessert !== isEntryDessert) {
    return { score: -500, level: 'LEVEL 7 — Text-only', reason: 'Dessert items strictly isolated from savory dishes', confidence: 'Safe fallback' };
  }

  // Negative Case 7: Western / Continental (Sandwich, Pasta, Pizza) assigned Indian Curries/Rice
  const isDishWestern = dishFamily === 'SANDWICH' || dishFamily === 'PASTA' || dishFamily === 'PIZZA';
  const isEntryIndian = entry.cuisine.some(c => ['indian', 'north-indian', 'mughlai', 'punjabi', 'awadhi'].includes(c));
  if (isDishWestern && isEntryIndian) {
    return { score: -500, level: 'LEVEL 7 — Text-only', reason: 'Western/Italian dishes cannot use Indian curry/rice image', confidence: 'Safe fallback' };
  }

  // ─── HIERARCHICAL MATCHING LEVELS ───────────────────────────────────────────

  // LEVEL 1: Exact Dish Match (Score >= 300)
  // Complete name equivalence or exact canonical identity
  if (normDish === normEntryName) {
    return {
      score: 350,
      level: 'LEVEL 1 — Exact dish',
      reason: `Exact full dish name match ("${entry.name}")`,
      confidence: 'High'
    };
  }

  const allEntryNameTokensInDish = entryNameTokens.every(et => dishTokens.includes(et) || normDish.includes(et));
  if (allEntryNameTokensInDish && entryNameTokens.length >= 2) {
    return {
      score: 310,
      level: 'LEVEL 1 — Exact dish',
      reason: `Canonical dish name fully contained in "${item.itemName}"`,
      confidence: 'High'
    };
  }

  // LEVEL 2: Strong Dish / Compound Match (Score 200 - 299)
  // Shared family + primary ingredient match + preparation style
  if (dishFamily === entryFamily && dishFamily !== 'GENERAL') {
    let keywordOverlapCount = 0;
    for (const dt of dishTokens) {
      if (entryKeywords.includes(dt)) keywordOverlapCount++;
    }

    if (keywordOverlapCount >= 2 || (keywordOverlapCount >= 1 && entryNameTokens.some(et => dishTokens.includes(et)))) {
      const score = 250 + (keywordOverlapCount * 10);
      return {
        score,
        level: 'LEVEL 2 — Strong dish/ingredient match',
        reason: `Shared ${dishFamily} family with matching ingredients & preparation in "${entry.name}"`,
        confidence: 'High'
      };
    }
  }

  // LEVEL 3: Primary Ingredient / Protein Family Match (Score 120 - 199)
  // Shared primary substance without conflict (e.g. Chicken dish -> Butter Chicken, Paneer dish -> Paneer Tikka)
  if (dishFamily === entryFamily && dishFamily !== 'GENERAL') {
    const hasFamilyKeyword = dishTokens.some(dt => entryKeywords.includes(dt));
    if (hasFamilyKeyword) {
      return {
        score: 150,
        level: 'LEVEL 3 — Primary ingredient/protein match',
        reason: `Primary ${dishFamily} protein/substance alignment with "${entry.name}"`,
        confidence: 'Medium'
      };
    }
  }

  // LEVEL 4: Preparation / Cooking-Method + Compatible Ingredient Match (Score 80 - 119)
  const sharedPrep = dishTokens.filter(dt => ['tikka', 'tandoori', 'kebab', 'curry', 'gravy', 'dum', 'biryani', 'roast', 'grilled'].includes(dt) && entryKeywords.includes(dt));
  if (sharedPrep.length > 0 && ((isDishVeg && entry.dietary === 'vegetarian') || (isDishNonVeg && entry.dietary === 'non-vegetarian'))) {
    return {
      score: 95,
      level: 'LEVEL 4 — Preparation/cooking-method + ingredient match',
      reason: `Shared preparation style (${sharedPrep.join(', ')}) with compatible dietary profile`,
      confidence: 'Medium'
    };
  }

  // LEVEL 5: Cuisine + Category Match (Score 50 - 79)
  const itemCuisines = item.cuisine ? (Array.isArray(item.cuisine) ? item.cuisine : [item.cuisine]).map(c => c.toLowerCase()) : [];
  const itemCategories = item.category ? (Array.isArray(item.category) ? item.category : [item.category]).map(c => c.toLowerCase()) : [];
  
  const hasCuisineMatch = itemCuisines.some(ic => entry.cuisine.map(c => c.toLowerCase()).includes(ic));
  const hasCategoryMatch = itemCategories.some(ic => entry.category.map(c => c.toLowerCase()).includes(ic));

  if (hasCuisineMatch && hasCategoryMatch && ((isDishVeg && entry.dietary === 'vegetarian') || (isDishNonVeg && entry.dietary === 'non-vegetarian') || (isDishSeafood && entry.dietary === 'seafood'))) {
    return {
      score: 65,
      level: 'LEVEL 5 — Cuisine + category match',
      reason: `Cuisine & course category match with "${entry.name}"`,
      confidence: 'Medium'
    };
  }

  // LEVEL 6: Safe Category Fallback (Score 35 - 49)
  if (hasCategoryMatch && ((isDishVeg && entry.dietary === 'vegetarian') || (isDishNonVeg && entry.dietary === 'non-vegetarian'))) {
    return {
      score: 40,
      level: 'LEVEL 6 — Safe category fallback',
      reason: `Course category fallback with "${entry.name}"`,
      confidence: 'Low'
    };
  }

  // LEVEL 7: Text-Only (Score < 35)
  return {
    score: 0,
    level: 'LEVEL 7 — Text-only',
    reason: 'No sufficiently relevant local image in library',
    confidence: 'Safe fallback'
  };
}

// ─── Deduplication Tracker ───────────────────────────────────────────────────

export type UsedImageTracker = Set<string>;

export function createUsedImageTracker(): UsedImageTracker {
  return new Set<string>();
}

export function isImageUsed(entry: MenuImageEntry, tracker: UsedImageTracker): boolean {
  return tracker.has(entry.id);
}

export function markUsed(entry: MenuImageEntry, tracker: UsedImageTracker): void {
  tracker.add(entry.id);
}

// ─── Public Matchers ─────────────────────────────────────────────────────────

/**
 * Evaluates and returns full matching metadata for an individual dish
 */
export function evaluateMenuItemMatch(
  item: MenuItemMatchQuery,
  usedIds: UsedImageTracker = new Set(),
  minScore = 35
): MenuItemEvaluation {
  const evaluations = IMAGE_REGISTRY.map(entry => {
    const res = evaluateItemAgainstEntry(entry, item);
    return {
      entry,
      score: res.score,
      level: res.level,
      reason: res.reason,
      confidence: res.confidence,
      isUsed: usedIds.has(entry.id)
    };
  });

  // Filter out any negative scores (hard disqualifications) or below confidence threshold
  const candidates = evaluations.filter(e => e.score >= minScore && e.entry.isValidQuality !== false);

  if (candidates.length === 0) {
    return {
      entry: null,
      score: 0,
      matchLevel: 'LEVEL 7 — Text-only',
      matchReason: 'No sufficiently relevant local asset in library',
      confidence: 'Safe fallback'
    };
  }

  // Prefer unused images if both are high score, but Semantic Correctness > Deduplication
  candidates.sort((a, b) => {
    // If scores differ significantly (e.g. >= 40 points), higher semantic score always wins
    if (Math.abs(a.score - b.score) >= 40) {
      return b.score - a.score;
    }
    // If scores are comparable, prefer unused
    if (a.isUsed !== b.isUsed) {
      return a.isUsed ? 1 : -1;
    }
    return b.score - a.score;
  });

  const best = candidates[0];
  return {
    entry: best.entry,
    score: best.score,
    matchLevel: best.level,
    matchReason: best.reason,
    confidence: best.confidence
  };
}

/**
 * Find the best matching image for an individual menu item.
 * Strictly respects confidence threshold (minScore = 35 default).
 * If no semantically valid image exists in local registry, returns null.
 */
export function findBestMenuItemImage(
  item: MenuItemMatchQuery,
  usedIds: UsedImageTracker = new Set(),
  minScore = 35
): MenuImageEntry | null {
  const result = evaluateMenuItemMatch(item, usedIds, minScore);
  return result.entry;
}

/**
 * Find the best matching section hero image for a section divider / curation cover page.
 */
export function findBestSectionImage(
  section: SectionMatchQuery,
  usedIds: UsedImageTracker = new Set()
): MenuImageEntry | null {
  const normName = normalizeMenuText(section.counterName);
  const normDesc = normalizeMenuText(section.description || '');
  const combined = `${normName} ${normDesc}`;
  const tokens = extractRawTokens(combined);

  const scored = IMAGE_REGISTRY.map(entry => {
    let score = 0;
    const entryTokens = entry.keywords.map(k => normalizeMenuText(k));

    // Section title keyword overlap
    for (const t of tokens) {
      if (entryTokens.includes(t)) score += 30;
    }

    // Suitable for tags (fall back to categoryHints when suitableForHints is absent)
    const suitableHints = section.suitableForHints ?? section.categoryHints ?? [];
    for (const sf of suitableHints) {
      if (entry.suitableFor.includes(sf)) score += 20;
    }

    // Cuisine hints
    if (section.cuisineHints) {
      for (const ch of section.cuisineHints) {
        if (entry.cuisine.includes(ch)) score += 15;
      }
    }

    // Japanese Section Guard
    const isJapaneseSec = tokens.some(t => ['japanese', 'sushi', 'teppan', 'robata', 'asian', 'oriental'].includes(t));
    const isJapaneseImg = entry.cuisine.includes('japanese') || entry.family === 'SUSHI';
    if (isJapaneseSec && isJapaneseImg) score += 80;
    if (!isJapaneseSec && isJapaneseImg) score -= 100;
    if (isJapaneseSec && !isJapaneseImg) score -= 100;

    // Dessert Section Guard
    const isDessertSec = tokens.some(t => ['dessert', 'sweet', 'mithai', 'patisserie', 'confection', 'symphony'].includes(t));
    const isDessertImg = entry.family === 'DESSERT' || entry.category.includes('dessert');
    if (isDessertSec && isDessertImg) score += 80;
    if (!isDessertSec && isDessertImg) score -= 100;
    if (isDessertSec && !isDessertImg) score -= 100;

    // Biryani Section Alignment
    if (tokens.includes('biryani') && entry.family === 'BIRYANI') score += 70;
    // Awadhi / Mughlai Section Alignment
    if (tokens.some(t => ['awadhi', 'mughlai', 'royal', 'nawabi'].includes(t)) && (entry.family === 'CHICKEN' || entry.family === 'DAL')) score += 40;
    // Tandoor / Starter Section Alignment
    if (tokens.some(t => ['tandoor', 'starter', 'canapes', 'phera', 'arrival'].includes(t)) && (entry.family === 'PANEER' || entry.family === 'CHICKEN')) score += 35;

    return {
      entry,
      score,
      isUsed: usedIds.has(entry.id)
    };
  });

  const valid = scored.filter(s => s.score > 20 && s.entry.isValidQuality !== false);
  if (valid.length === 0) return null;

  valid.sort((a, b) => {
    if (Math.abs(a.score - b.score) >= 30) return b.score - a.score;
    if (a.isUsed !== b.isUsed) return a.isUsed ? 1 : -1;
    return b.score - a.score;
  });

  return valid[0].entry;
}

// ─── Backward-Compat Aliases (used by premiumClassic.ts) ─────────────────────

/**
 * Alias: createUsedTracker → createUsedImageTracker
 * Kept for backward-compat with premiumClassic.ts
 */
export const createUsedTracker = createUsedImageTracker;

/**
 * Selects a cover / hero image for the overall proposal cover page.
 * Uses the function type (e.g. "wedding", "corporate") and the full library
 * to find the most photogenic suitable image.
 * Falls back to the highest-scoring image in the library (excluding dessert/sushi).
 */
export function findHeroImage(
  functionType: string,
  usedIds: UsedImageTracker = new Set()
): MenuImageEntry | null {
  const norm = (functionType || '').toLowerCase();
  const scored = IMAGE_REGISTRY.map(entry => {
    let score = 0;
    // Sushi platter is great for hero (elegant, colourful)
    if (entry.family === 'SUSHI') score += 50;
    // Biryani is a strong hero for weddings / Indian events
    if (entry.family === 'BIRYANI' && /wedding|reception|shaadi|banquet/.test(norm)) score += 70;
    // Butter chicken / Dal Makhani work as hero for generic Indian corporate events
    if ((entry.family === 'CHICKEN' || entry.family === 'DAL') && /corporate|conference|gala/.test(norm)) score += 40;
    // Paneer Tikka works well as a generic Indian starter hero
    if (entry.family === 'PANEER') score += 30;
    // Dessert images are poor cover heroes (too sweet, low drama)
    if (entry.family === 'DESSERT') score -= 60;
    // Prefer unused
    if (!usedIds.has(entry.id)) score += 15;
    return { entry, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const best = scored[0];
  return best && best.score > 0 ? best.entry : null;
}

/**
 * Backward-compat alias: findCounterImage used by modern.ts.
 * Maps counter name + category hints to findBestSectionImage.
 */
export function findCounterImage(
  counterName: string,
  categoryHints: string[] = [],
  cuisineHints: string[] = [],
  usedIds: UsedImageTracker = new Set()
): MenuImageEntry | null {
  return findBestSectionImage({ counterName, categoryHints, cuisineHints }, usedIds);
}

/**
 * Backward-compat alias: findBestMenuImage used by modern.ts.
 * Equivalent to findBestMenuItemImage.
 */
export function findBestMenuImage(
  item: MenuItemMatchQuery,
  usedIds: UsedImageTracker = new Set()
): MenuImageEntry | null {
  return findBestMenuItemImage(item, usedIds);
}

const ImageMatcher = {
  findBestMenuItemImage,
  findBestMenuImage,
  findBestSectionImage,
  findHeroImage,
  findCounterImage,
  evaluateMenuItemMatch,
  createUsedImageTracker,
  createUsedTracker,
  isImageUsed,
  markUsed,
};

export default ImageMatcher;

