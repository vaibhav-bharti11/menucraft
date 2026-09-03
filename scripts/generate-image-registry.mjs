#!/usr/bin/env node
// scripts/generate-image-registry.mjs
// Scans public/menu-images/ (manual) and public/menu-images/generated/ (generated)
// Links with data/dish-image-metadata.json and data/seed/dishes.json
// Generates lib/pdf/imageRegistry.ts

import { readdirSync, writeFileSync, readFileSync, existsSync, mkdirSync, statSync } from 'fs';
import { join, extname, basename, relative } from 'path';

const MANUAL_IMAGE_DIR = join(process.cwd(), 'public', 'menu-images');
const GENERATED_IMAGE_DIR = join(process.cwd(), 'public', 'menu-images', 'generated');
const METADATA_FILE = join(process.cwd(), 'data', 'dish-image-metadata.json');
const DISHES_FILE = join(process.cwd(), 'data', 'seed', 'dishes.json');
const OUTPUT_FILE = join(process.cwd(), 'lib', 'pdf', 'imageRegistry.ts');
const SUPPORTED_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.avif', '.svg'];

// Ensure directories exist
if (!existsSync(MANUAL_IMAGE_DIR)) mkdirSync(MANUAL_IMAGE_DIR, { recursive: true });
if (!existsSync(GENERATED_IMAGE_DIR)) mkdirSync(GENERATED_IMAGE_DIR, { recursive: true });

// Load dishes database for canonical mapping
let dishesMapById = new Map();
let dishesMapByNorm = new Map();
if (existsSync(DISHES_FILE)) {
  try {
    const dishes = JSON.parse(readFileSync(DISHES_FILE, 'utf-8'));
    for (const d of dishes) {
      dishesMapById.set(d.id, d);
      const norm = d.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
      dishesMapByNorm.set(norm, d);
    }
  } catch (err) {
    console.warn('Could not read dishes.json:', err.message);
  }
}

// Load metadata tracking file
let metadataStore = {};
if (existsSync(METADATA_FILE)) {
  try {
    metadataStore = JSON.parse(readFileSync(METADATA_FILE, 'utf-8'));
  } catch (err) {
    console.warn('Could not read dish-image-metadata.json:', err.message);
  }
}

// ─── Deterministic Culinary Rules ─────────────────────────────────────────────

