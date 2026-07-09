// app/api/counter-types/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCounterTypes, saveCounterType } from '@/lib/data';
import type { CounterType } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(getCounterTypes());
}

export async function POST(req: NextRequest) {
  const body = await req.json() as Partial<CounterType>;
  const list = getCounterTypes();
  const maxOrder = list.reduce((m, c) => Math.max(m, c.sort_order), 0);
  const ct: CounterType = {
    id: body.id ?? body.display_name!.toLowerCase().replace(/\s+/g, '-'),
    display_name: body.display_name ?? '',
    category: body.category ?? 'Other',
    default_description: body.default_description ?? '',
    veg_section_label: body.veg_section_label ?? 'Vegetarian',
    non_veg_section_label: body.non_veg_section_label ?? 'Non Vegetarian',
    sort_order: body.sort_order ?? maxOrder + 1,
    is_active: body.is_active ?? true,
  };
  saveCounterType(ct);
  return NextResponse.json(ct, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json() as Partial<CounterType> & { id: string };
  const list = getCounterTypes();
  const existing = list.find(c => c.id === body.id);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  saveCounterType({ ...existing, ...body });
  return NextResponse.json({ ...existing, ...body });
}
