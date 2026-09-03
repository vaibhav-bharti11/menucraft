#!/usr/bin/env node
// scripts/generate-dish-images.mjs
// Dedicated, offline, resumable dish image generation pipeline for MenuCraft.
// Usage examples:
//   node scripts/generate-dish-images.mjs --dry-run
//   node scripts/generate-dish-images.mjs --test-batch --provider mock
//   node scripts/generate-dish-images.mjs --limit 20 --only-missing
//   node scripts/generate-dish-images.mjs --dish-id dish-0001
//   node scripts/generate-dish-images.mjs --force --dish-id dish-0010

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { execSync } from 'child_process';
import crypto from 'crypto';
import readline from 'readline';
import { buildDishImagePrompt, analyzeDishProfile } from './lib/dishPromptEngine.mjs';
import { getImageProvider } from './lib/imageProviders.mjs';

// ─── Load .env.local (Next.js env, not auto-loaded by plain Node) ─────────────
{
  const envFiles = ['.env.local', '.env'];
  for (const envFile of envFiles) {
    const envPath = join(process.cwd(), envFile);
    if (existsSync(envPath)) {
      const lines = readFileSync(envPath, 'utf-8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx === -1) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (key && !(key in process.env)) {
          process.env[key] = val;
        }
      }
    }
  }
}

const DATA_DIR = join(process.cwd(), 'data');
const SEED_DIR = join(DATA_DIR, 'seed');
const DISHES_FILE = join(SEED_DIR, 'dishes.json');
const METADATA_FILE = join(DATA_DIR, 'dish-image-metadata.json');
const MANUAL_DIR = join(process.cwd(), 'public', 'menu-images');
const GENERATED_DIR = join(process.cwd(), 'public', 'menu-images', 'generated');

// Ensure output directories
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
if (!existsSync(MANUAL_DIR)) mkdirSync(MANUAL_DIR, { recursive: true });
if (!existsSync(GENERATED_DIR)) mkdirSync(GENERATED_DIR, { recursive: true });

// ─── Parse CLI Arguments ──────────────────────────────────────────────────────

const args = process.argv.slice(2);
function getArg(flag, fallback = null) {
  const idx = args.indexOf(flag);
  if (idx !== -1 && idx + 1 < args.length) return args[idx + 1];
  return fallback;
}
const isDryRun = args.includes('--dry-run');
const isOnlyMissing = args.includes('--only-missing') || true; // default safe
const isForce = args.includes('--force') || args.includes('--regenerate');
const isTestBatch = args.includes('--test-batch');
const limitArg = getArg('--limit');
const limit = limitArg ? parseInt(limitArg, 10) : null;
const dishIdArg = getArg('--dish-id');
const concurrencyArg = getArg('--concurrency', '2');
const concurrency = Math.max(1, Math.min(5, parseInt(concurrencyArg, 10)));
const providerArg = getArg('--provider');

// ─── Load Dataset ─────────────────────────────────────────────────────────────

if (!existsSync(DISHES_FILE)) {
  console.error(`❌ Dishes dataset not found at ${DISHES_FILE}`);
  process.exit(1);
}

const rawDishes = JSON.parse(readFileSync(DISHES_FILE, 'utf-8'));

// Load persistent metadata store
let metadataStore = {};
if (existsSync(METADATA_FILE)) {
  try {
    metadataStore = JSON.parse(readFileSync(METADATA_FILE, 'utf-8'));
  } catch {
    metadataStore = {};
  }
}

// ─── Deduplication & Canonical Identification ─────────────────────────────────

const uniqueDishMap = new Map();
const normalizedNameMap = new Map();

for (const dish of rawDishes) {
  const normName = dish.name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!uniqueDishMap.has(dish.id)) {
    uniqueDishMap.set(dish.id, { ...dish, normalizedName: normName });
  }
  if (!normalizedNameMap.has(normName)) {
    normalizedNameMap.set(normName, dish.id);
  }
}

const totalDishes = rawDishes.length;
const totalUniqueDishes = uniqueDishMap.size;

// ─── Image Coverage Check ─────────────────────────────────────────────────────