const KEYWORD_RULES = {
  // PANEER & VEG STARTERS
  'paneer': { family: 'PANEER', category: ['starter', 'main-course'], cuisine: ['indian', 'north-indian'], dietary: 'vegetarian', suitableFor: ['starter', 'indian-counter', 'mughlai-counter', 'live-counter'] },
  'tikka': { category: ['starter'], cuisine: ['indian', 'north-indian', 'mughlai'], dietary: 'unknown', suitableFor: ['starter', 'live-counter', 'tandoor-counter'] },
  'tandoori': { category: ['starter', 'live-counter'], cuisine: ['indian', 'north-indian', 'punjabi'], dietary: 'unknown', suitableFor: ['live-counter', 'tandoor-counter', 'starter'] },
  'kebab': { category: ['starter', 'live-counter'], cuisine: ['indian', 'mughlai', 'awadhi'], dietary: 'unknown', suitableFor: ['starter', 'live-counter', 'mughlai-counter'] },
  'seekh': { category: ['starter', 'live-counter'], cuisine: ['indian', 'mughlai'], dietary: 'non-vegetarian', suitableFor: ['live-counter', 'mughlai-counter', 'starter'] },
  'galouti': { category: ['starter'], cuisine: ['mughlai', 'awadhi'], dietary: 'non-vegetarian', suitableFor: ['mughlai-counter', 'starter'] },
  'shammi': { category: ['starter'], cuisine: ['mughlai', 'awadhi'], dietary: 'non-vegetarian', suitableFor: ['mughlai-counter'] },
  'samosa': { family: 'SAMOSA', category: ['starter', 'snack', 'chaat'], cuisine: ['indian', 'north-indian'], dietary: 'vegetarian', suitableFor: ['starter', 'chaat-counter', 'welcome-bites'] },
  'sandwich': { family: 'SANDWICH', category: ['starter', 'snack', 'canapes'], cuisine: ['continental', 'western'], dietary: 'unknown', suitableFor: ['welcome-bites', 'starter'] },
  'chaat': { category: ['starter', 'chaat'], cuisine: ['indian', 'north-indian'], dietary: 'vegetarian', suitableFor: ['chaat-counter', 'starter', 'welcome-bites'] },
  'pakoda': { category: ['starter', 'snack'], cuisine: ['indian'], dietary: 'vegetarian', suitableFor: ['starter'] },
  'pakora': { category: ['starter', 'snack'], cuisine: ['indian'], dietary: 'vegetarian', suitableFor: ['starter'] },
  'aloo': { category: ['starter', 'main-course'], cuisine: ['indian'], dietary: 'vegetarian', suitableFor: ['starter', 'indian-counter'] },
  'gobi': { category: ['starter', 'main-course'], cuisine: ['indian'], dietary: 'vegetarian', suitableFor: ['indian-counter'] },
  'soup': { category: ['soup', 'starter'], cuisine: [], dietary: 'unknown', suitableFor: ['soup-counter', 'starter'] },
  'shorba': { category: ['soup', 'starter'], cuisine: ['indian', 'mughlai'], dietary: 'unknown', suitableFor: ['soup-counter'] },

  // MAIN COURSE — CURRIES & GRAVIES
  'curry': { category: ['main-course'], cuisine: [], dietary: 'unknown', suitableFor: ['main-course', 'indian-counter'] },
  'makhani': { family: 'DAL', category: ['main-course'], cuisine: ['indian', 'north-indian', 'punjabi'], dietary: 'vegetarian', suitableFor: ['indian-counter', 'main-course'] },
  'masala': { category: ['main-course'], cuisine: ['indian'], dietary: 'unknown', suitableFor: ['indian-counter', 'main-course'] },
  'shahi': { category: ['main-course'], cuisine: ['mughlai', 'indian'], dietary: 'unknown', suitableFor: ['mughlai-counter', 'main-course'] },
  'mughlai': { category: ['main-course'], cuisine: ['mughlai', 'awadhi'], dietary: 'unknown', suitableFor: ['mughlai-counter'] },
  'awadhi': { category: ['main-course'], cuisine: ['awadhi', 'mughlai'], dietary: 'unknown', suitableFor: ['mughlai-counter', 'awadhi-counter'] },
  'korma': { category: ['main-course'], cuisine: ['mughlai', 'awadhi'], dietary: 'non-vegetarian', suitableFor: ['mughlai-counter'] },
  'rogan': { family: 'MUTTON', category: ['main-course'], cuisine: ['kashmiri', 'indian'], dietary: 'non-vegetarian', suitableFor: ['mughlai-counter'] },
  'josh': { family: 'MUTTON', category: ['main-course'], cuisine: ['kashmiri'], dietary: 'non-vegetarian', suitableFor: ['mughlai-counter'] },
  'dal': { family: 'DAL', category: ['main-course', 'accompaniment'], cuisine: ['indian', 'north-indian'], dietary: 'vegetarian', suitableFor: ['indian-counter', 'main-course'] },
  'tadka': { category: ['main-course'], cuisine: ['indian'], dietary: 'vegetarian', suitableFor: ['indian-counter'] },

  // PROTEINS & SEAFOOD
  'chicken': { family: 'CHICKEN', category: ['starter', 'main-course'], cuisine: ['indian'], dietary: 'non-vegetarian', suitableFor: ['non-veg-counter', 'main-course'] },
  'butter': { category: ['main-course'], cuisine: ['indian', 'punjabi', 'north-indian'], dietary: 'unknown', suitableFor: ['indian-counter', 'main-course'] },
  'murgh': { family: 'CHICKEN', category: ['main-course', 'starter'], cuisine: ['indian', 'mughlai'], dietary: 'non-vegetarian', suitableFor: ['mughlai-counter', 'non-veg-counter'] },
  'murg': { family: 'CHICKEN', category: ['main-course', 'starter'], cuisine: ['indian', 'mughlai'], dietary: 'non-vegetarian', suitableFor: ['mughlai-counter', 'non-veg-counter'] },
  'gosht': { family: 'MUTTON', category: ['main-course'], cuisine: ['mughlai', 'indian'], dietary: 'non-vegetarian', suitableFor: ['mughlai-counter', 'non-veg-counter'] },
  'lamb': { family: 'MUTTON', category: ['main-course', 'starter'], cuisine: [], dietary: 'non-vegetarian', suitableFor: ['non-veg-counter', 'main-course'] },
  'mutton': { family: 'MUTTON', category: ['main-course', 'starter'], cuisine: ['indian', 'mughlai'], dietary: 'non-vegetarian', suitableFor: ['mughlai-counter', 'non-veg-counter'] },
  'fish': { family: 'FISH', category: ['starter', 'main-course', 'seafood'], cuisine: [], dietary: 'seafood', suitableFor: ['seafood-counter', 'starter', 'main-course'] },
  'pomfret': { family: 'FISH', category: ['starter', 'main-course', 'seafood'], cuisine: ['indian', 'seafood'], dietary: 'seafood', suitableFor: ['seafood-counter', 'starter'] },
  'machli': { family: 'FISH', category: ['main-course', 'starter', 'seafood'], cuisine: ['indian'], dietary: 'seafood', suitableFor: ['seafood-counter'] },
  'prawn': { family: 'SEAFOOD', category: ['starter', 'main-course', 'seafood'], cuisine: [], dietary: 'seafood', suitableFor: ['seafood-counter', 'starter'] },
  'shrimp': { family: 'SEAFOOD', category: ['starter', 'main-course', 'seafood'], cuisine: [], dietary: 'seafood', suitableFor: ['seafood-counter'] },
  'seafood': { family: 'SEAFOOD', category: ['starter', 'main-course', 'seafood'], cuisine: [], dietary: 'seafood', suitableFor: ['seafood-counter'] },

  // RICE & BIRYANI
  'biryani': { family: 'BIRYANI', category: ['rice', 'main-course'], cuisine: ['indian', 'mughlai', 'awadhi', 'hyderabadi'], dietary: 'unknown', suitableFor: ['rice-counter', 'main-course', 'biryani-counter', 'hero'] },
  'pulao': { family: 'BIRYANI', category: ['rice', 'main-course'], cuisine: ['indian', 'mughlai'], dietary: 'unknown', suitableFor: ['rice-counter', 'main-course'] },
  'rice': { category: ['rice', 'main-course'], cuisine: [], dietary: 'unknown', suitableFor: ['rice-counter', 'main-course'] },

  // DESSERTS
  'dessert': { family: 'DESSERT', category: ['dessert'], cuisine: [], dietary: 'vegetarian', suitableFor: ['dessert', 'dessert-counter'] },
  'mithai': { family: 'DESSERT', category: ['dessert'], cuisine: ['indian'], dietary: 'vegetarian', suitableFor: ['dessert-counter'] },
  'halwa': { family: 'DESSERT', category: ['dessert'], cuisine: ['indian', 'north-indian'], dietary: 'vegetarian', suitableFor: ['dessert-counter', 'dessert'] },
  'kheer': { family: 'DESSERT', category: ['dessert'], cuisine: ['indian', 'mughlai'], dietary: 'vegetarian', suitableFor: ['dessert-counter', 'dessert'] },
  'gulab': { family: 'DESSERT', category: ['dessert'], cuisine: ['indian', 'north-indian'], dietary: 'vegetarian', suitableFor: ['dessert-counter', 'dessert'] },
  'jamun': { family: 'DESSERT', category: ['dessert'], cuisine: ['indian', 'north-indian'], dietary: 'vegetarian', suitableFor: ['dessert-counter', 'dessert'] },
  'rasmalai': { family: 'DESSERT', category: ['dessert'], cuisine: ['indian', 'bengali'], dietary: 'vegetarian', suitableFor: ['dessert-counter', 'dessert'] },
  'kulfi': { family: 'DESSERT', category: ['dessert'], cuisine: ['indian', 'mughlai'], dietary: 'vegetarian', suitableFor: ['dessert-counter', 'live-counter'] },

  // JAPANESE & ASIAN
  'sushi': { family: 'SUSHI', category: ['sushi', 'starter', 'main-course', 'seafood'], cuisine: ['japanese', 'asian'], dietary: 'seafood', suitableFor: ['japanese-counter', 'sushi-counter', 'hero', 'live-counter', 'section-divider'] },
  'platter': { category: ['starter', 'main-course', 'sushi'], cuisine: ['japanese'], dietary: 'seafood', suitableFor: ['japanese-counter', 'sushi-counter', 'hero', 'live-counter', 'section-divider'] },
  'sashimi': { family: 'SUSHI', category: ['sushi', 'starter', 'seafood'], cuisine: ['japanese'], dietary: 'seafood', suitableFor: ['japanese-counter', 'sushi-counter'] },
  'noodles': { category: ['noodles', 'main-course'], cuisine: ['chinese', 'asian'], dietary: 'unknown', suitableFor: ['asian-counter', 'chinese-counter'] },

  // ITALIAN / CONTINENTAL
  'pasta': { family: 'PASTA', category: ['pasta', 'main-course'], cuisine: ['italian', 'continental'], dietary: 'unknown', suitableFor: ['italian-counter', 'continental-counter'] },
  'pizza': { family: 'PIZZA', category: ['pizza', 'main-course'], cuisine: ['italian', 'continental'], dietary: 'unknown', suitableFor: ['italian-counter'] },
};

