// lib/data.ts
// Data loaders for JSON seed files, Supabase, or Netlify Blobs persistence.
import fs from 'fs';
import path from 'path';
import type { Dish, Menu, CounterType } from './types';
import { getStore } from '@netlify/blobs';

const DATA_DIR = path.join(process.cwd(), 'data', 'seed');

const DISHES_PATH = path.join(DATA_DIR, 'dishes.json');
const MENUS_PATH = path.join(DATA_DIR, 'menus.json');
const COUNTER_TYPES_PATH = path.join(DATA_DIR, 'counter_types.json');

// --- Supabase Configuration ---
const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const useSupabase = !!(SUPABASE_URL && SUPABASE_ANON_KEY);

// --- Netlify Blobs Configuration ---
const useNetlifyBlobs = !!(process.env.NETLIFY || process.env.NETLIFY_BLOBS_API_URL || process.env.NETLIFY_DEV);

// ─── PostgREST fetch helper ───────────────────────────────────────────────────

async function supabaseFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${SUPABASE_URL}/rest/v1/${endpoint}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'apikey': SUPABASE_ANON_KEY!,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY!}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase error [${res.status}]: ${text}`);
  }
  const text = await res.text();
  if (!text) {
    return {} as T;
  }
  return JSON.parse(text) as T;
}

// ─── Read/Write JSON helpers ──────────────────────────────────────────────────

function readJson<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

function writeJson<T>(filePath: string, data: T): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 1), 'utf-8');
}

// ─── Netlify Blobs helpers ────────────────────────────────────────────────────
// ponytail: O(n) array replacement in blob storage, fine for phase 1 scale, upgrade to indexed keys if arrays grow to megabytes
async function readBlobOrJson<T>(key: string, localFilePath: string): Promise<T> {
  if (useNetlifyBlobs) {
    try {
      const store = getStore('menucraft-store');
      const val = await store.get(key, { type: 'text' });
      if (val) {
        return JSON.parse(val) as T;
      }
      // Seed from local file if blob is empty
      const seedData = readJson<T>(localFilePath);
      await store.set(key, JSON.stringify(seedData));
      return seedData;
    } catch (err) {
      console.warn(`[Netlify Blobs] Failed to read ${key}, falling back to JSON:`, err);
    }
  }
  return readJson<T>(localFilePath);
}

async function writeBlobOrJson<T>(key: string, localFilePath: string, data: T): Promise<void> {
  if (useNetlifyBlobs) {
    try {
      const store = getStore('menucraft-store');
      await store.set(key, JSON.stringify(data));
      return;
    } catch (err) {
      console.warn(`[Netlify Blobs] Failed to write ${key}, falling back to JSON:`, err);
    }
  }
  writeJson(localFilePath, data);
}

// ─── Dishes ───────────────────────────────────────────────────────────────────

export async function getDishes(): Promise<Dish[]> {
  if (useSupabase) {
    return supabaseFetch<Dish[]>('dishes?select=*&order=name.asc');
  }
  return readBlobOrJson<Dish[]>('dishes', DISHES_PATH);
}

export async function getDishById(id: string): Promise<Dish | undefined> {
  if (useSupabase) {
    const list = await supabaseFetch<Dish[]>(`dishes?id=eq.${id}&select=*`);
    return list[0];
  }
  const dishes = await getDishes();
  return dishes.find(d => d.id === id);
}

export async function saveDish(dish: Dish): Promise<void> {
  if (useSupabase) {
    await supabaseFetch('dishes', {
      method: 'POST',
      headers: {
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify(dish),
    });
    return;
  }
  const dishes = await getDishes();
  const idx = dishes.findIndex(d => d.id === dish.id);
  if (idx >= 0) {
    dishes[idx] = dish;
  } else {
    dishes.push(dish);
  }
  await writeBlobOrJson('dishes', DISHES_PATH, dishes);
}

export async function nextDishId(): Promise<string> {
  if (useSupabase) {
    const list = await supabaseFetch<{ id: string }[]>('dishes?select=id');
    const nums = list
      .map(d => parseInt(d.id.replace('dish-', ''), 10))
      .filter(n => !isNaN(n));
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return `dish-${String(max + 1).padStart(4, '0')}`;
  }
  const dishes = await getDishes();
  const nums = dishes
    .map(d => parseInt(d.id.replace('dish-', ''), 10))
    .filter(n => !isNaN(n));
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return `dish-${String(max + 1).padStart(4, '0')}`;
}

// ─── Menus ────────────────────────────────────────────────────────────────────

export async function getMenus(): Promise<Menu[]> {
  if (useSupabase) {
    return supabaseFetch<Menu[]>('menus?select=*&order=created_at.desc');
  }
  return readBlobOrJson<Menu[]>('menus', MENUS_PATH);
}

export async function getMenuById(id: string): Promise<Menu | undefined> {
  if (useSupabase) {
    const list = await supabaseFetch<Menu[]>(`menus?id=eq.${id}&select=*`);
    return list[0];
  }
  const menus = await getMenus();
  return menus.find(m => m.id === id);
}

export async function saveMenu(menu: Menu): Promise<void> {
  if (useSupabase) {
    await supabaseFetch('menus', {
      method: 'POST',
      headers: {
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify(menu),
    });
    return;
  }
  const menus = await getMenus();
  const idx = menus.findIndex(m => m.id === menu.id);
  if (idx >= 0) {
    menus[idx] = menu;
  } else {
    menus.push(menu);
  }
  await writeBlobOrJson('menus', MENUS_PATH, menus);
}

export async function deleteMenu(id: string): Promise<void> {
  if (useSupabase) {
    await supabaseFetch(`menus?id=eq.${id}`, {
      method: 'DELETE',
    });
    return;
  }
  const menus = (await getMenus()).filter(m => m.id !== id);
  await writeBlobOrJson('menus', MENUS_PATH, menus);
}

export function nextMenuId(): string {
  return `menu-${Date.now()}`;
}

// ─── Counter Types ────────────────────────────────────────────────────────────

export async function getCounterTypes(): Promise<CounterType[]> {
  if (useSupabase) {
    return supabaseFetch<CounterType[]>('counter_types?select=*&order=sort_order.asc');
  }
  return readBlobOrJson<CounterType[]>('counter_types', COUNTER_TYPES_PATH);
}

export async function getCounterTypeById(id: string): Promise<CounterType | undefined> {
  if (useSupabase) {
    const list = await supabaseFetch<CounterType[]>(`counter_types?id=eq.${id}&select=*`);
    return list[0];
  }
  const list = await getCounterTypes();
  return list.find(ct => ct.id === id);
}

export async function saveCounterType(ct: CounterType): Promise<void> {
  if (useSupabase) {
    await supabaseFetch('counter_types', {
      method: 'POST',
      headers: {
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify(ct),
    });
    return;
  }
  const list = await getCounterTypes();
  const idx = list.findIndex(c => c.id === ct.id);
  if (idx >= 0) {
    list[idx] = ct;
  } else {
    list.push(ct);
  }
  await writeBlobOrJson('counter_types', COUNTER_TYPES_PATH, list);
}
