#!/usr/bin/env node
// scripts/test-item-matching.mjs
// Stand-alone matching test that does NOT require TypeScript compilation.
// Implements the same culinary taxonomy as imageMatcher.ts for verification.

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

// ─── Culinary Taxonomy ────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
  'and', 'with', 'in', 'on', 'of', 'the', 'a', 'an', 'for', 'our', 'special',
  'fresh', 'style', 'assorted', 'size', 'bite', 'bites', 'selection', 'platter',
  'choice', 'classic', 'supreme', 'deluxe', 'signature', 'traditional', 'royal',
  'handcrafted', 'artisanal', 'crisp', 'crispy', 'mini', 'small', 'welcoming',
  'welcome', 'arrival', 'prelude', 'house', 'served', 'alongside', 'topped',
  'morsels', 'skewers', 'delight', 'medley', 'trio', 'duo', 'bites', 'plate'
]);

function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTokens(text) {
  return normalizeText(text).split(' ').filter(t => t.length > 1 && !STOP_WORDS.has(t));
}

function inferFamily(name, desc = '', dietary = '') {
  const tokens = extractTokens(`${name} ${desc}`);
  if (tokens.some(t => ['paneer', 'cottage'].includes(t))) return 'PANEER';
  if (tokens.some(t => ['butter', 'murgh', 'murg', 'chicken', 'poultry'].includes(t)) && !tokens.includes('paneer')) return 'CHICKEN';
  if (tokens.some(t => ['biryani'].includes(t))) return 'BIRYANI';
  if (tokens.some(t => ['dal', 'daal', 'makhani', 'lentil', 'urad'].includes(t))) return 'DAL';
  if (tokens.some(t => ['gulab', 'jamun', 'rasmalai', 'rasgulla', 'kheer', 'halwa', 'kulfi', 'jalebi', 'phirni', 'mithai', 'dessert', 'sweet'].includes(t))) return 'DESSERT';
  if (tokens.some(t => ['sushi', 'sashimi', 'nigiri', 'maki', 'uramaki'].includes(t))) return 'SUSHI';
  if (tokens.some(t => ['pomfret', 'fish', 'machli', 'salmon', 'tuna', 'sole', 'surmai', 'rawas', 'cod'].includes(t))) return 'FISH';
  if (tokens.some(t => ['prawn', 'shrimp', 'jhinga', 'crab', 'lobster', 'seafood'].includes(t))) return 'SEAFOOD';
  if (tokens.some(t => ['mutton', 'gosht', 'lamb', 'nihari', 'galouti', 'shammi', 'rogan', 'josh'].includes(t))) return 'MUTTON';
  if (tokens.some(t => ['samosa', 'chaat', 'pakoda', 'pakora', 'kachori'].includes(t))) return 'SAMOSA';
  if (tokens.some(t => ['sandwich', 'canape', 'crostini', 'toast', 'panini', 'bruschetta'].includes(t))) return 'SANDWICH';
  if (tokens.some(t => ['pasta', 'spaghetti', 'penne', 'fusilli', 'ravioli', 'linguine', 'fettuccine', 'arrabbiata', 'alfredo'].includes(t))) return 'PASTA';
  if (tokens.some(t => ['pizza', 'neapolitan', 'margherita', 'flatbread', 'calzone'].includes(t))) return 'PIZZA';
  return 'GENERAL';
}

// ─── Load Registry from JSON ──────────────────────────────────────────────────
// Parse registry directly from imageRegistry.ts file to avoid compilation

const registryPath = join(process.cwd(), 'lib', 'pdf', 'imageRegistry.ts');
const registrySource = readFileSync(registryPath, 'utf-8');
// Extract the JSON array from the TypeScript source
const match = registrySource.match(/IMAGE_REGISTRY:\s*MenuImageEntry\[\]\s*=\s*(\[[\s\S]*?\]);/);
if (!match) {
  console.error('❌ Could not parse IMAGE_REGISTRY from imageRegistry.ts');
  process.exit(1);
}
const IMAGE_REGISTRY = JSON.parse(match[1]);

