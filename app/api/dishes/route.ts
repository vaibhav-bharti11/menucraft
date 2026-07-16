// app/api/dishes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getDishes, saveDish, nextDishId } from '@/lib/data';
import type { Dish } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  const dishes = await getDishes();
  return NextResponse.json(dishes);
}

export async function POST(req: NextRequest) {
  const body = await req.json() as Partial<Dish>;
  const newDish: Dish = {
    id: await nextDishId(),
    name: body.name ?? '',
    description: body.description ?? '',
    dietary: body.dietary ?? 'VEG',
    cuisine_tags: body.cuisine_tags ?? [],
    course_tags: body.course_tags ?? [],
    counter_type_ids: body.counter_type_ids ?? [],
    is_signature: body.is_signature ?? false,
    is_active: body.is_active ?? true,
    created_by: body.created_by ?? 'Admin',
    updated_at: new Date().toISOString(),
    source: body.source,
  };
  await saveDish(newDish);
  return NextResponse.json(newDish, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json() as Partial<Dish> & { id: string };
  const dishes = await getDishes();
  const existing = dishes.find(d => d.id === body.id);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const updated: Dish = { ...existing, ...body, updated_at: new Date().toISOString() };
  await saveDish(updated);
  return NextResponse.json(updated);
}
