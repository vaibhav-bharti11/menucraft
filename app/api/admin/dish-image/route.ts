// app/api/admin/dish-image/route.ts
// Admin API for inspecting and generating dish images on demand.

import { NextRequest, NextResponse } from 'next/server';
import { getDishById, getDishes } from '@/lib/data';
import { getImageAsBase64, clearImageCache } from '@/lib/pdf/helpers';
import { IMAGE_REGISTRY } from '@/lib/pdf/imageRegistry';
import { getImageProvider } from '@/lib/ai/imageProviders';
import { join } from 'path';
import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'fs';
import { execSync } from 'child_process';
import crypto from 'crypto';

const METADATA_FILE = join(process.cwd(), 'data', 'dish-image-metadata.json');
const GENERATED_DIR = join(process.cwd(), 'public', 'menu-images', 'generated');

export const dynamic = 'force-dynamic';

function getMetadataStore() {
  if (existsSync(METADATA_FILE)) {
    try {
      return JSON.parse(readFileSync(METADATA_FILE, 'utf-8'));
    } catch {
      return {};
    }
  }
  return {};
}

// ─── GET: Check Dish Image Status ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const dishId = searchParams.get('dishId');

  if (!dishId) {
    // Return summary statistics & available IDs
    const meta = getMetadataStore();
    const dishes = await getDishes();
    const availableDishIds = new Set<string>();
    
    // From metadata
    Object.keys(meta).forEach(id => availableDishIds.add(id));
    
    // From registry
    IMAGE_REGISTRY.forEach(e => {
      if (e.dishId) availableDishIds.add(e.dishId);
      if (e.id) availableDishIds.add(e.id);
    });

    return NextResponse.json({
      totalDishes: dishes.length,
      availableCount: availableDishIds.size,
      registryCount: IMAGE_REGISTRY.length,
      availableDishIds: Array.from(availableDishIds),
    });
  }

  const dish = await getDishById(dishId);
  if (!dish) {
    return NextResponse.json({ error: 'Dish not found' }, { status: 404 });
  }

  // Look in image registry
  const regEntry = IMAGE_REGISTRY.find(e => e.dishId === dishId || e.id === dishId);
  const metaStore = getMetadataStore();
  const meta = metaStore[dishId];

  let filename = regEntry?.filename || meta?.filename || null;
  let imageDataUri: string | null = null;

  if (filename) {
    imageDataUri = getImageAsBase64(filename);
  }

  const hasImage = !!imageDataUri;

  return NextResponse.json({
    dishId,
    dishName: dish.name,
    hasImage,
    status: hasImage ? 'AVAILABLE' : 'NOT_GENERATED',
    entry: regEntry || meta || null,
    imageDataUri,
  });
}

// ─── POST: Generate/Regenerate Single Dish Image ──────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { dishId, force, provider: providerName } = body as {
      dishId: string;
      force?: boolean;
      provider?: string;
    };

    if (!dishId) {
      return NextResponse.json({ error: 'dishId is required' }, { status: 400 });
    }

    const dish = await getDishById(dishId);
    if (!dish) {
      return NextResponse.json({ error: `Dish "${dishId}" not found` }, { status: 404 });
    }

    if (!existsSync(GENERATED_DIR)) {
      mkdirSync(GENERATED_DIR, { recursive: true });
    }

    const provider = getImageProvider(providerName);
    const result = await provider.generateImage(dish);

    if (!result.imageBuffer || result.imageBuffer.length < 200) {
      return NextResponse.json({ error: 'Failed to generate a valid image buffer.' }, { status: 500 });
    }

    let ext = '.jpg';
    if (result.mimeType === 'image/png') ext = '.png';
    if (result.imageBuffer.toString('utf-8', 0, 100).includes('<svg')) ext = '.svg';

    const filename = `${dish.id}${ext}`;
    const filePath = join(GENERATED_DIR, filename);

    writeFileSync(filePath, result.imageBuffer);

    // Save metadata
    const metaStore = getMetadataStore();
    const sha256 = crypto.createHash('sha256').update(result.imageBuffer).digest('hex');

    metaStore[dish.id] = {
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

    writeFileSync(METADATA_FILE, JSON.stringify(metaStore, null, 2), 'utf-8');

    // Trigger registry update
    try {
      execSync('node scripts/generate-image-registry.mjs', { stdio: 'pipe' });
    } catch (e: any) {
      console.warn('Image registry compiler warning:', e.message);
    }

    clearImageCache();
    const imageDataUri = getImageAsBase64(`generated/${filename}`);

    return NextResponse.json({
      success: true,
      dishId: dish.id,
      filename: `generated/${filename}`,
      imageDataUri,
      provider: result.provider,
      model: result.model,
      durationMs: result.durationMs,
    });
  } catch (err: any) {
    console.error('[Admin Dish Image API] Error:', err);
    return NextResponse.json({ error: err.message || 'Image generation failed.' }, { status: 500 });
  }
}