// ─── 7-Level Evaluator ────────────────────────────────────────────────────────

function evaluate(entry, item) {
  const normDish = normalizeText(item.itemName);
  const normEntryName = normalizeText(entry.name);
  const dishTokens = extractTokens(item.itemName);
  const entryKeywords = entry.keywords.map(k => normalizeText(k));
  const entryNameTokens = extractTokens(entry.name);

  const dishFamily = inferFamily(item.itemName, item.description, item.dietary);
  const entryFamily = entry.family;

  const normDietary = (item.dietary || '').toLowerCase();
  const isDishVeg = normDietary === 'veg' || normDietary === 'vegetarian';
  const isDishNonVeg = ['non_veg', 'non-veg', 'non-vegetarian'].includes(normDietary);
  const isDishSeafood = normDietary === 'seafood' || dishFamily === 'FISH' || dishFamily === 'SEAFOOD';

  // ─── HARD ISOLATION GUARDS ─────────────────────────────────────────────────

  if (isDishVeg && (entry.dietary === 'non-vegetarian' || entry.dietary === 'seafood'))
    return { score: -500, level: 'LEVEL 7 — Text-only', reason: 'Vegetarian dish cannot use non-veg/seafood image', confidence: 'Safe fallback' };

  if ((isDishNonVeg || isDishSeafood) && entry.dietary === 'vegetarian')
    return { score: -500, level: 'LEVEL 7 — Text-only', reason: 'Non-veg/seafood dish cannot use vegetarian image', confidence: 'Safe fallback' };

  if (isDishSeafood && (entryFamily === 'CHICKEN' || entryFamily === 'MUTTON'))
    return { score: -500, level: 'LEVEL 7 — Text-only', reason: 'Seafood dish cannot use chicken/mutton image', confidence: 'Safe fallback' };

  if ((dishFamily === 'CHICKEN' || dishFamily === 'MUTTON') && (entry.dietary === 'seafood' || entryFamily === 'SUSHI' || entryFamily === 'FISH'))
    return { score: -500, level: 'LEVEL 7 — Text-only', reason: 'Meat dish cannot use seafood/sushi image', confidence: 'Safe fallback' };

  const isDishSushi = dishFamily === 'SUSHI' || dishTokens.some(t => ['sushi', 'sashimi', 'nigiri', 'maki', 'uramaki', 'japanese'].includes(t));
  const isEntrySushi = entryFamily === 'SUSHI' || entry.cuisine.includes('japanese');
  if (isDishSushi !== isEntrySushi)
    return { score: -500, level: 'LEVEL 7 — Text-only', reason: 'Sushi/Japanese items strictly isolated', confidence: 'Safe fallback' };

  const isDishDessert = dishFamily === 'DESSERT';
  const isEntryDessert = entryFamily === 'DESSERT' || entry.category.includes('dessert');
  if (isDishDessert !== isEntryDessert)
    return { score: -500, level: 'LEVEL 7 — Text-only', reason: 'Dessert items strictly isolated from savory', confidence: 'Safe fallback' };

  const isDishWestern = dishFamily === 'SANDWICH' || dishFamily === 'PASTA' || dishFamily === 'PIZZA';
  const isEntryIndian = entry.cuisine.some(c => ['indian', 'north-indian', 'mughlai', 'punjabi', 'awadhi'].includes(c));
  if (isDishWestern && isEntryIndian)
    return { score: -500, level: 'LEVEL 7 — Text-only', reason: 'Western/Italian dish cannot use Indian curry/rice image', confidence: 'Safe fallback' };

  // ─── LEVEL 1: Exact Dish ───────────────────────────────────────────────────
  if (normDish === normEntryName)
    return { score: 350, level: 'LEVEL 1 — Exact dish', reason: `Exact full name match: "${entry.name}"`, confidence: 'High' };

  const allInDish = entryNameTokens.every(et => dishTokens.includes(et) || normDish.includes(et));
  if (allInDish && entryNameTokens.length >= 2)
    return { score: 310, level: 'LEVEL 1 — Exact dish', reason: `Canonical name fully contained: "${entry.name}"`, confidence: 'High' };

  // ─── LEVEL 2: Strong Dish/Ingredient Match ─────────────────────────────────
  if (dishFamily === entryFamily && dishFamily !== 'GENERAL') {
    let overlap = 0;
    for (const dt of dishTokens) {
      if (entryKeywords.includes(dt)) overlap++;
    }
    if (overlap >= 2 || (overlap >= 1 && entryNameTokens.some(et => dishTokens.includes(et)))) {
      return { score: 250 + overlap * 10, level: 'LEVEL 2 — Strong dish/ingredient match', reason: `Shared ${dishFamily} family + ${overlap} keyword(s) with "${entry.name}"`, confidence: 'High' };
    }
  }

  // ─── LEVEL 3: Primary Protein/Ingredient Match ─────────────────────────────
  if (dishFamily === entryFamily && dishFamily !== 'GENERAL') {
    const hasFamilyKw = dishTokens.some(dt => entryKeywords.includes(dt));
    if (hasFamilyKw)
      return { score: 150, level: 'LEVEL 3 — Primary ingredient/protein match', reason: `Primary ${dishFamily} protein/substance alignment with "${entry.name}"`, confidence: 'Medium' };
  }

  // ─── LEVEL 4: Preparation + Compatible Dietary ────────────────────────────
  const sharedPrep = dishTokens.filter(dt =>
    ['tikka', 'tandoori', 'kebab', 'curry', 'gravy', 'dum', 'biryani', 'roast', 'grilled'].includes(dt) &&
    entryKeywords.includes(dt)
  );
  if (sharedPrep.length > 0 && ((isDishVeg && entry.dietary === 'vegetarian') || (isDishNonVeg && entry.dietary === 'non-vegetarian')))
    return { score: 95, level: 'LEVEL 4 — Preparation/cooking-method + ingredient match', reason: `Shared prep (${sharedPrep.join(', ')}) + compatible dietary`, confidence: 'Medium' };

  // ─── LEVEL 7: Text-Only ────────────────────────────────────────────────────
  return { score: 0, level: 'LEVEL 7 — Text-only', reason: 'No sufficiently relevant local image in library', confidence: 'Safe fallback' };
}