function tokenizeName(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(t => t.length > 1);
}

function toTitleCase(str) {
  return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function processImageFile(filename, isGenerated = false) {
  const fullPath = isGenerated
    ? join(GENERATED_IMAGE_DIR, filename)
    : join(MANUAL_IMAGE_DIR, filename);

  const fileExt = extname(filename).toLowerCase();
  const fileBase = basename(filename, fileExt);
  const stat = statSync(fullPath);
  const isValidQuality = stat.size > 200; // valid image size

  // Check if filename matches a dishId (e.g. dish-0001)
  let dishId = undefined;
  let linkedDish = undefined;
  let rawName = fileBase.replace(/[-_]+/g, ' ').replace(/\d+$/, '').trim();

  // Try direct match from metadataStore
  if (metadataStore[fileBase]) {
    dishId = metadataStore[fileBase].dishId || fileBase;
    linkedDish = dishesMapById.get(dishId);
  } else if (dishesMapById.has(fileBase)) {
    dishId = fileBase;
    linkedDish = dishesMapById.get(fileBase);
  } else {
    // Try matching canonical name
    const norm = rawName.toLowerCase();
    if (dishesMapByNorm.has(norm)) {
      linkedDish = dishesMapByNorm.get(norm);
      dishId = linkedDish.id;
    }
  }

  let name = linkedDish ? linkedDish.name : toTitleCase(rawName);
  const tokens = tokenizeName(name);
  const keywords = new Set(tokens);
  const categories = new Set();
  const cuisines = new Set();
  const suitableFor = new Set();
  let family = 'GENERAL';
  let dietary = linkedDish ? (linkedDish.dietary === 'VEG' ? 'vegetarian' : 'non-vegetarian') : 'unknown';

  if (linkedDish) {
    if (linkedDish.cuisine_tags) linkedDish.cuisine_tags.forEach(c => cuisines.add(c.toLowerCase()));
    if (linkedDish.course_tags) linkedDish.course_tags.forEach(c => categories.add(c.toLowerCase()));
    if (linkedDish.counter_type_ids) linkedDish.counter_type_ids.forEach(ct => suitableFor.add(ct.toLowerCase()));
  }

  for (const token of tokens) {
    const rule = KEYWORD_RULES[token];
    if (rule) {
      if (rule.family && family === 'GENERAL') family = rule.family;
      rule.category?.forEach(c => categories.add(c));
      rule.cuisine?.forEach(c => cuisines.add(c));
      rule.suitableFor?.forEach(s => suitableFor.add(s));
      if (rule.dietary && dietary === 'unknown') dietary = rule.dietary;
    }
  }

  // Relative path from public/menu-images/ for consistent loader resolution
  const relativeFilename = isGenerated ? `generated/${filename}` : filename;
  const id = dishId || fileBase;

  const meta = metadataStore[dishId || fileBase] || {};

  return {
    id,
    dishId,
    filename: relativeFilename,
    name,
    family,
    keywords: Array.from(keywords),
    cuisine: Array.from(cuisines),
    category: Array.from(categories),
    dietary,
    suitableFor: Array.from(suitableFor),
    isValidQuality,
    fileSizeBytes: stat.size,
    source: isGenerated ? (meta.provider === 'mock' || fileExt === '.svg' ? 'mock' : 'generated') : 'manual',
    generatedAt: meta.generatedAt,
    provider: meta.provider,
    model: meta.model,
    promptVersion: meta.promptVersion,
  };
}

// ─── Execution ────────────────────────────────────────────────────────────────

const manualFiles = readdirSync(MANUAL_IMAGE_DIR)
  .filter(f => !f.startsWith('.') && statSync(join(MANUAL_IMAGE_DIR, f)).isFile() && SUPPORTED_EXTS.includes(extname(f).toLowerCase()))
  .sort();

const generatedFiles = readdirSync(GENERATED_IMAGE_DIR)
  .filter(f => !f.startsWith('.') && statSync(join(GENERATED_IMAGE_DIR, f)).isFile() && SUPPORTED_EXTS.includes(extname(f).toLowerCase()))
  .sort();

const manualEntries = manualFiles.map(f => processImageFile(f, false));
const generatedEntries = generatedFiles.map(f => processImageFile(f, true));

// Manual images take precedence if IDs collide
const combinedMap = new Map();
for (const entry of generatedEntries) {
  combinedMap.set(entry.id, entry);
}
for (const entry of manualEntries) {
  combinedMap.set(entry.id, entry);
}

const allEntries = Array.from(combinedMap.values());

const tsContent = `// lib/pdf/imageRegistry.ts
// AUTO-GENERATED by scripts/generate-image-registry.mjs
// DO NOT edit manually — re-run the script after adding new images.

export type ImageDietary = 'vegetarian' | 'non-vegetarian' | 'vegan' | 'egg' | 'seafood' | 'unknown';

export interface MenuImageEntry {
  id: string;
  dishId?: string;
  filename: string;
  name: string;
  family: string;
  keywords: string[];
  cuisine: string[];
  category: string[];
  dietary: ImageDietary;
  suitableFor: string[];
  isValidQuality: boolean;
  fileSizeBytes: number;
  source?: 'manual' | 'generated';
  generatedAt?: string;
  provider?: string;
  model?: string;
  promptVersion?: string;
}

export const IMAGE_REGISTRY: MenuImageEntry[] = ${JSON.stringify(allEntries, null, 2)};

export default IMAGE_REGISTRY;
`;

writeFileSync(OUTPUT_FILE, tsContent, 'utf-8');
console.log(`\n✅ Generated imageRegistry.ts with ${allEntries.length} images (${manualEntries.length} manual, ${generatedEntries.length} generated):`);
allEntries.forEach(e => console.log(`   [${e.source}] ${e.filename} → "${e.name}" [ID: ${e.id}] [Family: ${e.family}] [Dietary: ${e.dietary}] [Size: ${Math.round(e.fileSizeBytes / 1024)}KB]`));
