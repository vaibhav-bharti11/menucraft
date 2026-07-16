// app/api/menus/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getMenus, getMenuById, saveMenu, deleteMenu, nextMenuId } from '@/lib/data';
import type { Menu } from '@/lib/types';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (id) {
    const menu = await getMenuById(id);
    if (!menu) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(menu);
  }
  return NextResponse.json(await getMenus());
}

export async function POST(req: NextRequest) {
  const body = await req.json() as Partial<Menu>;
  const now = new Date().toISOString();
  const newMenu: Menu = {
    id: nextMenuId(),
    client_name: body.client_name ?? '',
    event_date: body.event_date ?? '',
    function_type: body.function_type ?? 'Dinner',
    guest_count: body.guest_count ?? '',
    venue: body.venue ?? '',
    requirements_note: body.requirements_note ?? 'Water proof Kitchen area with water & light',
    exclusions_note: body.exclusions_note ?? 'Tenting related items\nFlorist',
    signed_by_name: body.signed_by_name ?? 'Pranay Bahl',
    signed_by_phone: body.signed_by_phone ?? '9899004852',
    status: body.status ?? 'DRAFT',
    created_at: now,
    updated_at: now,
    counters: body.counters ?? [],
  };
  await saveMenu(newMenu);
  return NextResponse.json(newMenu, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const body = await req.json() as Menu;
  const existing = await getMenuById(body.id);
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const updated: Menu = { ...existing, ...body, updated_at: new Date().toISOString() };
  await saveMenu(updated);
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await deleteMenu(id);
  return NextResponse.json({ ok: true });
}