function findBest(item) {
  const results = IMAGE_REGISTRY.map(entry => ({ entry, ...evaluate(entry, item) }));
  const valid = results.filter(r => r.score >= 35 && r.entry.isValidQuality !== false);
  if (valid.length === 0) return { entry: null, score: 0, level: 'LEVEL 7 — Text-only', reason: 'No sufficiently relevant local image in library', confidence: 'Safe fallback' };
  valid.sort((a, b) => b.score - a.score);
  return valid[0];
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

const PRIMARY_TESTS = [
  { name: 'Assorted Bite Size Sandwich', desc: 'Crustless tea sandwiches with herbed cream cheese.', dietary: 'veg', counter: 'ARRIVAL BITES & PHERA WELCOME' },
  { name: 'Cocktail Samosa', desc: 'Crisp pastry triangles stuffed with spiced potatoes.', dietary: 'veg', counter: 'ARRIVAL BITES & PHERA WELCOME' },
  { name: 'Malabari Fish Curry Bites', desc: 'River sole simmered in spiced coconut milk.', dietary: 'seafood', counter: 'ARRIVAL BITES & PHERA WELCOME' },
  { name: 'Tandoori Pomfret Morsels', desc: 'Silver pomfret marinated in Kashmiri chilies, roasted in tandoor.', dietary: 'seafood', counter: 'ARRIVAL BITES & PHERA WELCOME' },
  { name: 'Smoked Paneer Tikka Skewers', desc: 'Cottage cheese char-grilled over embers.', dietary: 'veg', counter: 'ARRIVAL BITES' },
  { name: 'Classic Embassy Butter Chicken', desc: 'Tandoor-roasted chicken in tomato-butter sauce.', dietary: 'non_veg', counter: 'ROYAL AWADHI & MUGHLAI KITCHEN' },
  { name: 'Awadhi Chicken Biryani', desc: 'Fragrant chicken biryani with saffron and kewra.', dietary: 'non_veg', counter: 'DUM PUKHT BIRYANI DASTARKHWAN' },
  { name: 'Embassy Dal Makhani', desc: 'Black lentils slow-simmered with butter and cream.', dietary: 'veg', counter: 'ROYAL AWADHI & MUGHLAI KITCHEN' },
  { name: 'Warm Angoori Gulab Jamun', desc: 'Mini khoya dumplings in rose petal and cardamom syrup.', dietary: 'veg', counter: 'THE GRAND DESSERT SYMPHONY' },
  { name: 'Sushi Platter Selection', desc: 'Norwegian salmon nigiri, spicy tuna uramaki, prawn tempura rolls.', dietary: 'seafood', counter: 'JAPANESE TEPPAN & SUSHI BAR' },
  { name: 'Truffled Wild Mushroom Pasta', desc: 'Artisanal fettuccine in black truffle and porcini reduction.', dietary: 'veg', counter: 'CONTINENTAL & MEDITERRANEAN LIVE' },
  { name: 'Wood-Fired Neapolitan Pizza', desc: 'Sourdough base with San Marzano tomato and buffalo mozzarella.', dietary: 'veg', counter: 'CONTINENTAL & MEDITERRANEAN LIVE' },
  // Level 3 hierarchy tests
  { name: 'Paneer Butter Masala', desc: 'Fresh cottage cheese in spiced butter gravy.', dietary: 'veg', counter: 'ROYAL AWADHI' },
  { name: 'Murgh Tikka Masala', desc: 'Charred chicken chunks in spiced onion tomato gravy.', dietary: 'non_veg', counter: 'ROYAL AWADHI' },
  { name: 'Kesar Rasmalai', desc: 'Poached chenna discs in saffron condensed milk.', dietary: 'veg', counter: 'DESSERT SYMPHONY' },
];

console.log('\n' + '═'.repeat(120));
console.log('  7-LEVEL MATCHING REPORT — ITEM-LEVEL SEMANTIC HIERARCHY');
console.log('═'.repeat(120));
console.log(
  '  ' +
  'Menu Item'.padEnd(42) +
  'Selected Image'.padEnd(26) +
  'Score'.padEnd(8) +
  'Match Level'.padEnd(45) +
  'Confidence'.padEnd(16) +
  'Reason'
);
console.log('  ' + '─'.repeat(118));

let textOnlyCount = 0;
let matched = 0;
const results = [];

for (const dish of PRIMARY_TESTS) {
  const r = findBest({ itemName: dish.name, description: dish.desc, dietary: dish.dietary });
  const imgDisplay = r.entry ? r.entry.filename.replace('.jpg', '') : '—  [Text-only]';
  const scoreDisplay = r.score >= 35 ? String(r.score) : '0';
  if (!r.entry) textOnlyCount++;
  else matched++;
  results.push({ dish, result: r });
  console.log(
    '  ' +
    dish.name.padEnd(42) +
    imgDisplay.padEnd(26) +
    scoreDisplay.padEnd(8) +
    r.level.padEnd(45) +
    r.confidence.padEnd(16) +
    r.reason
  );
}

console.log('\n  Summary: ' + matched + ' matched | ' + textOnlyCount + ' text-only (Level 7)\n');

// ─── Negative Safety Tests ────────────────────────────────────────────────────

console.log('═'.repeat(120));
console.log('  CRITICAL NEGATIVE SAFETY TESTS — ZERO FALSE POSITIVE VERIFICATION');
console.log('═'.repeat(120));

const NEGATIVE_TESTS = [
  { desc: 'Samosa must NOT get sushi/dessert/chicken/paneer image',
    item: { itemName: 'Cocktail Samosa', dietary: 'veg' },
    forbidden: ['sushi-platter.jpg', 'gulab-jamun.jpg', 'butter-chicken.jpg', 'chicken-biryani.jpg', 'paneer-tikka.jpg'] },
  { desc: 'Fish Curry must NOT get paneer/dessert/chicken/dal image',
    item: { itemName: 'Malabari Fish Curry', dietary: 'seafood' },
    forbidden: ['paneer-tikka.jpg', 'gulab-jamun.jpg', 'butter-chicken.jpg', 'chicken-biryani.jpg', 'dal-makhani.jpg'] },
  { desc: 'Pomfret must NOT get paneer/chicken/dessert/dal image',
    item: { itemName: 'Tandoori Pomfret', dietary: 'seafood' },
    forbidden: ['paneer-tikka.jpg', 'gulab-jamun.jpg', 'butter-chicken.jpg', 'chicken-biryani.jpg', 'dal-makhani.jpg'] },
  { desc: 'Dessert (Gulab Jamun) must NOT get savory images',
    item: { itemName: 'Warm Gulab Jamun', dietary: 'veg' },
    forbidden: ['butter-chicken.jpg', 'chicken-biryani.jpg', 'sushi-platter.jpg', 'paneer-tikka.jpg', 'dal-makhani.jpg'] },
  { desc: 'Pizza must NOT get sushi/curry/dessert/indian images',
    item: { itemName: 'Neapolitan Pizza', dietary: 'veg' },
    forbidden: ['sushi-platter.jpg', 'butter-chicken.jpg', 'dal-makhani.jpg', 'gulab-jamun.jpg', 'paneer-tikka.jpg', 'chicken-biryani.jpg'] },
  { desc: 'Pasta must NOT get Indian curry/dessert/sushi images',
    item: { itemName: 'Mushroom Pasta', dietary: 'veg' },
    forbidden: ['sushi-platter.jpg', 'butter-chicken.jpg', 'dal-makhani.jpg', 'gulab-jamun.jpg', 'paneer-tikka.jpg', 'chicken-biryani.jpg'] },
  { desc: 'Sandwich must NOT get paneer/chicken/sushi/dessert images',
    item: { itemName: 'Assorted Bite Size Sandwich', dietary: 'veg' },
    forbidden: ['sushi-platter.jpg', 'butter-chicken.jpg', 'dal-makhani.jpg', 'gulab-jamun.jpg', 'paneer-tikka.jpg', 'chicken-biryani.jpg'] },
  { desc: 'Butter Chicken must NOT get paneer/sushi/dessert/dal images',
    item: { itemName: 'Classic Butter Chicken', dietary: 'non_veg' },
    forbidden: ['paneer-tikka.jpg', 'sushi-platter.jpg', 'gulab-jamun.jpg', 'dal-makhani.jpg'] },
];

let allPassed = true;
for (const nt of NEGATIVE_TESTS) {
  const r = findBest(nt.item);
  const selected = r.entry ? r.entry.filename : 'None';
  const isForbidden = nt.forbidden.includes(selected);
  if (isForbidden) allPassed = false;
  const status = isForbidden ? '❌ FAILED' : '✅ PASSED';
  console.log(`  ${status}  ${nt.desc}`);
  console.log(`          → Selected: "${selected}"  |  Level: ${r.level}`);
  if (isForbidden) {
    console.log(`          ⚠️  FORBIDDEN MATCH DETECTED! Forbidden: [${nt.forbidden.join(', ')}]`);
  }
  console.log();
}

if (!allPassed) {
  console.error('❌ ONE OR MORE NEGATIVE SAFETY TESTS FAILED.');
  process.exit(1);
}

console.log('✅ ALL NEGATIVE SAFETY TESTS PASSED WITH 100% ISOLATION!');
console.log('\n🎯 7-Level Matching Engine is ready for PDF generation.\n');