function checkExistingImage(dish) {
  // 1. Check metadata store
  const meta = metadataStore[dish.id];
  if (meta && meta.filename) {
    const p1 = join(MANUAL_DIR, meta.filename);
    const p2 = join(GENERATED_DIR, meta.filename.replace(/^generated\//, ''));
    if (existsSync(p1) || existsSync(p2)) return { exists: true, source: meta.source || 'generated', path: existsSync(p1) ? p1 : p2 };
  }

  // 2. Check generated direct file: dish-XXXX.jpg / .png / .svg
  const exts = ['.jpg', '.jpeg', '.png', '.webp', '.svg'];
  for (const ext of exts) {
    const genPath = join(GENERATED_DIR, `${dish.id}${ext}`);
    if (existsSync(genPath) && statSync(genPath).size > 100) {
      return { exists: true, source: 'generated', path: genPath };
    }
  }

  // 3. Check manual curated files by normalized filename
  const slug = dish.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  for (const ext of exts) {
    const manPath = join(MANUAL_DIR, `${slug}${ext}`);
    if (existsSync(manPath) && statSync(manPath).size > 100) {
      return { exists: true, source: 'manual', path: manPath };
    }
  }

  return { exists: false };
}

// ─── Representative 10-20 Dish Test Batch Selection ───────────────────────────

const TEST_BATCH_CRITERIA = [
  { label: 'Vegetarian Starter', match: d => d.dietary === 'VEG' && d.course_tags?.includes('Starter') && /paneer|samosa|tikka/i.test(d.name) },
  { label: 'Non-Vegetarian Starter', match: d => d.dietary === 'NON_VEG' && d.course_tags?.includes('Starter') && /kebab|tikka|tangdi/i.test(d.name) },
  { label: 'Seafood Starter / Mains', match: d => /fish|pomfret|prawn|salmon|curry/i.test(d.name) && (d.dietary === 'NON_VEG' || d.cuisine_tags?.includes('Seafood')) },
  { label: 'Chicken Main Course', match: d => d.dietary === 'NON_VEG' && /chicken|butter chicken|murgh/i.test(d.name) },
  { label: 'Mutton / Lamb Specialty', match: d => d.dietary === 'NON_VEG' && /mutton|lamb|rogan|gosht|nihari/i.test(d.name) },
  { label: 'Paneer Specialty', match: d => d.dietary === 'VEG' && /paneer/i.test(d.name) },
  { label: 'Biryani / Rice', match: d => /biryani|pulao/i.test(d.name) },
  { label: 'Dal Specialty', match: d => d.dietary === 'VEG' && /dal|daal|makhani/i.test(d.name) },
  { label: 'Dessert / Mithai', match: d => d.course_tags?.includes('Dessert') || /gulab|jamun|halwa|kheer|rasmalai|cake|kulfi/i.test(d.name) },
  { label: 'Pasta / Italian', match: d => /pasta|penne|spaghetti|fettuccine|lasagna/i.test(d.name) },
  { label: 'Pizza / Flatbread', match: d => /pizza|margherita|flatbread/i.test(d.name) },
  { label: 'Sushi / Japanese', match: d => /sushi|sashimi|maki|nigiri/i.test(d.name) },
  { label: 'Salad / Appetizer', match: d => /salad|bruschetta|canap/i.test(d.name) },
  { label: 'Soup / Shorba', match: d => /soup|shorba|broth/i.test(d.name) },
];

function pickTestBatch(allDishes) {
  const selected = new Map();
  for (const crit of TEST_BATCH_CRITERIA) {
    const match = allDishes.find(d => !selected.has(d.id) && crit.match(d));
    if (match) selected.set(match.id, { dish: match, label: crit.label });
  }
  // Fill up to 15-20 dishes if needed
  for (const d of allDishes) {
    if (selected.size >= 16) break;
    if (!selected.has(d.id)) selected.set(d.id, { dish: d, label: 'Diverse Selection' });
  }
  return Array.from(selected.values());
}

// ─── Filter Target Dishes ─────────────────────────────────────────────────────

let targetDishes = Array.from(uniqueDishMap.values());

if (dishIdArg) {
  targetDishes = targetDishes.filter(d => d.id === dishIdArg);
  if (targetDishes.length === 0) {
    console.error(`❌ Dish ID "${dishIdArg}" not found in repository.`);
    process.exit(1);
  }
} else if (isTestBatch) {
  const batch = pickTestBatch(targetDishes);
  targetDishes = batch.map(b => b.dish);
  console.log(`\n🎯 Selected ${targetDishes.length} representative dishes for test batch:`);
  batch.forEach((b, i) => console.log(`   ${i + 1}. [${b.dish.id}] ${b.dish.name} (${b.label})`));
}

// Check existing coverage
let existingCount = 0;
const missingDishes = [];

for (const dish of targetDishes) {
  const check = checkExistingImage(dish);
  if (check.exists && !isForce) {
    existingCount++;
  } else {
    missingDishes.push(dish);
  }
}

// Apply limit
const queue = limit ? missingDishes.slice(0, limit) : missingDishes;

const hasYesFlag = args.includes('--yes') || args.includes('-y');
const provider = getImageProvider(providerArg);
const preflight = provider.getPreflightInfo ? provider.getPreflightInfo() : {
  provider: provider.name,
  model: 'standard',
  isMock: provider.name === 'mock',
  authConfigured: true,
  costPerImageUsd: null,
  pricingDescription: 'Unknown',
  status: 'ready',
  message: 'Provider initialized',
};

const costPerImage = preflight.costPerImageUsd ?? 0;
const estimatedBatchCost = (queue.length * costPerImage).toFixed(4);
const estimatedFullCost = (missingDishes.length * costPerImage).toFixed(2);

console.log('\n' + '='.repeat(80));
console.log('  MENUCRAFT DISH IMAGE PIPELINE — PREFLIGHT & SAFETY CHECK');
console.log('='.repeat(80));
console.log(`Provider Selected         : ${preflight.provider.toUpperCase()} (${preflight.isMock ? 'Mock Testing' : 'Real AI Image Generation'})`);
console.log(`Model Selected            : ${preflight.model}`);
console.log(`API Authentication        : ${preflight.authConfigured ? '✅ CONFIGURED' : '❌ NOT CONFIGURED'}`);
console.log(`Status                    : ${preflight.message}`);
console.log(`Pricing Rate              : ${preflight.pricingDescription}`);
console.log(`Total Master Dishes       : ${totalUniqueDishes}`);
console.log(`Already Verified Images   : ${existingCount}`);
console.log(`Remaining Missing Images  : ${missingDishes.length}`);
console.log(`Queued in this Run        : ${queue.length}`);
console.log(`Estimated Run Cost        : ~$${estimatedBatchCost} USD`);
if (missingDishes.length > queue.length) {
  console.log(`Estimated Full Repo Cost  : ~$${estimatedFullCost} USD (for all ${missingDishes.length} missing)`);
}
console.log(`Concurrency               : ${concurrency} parallel worker(s)`);
console.log('='.repeat(80));

// ─── DRY RUN MODE ─────────────────────────────────────────────────────────────

if (isDryRun) {
  console.log('\n[DRY RUN] Simulating generation without making API calls or saving files...');
  console.log('\nSample Prompts that would be sent to the Image Provider:');
  const samples = queue.slice(0, 5);
  for (const dish of samples) {
    const promptData = buildDishImagePrompt(dish);
    console.log(`\n──────────────────────────────────────────────────`);
    console.log(`Dish ID       : ${dish.id}`);
    console.log(`Dish Name     : ${dish.name}`);
    console.log(`Dietary       : ${dish.dietary} (${promptData.dietaryClassification})`);
    console.log(`Family        : ${promptData.family}`);
    console.log(`Prompt        : ${promptData.prompt}`);
    console.log(`Negative      : ${promptData.negativePrompt}`);
  }
  console.log('\n✅ Dry run complete. To run generation, run without --dry-run flag.');
  process.exit(0);
}

// ─── Preflight Health Guard ───────────────────────────────────────────────────

if (!preflight.isMock && !preflight.authConfigured) {
  console.error(`\n❌ PREFLIGHT FAILED: Provider "${preflight.provider}" is missing its required API key.`);
  console.error(`   Expected environment variables: ${preflight.envVarsExpected.join(', ')}`);
  console.error(`   Please set the key in .env.local before running real image generation.`);
  process.exit(1);
}

// ─── Batch Execution Safeguard ────────────────────────────────────────────────

if (queue.length > 5 && !hasYesFlag) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  console.log(`\n⚠️  BATCH EXECUTION CONFIRMATION REQUIRED`);
  console.log(`   You are attempting to queue ${queue.length} dish images with provider "${preflight.provider}".`);
  console.log(`   Estimated generation cost: ~$${estimatedBatchCost} USD.`);
  
  rl.question(`\n   ${queue.length} images are missing.\n   Estimated generation cost: ~$${estimatedBatchCost} USD.\n   Provider: ${preflight.provider.toUpperCase()}.\n   Model: ${preflight.model}.\n   Proceed? (yes/no): `, (answer) => {
    rl.close();
    if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
      runPipeline();
    } else {
      console.log('Aborted.');
      process.exit(0);
    }
  });
} else {
  runPipeline();
}

