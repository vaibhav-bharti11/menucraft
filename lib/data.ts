// lib/data.ts
// Data loaders for JSON seed files — in-memory cache with CRUD helpers
import fs from 'fs';
import path from 'path';
import type { Dish, Menu, CounterType } from './types';

const DATA_DIR = path.join(process.cwd(), 'data', 'seed');

// ─── File paths ───────────────────────────────────────────────────────────────

const DISHES_PATH = path.join(DATA_DIR, 'dishes.json');
const MENUS_PATH = path.join(DATA_DIR, 'menus.json');
const COUNTER_TYPES_PATH = path.join(DATA_DIR, 'counter_types.json');

// ─── Read helpers ─────────────────────────────────────────────────────────────

function readJson<T>(filePath: string): T {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as T;
}

function writeJson<T>(filePath: string, data: T): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 1), 'utf-8');
}

// ─── Dishes ───────────────────────────────────────────────────────────────────

export function getDishes(): Dish[] {
  return readJson<Dish[]>(DISHES_PATH);
}

export function getDishById(id: string): Dish | undefined {
  return getDishes().find(d => d.id === id);
}

export function saveDish(dish: Dish): void {
  const dishes = getDishes();
  const idx = dishes.findIndex(d => d.id === dish.id);
  if (idx >= 0) {
    dishes[idx] = dish;
  } else {
    dishes.push(dish);
  }
  writeJson(DISHES_PATH, dishes);
}

export function nextDishId(): string {
  const dishes = getDishes();
  const nums = dishes
    .map(d => parseInt(d.id.replace('dish-', ''), 10))
    .filter(n => !isNaN(n));
  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return `dish-${String(max + 1).padStart(4, '0')}`;
}

// ─── Menus ────────────────────────────────────────────────────────────────────

export function getMenus(): Menu[] {
  return readJson<Menu[]>(MENUS_PATH);
}

export function getMenuById(id: string): Menu | undefined {
  return getMenus().find(m => m.id === id);
}

export function saveMenu(menu: Menu): void {
  const menus = getMenus();
  const idx = menus.findIndex(m => m.id === menu.id);
  if (idx >= 0) {
    menus[idx] = menu;
  } else {
    menus.push(menu);
  }
  writeJson(MENUS_PATH, menus);
}

export function deleteMenu(id: string): void {
  const menus = getMenus().filter(m => m.id !== id);
  writeJson(MENUS_PATH, menus);
}

export function nextMenuId(): string {
  return `menu-${Date.now()}`;
}

// ─── Counter Types ────────────────────────────────────────────────────────────

export function getCounterTypes(): CounterType[] {
  return readJson<CounterType[]>(COUNTER_TYPES_PATH);
}

export function getCounterTypeById(id: string): CounterType | undefined {
  return getCounterTypes().find(ct => ct.id === id);
}

export function saveCounterType(ct: CounterType): void {
  const list = getCounterTypes();
  const idx = list.findIndex(c => c.id === ct.id);
  if (idx >= 0) {
    list[idx] = ct;
  } else {
    list.push(ct);
  }
  writeJson(COUNTER_TYPES_PATH, list);
}
