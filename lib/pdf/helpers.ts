// lib/pdf/helpers.ts
// Shared utilities and safe formatters for PDF generation

import { format, parseISO } from 'date-fns';
import { readFileSync, existsSync, statSync } from 'fs';
import { join, extname } from 'path';

export function escapeHtml(str?: string | null): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function formatEventDate(dateStr?: string | null): string {
  if (!dateStr || dateStr.trim() === '') return 'Date on Request';
  try {
    const d = dateStr.includes('T') ? parseISO(dateStr) : new Date(dateStr);
    if (isNaN(d.getTime())) return escapeHtml(dateStr);
    return format(d, 'EEEE, d MMMM yyyy');
  } catch {
    return escapeHtml(dateStr);
  }
}

export function formatShortDate(dateStr?: string | null): string {
  if (!dateStr || dateStr.trim() === '') return '';
  try {
    const d = dateStr.includes('T') ? parseISO(dateStr) : new Date(dateStr);
    if (isNaN(d.getTime())) return escapeHtml(dateStr);
    return format(d, 'd MMMM yyyy');
  } catch {
    return escapeHtml(dateStr);
  }
}

export function formatGuestCount(guestStr?: string | number | null): string {
  if (guestStr === null || guestStr === undefined) return 'To be confirmed';
  const clean = String(guestStr).trim();
  if (!clean) return 'To be confirmed';
  if (/pax/i.test(clean)) return clean;
  return `${clean} Pax`;
}

export function formatText(val?: string | null, fallback = ''): string {
  if (!val || val.trim() === '') return fallback;
  return escapeHtml(val.trim());
}

export function formatMultiline(val?: string | null): string {
  if (!val || val.trim() === '') return '';
  return escapeHtml(val.trim()).replace(/\n/g, '<br>');
}

export function sanitizeFilenamePart(str: string): string {
  return str
    .replace(/[^\x00-\x7F]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '') || 'Proposal';
}

// ─── Server-side Image Utilities ─────────────────────────────────────────────
// Used in PDF builders (server-side Node.js context only)

const IMAGE_DIR = join(process.cwd(), 'public', 'menu-images');

const MIME_MAP: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
};

/** Cache: normalizedKey → { dataUri: string | null, mtime: number } */
const _imageCache = new Map<string, { dataUri: string | null, mtime: number }>();

/**
 * Read a food image from public/menu-images/ (or public/menu-images/generated/)
 * and return a Base64 data URI.
 * Returns null if the file does not exist (allows graceful fallback).
 * Safe to call from the Next.js API route (server-side only).
 */
export function getImageAsBase64(filename: string, subfolder: string = 'generated'): string | null {
  if (!filename) return null;

  const normalizedKey = `${subfolder}/${filename}`;

  // Potential candidate paths
  const candidatePaths = [
    join(IMAGE_DIR, subfolder, filename),
    join(IMAGE_DIR, filename),
    join(process.cwd(), 'public', filename),
  ];

  let resolvedPath: string | null = null;
  for (const p of candidatePaths) {
    if (existsSync(p)) {
      resolvedPath = p;
      break;
    }
  }

  if (!resolvedPath) {
    _imageCache.delete(normalizedKey);
    return null;
  }

  try {
    const mtime = statSync(resolvedPath).mtimeMs;

    const cached = _imageCache.get(normalizedKey);
    if (cached && cached.mtime === mtime) {
      return cached.dataUri;
    }

    const ext = extname(resolvedPath).toLowerCase();
    const mime = MIME_MAP[ext] ?? 'image/jpeg';
    const b64 = readFileSync(resolvedPath).toString('base64');
    const dataUri = `data:${mime};base64,${b64}`;
    
    _imageCache.set(normalizedKey, { dataUri, mtime });
    return dataUri;
  } catch {
    _imageCache.delete(normalizedKey);
    return null;
  }
}

/** Clear the per-request image cache (useful in tests). */
export function clearImageCache(): void {
  _imageCache.clear();
}