function runPipeline() {
  processQueue().then(() => {
    const remaining = totalUniqueDishes - (skippedCount + generatedCount);

    console.log('\n' + '='.repeat(80));
    console.log('  GENERATION PIPELINE SUMMARY REPORT');
    console.log('='.repeat(80));
    console.log(`Total unique dishes in repository : ${totalUniqueDishes}`);
    console.log(`Already had images (reused)       : ${skippedCount}`);
    console.log(`Images newly generated            : ${generatedCount}`);
    console.log(`Failed generations                : ${failedCount}`);
    console.log(`Remaining missing images          : ${Math.max(0, remaining)}`);
    console.log(`Generated images directory        : ${GENERATED_DIR}`);
    console.log(`Metadata tracking file            : ${METADATA_FILE}`);
    console.log('='.repeat(80));

    if (failedList.length > 0) {
      console.log('\n⚠️ Failed items log:');
      failedList.forEach(f => console.log(`   - [${f.dishId}] ${f.dishName}: ${f.error}`));
    }

    console.log('\n🎉 Process finished successfully!\n');
  }).catch(err => {
    console.error('Fatal execution error:', err);
    process.exit(1);
  });
}

async function generateWithRetry(dish, maxRetries = 3) {
  let attempt = 0;
  let lastError = null;

  while (attempt < maxRetries) {
    attempt++;
    try {
      const result = await provider.generateImage(dish);

      // Validation
      if (!result.imageBuffer || result.imageBuffer.length < 500) {
        throw new Error('Generated image buffer too small or corrupt');
      }

      return result;
    } catch (err) {
      lastError = err;
      const isRateLimit = /rate limit|429|quota/i.test(err.message);
      // A quota response means subsequent dishes cannot succeed either. Stop
      // immediately so the run stays safe, cheap, and resumable.
      if (isRateLimit) {
        quotaExhausted = true;
        quotaError = err.message;
        throw err;
      }
      const delayMs = isRateLimit ? attempt * 4000 : attempt * 1500;
      if (attempt < maxRetries) {
        console.warn(`      ⚠️ Attempt ${attempt} failed for [${dish.id}]: ${err.message}. Retrying in ${delayMs}ms...`);
        await new Promise(res => setTimeout(res, delayMs));
      }
    }
  }

  throw lastError;
}

let generatedCount = 0;
let skippedCount = existingCount;
let failedCount = 0;
const failedList = [];
let quotaExhausted = false;
let quotaError = null;

async function processQueue() {
  if (queue.length === 0) {
    console.log('\n✨ All inspected dishes already have valid images! No generation needed.');
    return;
  }

  console.log(`\n🚀 Starting generation of ${queue.length} images...\n`);

  let currentIndex = 0;

  async function worker(workerId) {
    while (currentIndex < queue.length && !quotaExhausted) {
      const dish = queue[currentIndex++];
      const dishNumber = currentIndex;
      const label = `[${dishNumber}/${queue.length}] ${dish.id} (${dish.name})`;

      try {
        const startTime = Date.now();
        console.log(`⏳ Worker ${workerId}: Generating ${label}...`);
        
        const result = await generateWithRetry(dish);

        // Determine file extension
        let ext = '.jpg';
        if (result.mimeType === 'image/png') ext = '.png';
        if (result.imageBuffer.toString('utf-8', 0, 100).includes('<svg')) ext = '.svg';

        const filename = `${dish.id}${ext}`;
        const filePath = join(GENERATED_DIR, filename);

        writeFileSync(filePath, result.imageBuffer);

        // Calculate sha256 hash for duplicate check
        const sha256 = crypto.createHash('sha256').update(result.imageBuffer).digest('hex');

        // Update metadata store
        metadataStore[dish.id] = {
          dishId: dish.id,
          dishName: dish.name,
          filename: `generated/${filename}`,
          source: 'generated',
          generatedAt: new Date().toISOString(),
          provider: result.provider,
          model: result.model,
          promptVersion: result.promptVersion || 'v1.0',
          fileSizeBytes: result.imageBuffer.length,
          sha256,
          prompt: result.prompt,
        };

        // Save metadata periodically
        writeFileSync(METADATA_FILE, JSON.stringify(metadataStore, null, 2), 'utf-8');

        generatedCount++;
        const elapsed = Date.now() - startTime;
        console.log(`✅ Worker ${workerId}: Saved ${filename} (${Math.round(result.imageBuffer.length / 1024)}KB, ${elapsed}ms)`);
      } catch (err) {
        failedCount++;
        failedList.push({ dishId: dish.id, dishName: dish.name, error: err.message });
        console.error(`❌ Worker ${workerId}: Failed ${label} - ${err.message}`);
      }
    }
  }

  const workers = Array.from({ length: concurrency }, (_, i) => worker(i + 1));
  await Promise.all(workers);

  if (quotaExhausted) {
    console.warn(`\n🛑 Generation paused: provider quota/rate limit reached. ${queue.length - currentIndex} queued dish(es) were not attempted and will remain resumable.`);
    if (quotaError) console.warn(`   Provider response: ${quotaError}`);
  }

  // Final metadata sync
  writeFileSync(METADATA_FILE, JSON.stringify(metadataStore, null, 2), 'utf-8');

  // Trigger Image Registry Compiler
  console.log('\n🔄 Recompiling image registry (lib/pdf/imageRegistry.ts)...');
  try {
    execSync('node scripts/generate-image-registry.mjs', { stdio: 'inherit' });
  } catch (regErr) {
    console.error('Warning: Registry script error:', regErr.message);
  }
}

// processQueue was wrapped in runPipeline earlier
