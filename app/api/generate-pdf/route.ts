// app/api/generate-pdf/route.ts
// PDF generation — spawns a standalone Node.js ESM worker (scripts/pdf-worker.mjs)
// that uses puppeteer-core + @sparticuz/chromium outside of webpack bundling.
// Falls back to returning HTML for browser print if the worker fails.

import { NextRequest, NextResponse } from 'next/server';
import { buildClassicHtml } from '@/lib/pdf/classic';
import { buildModernHtml } from '@/lib/pdf/modern';
import type { PdfRequest } from '@/lib/types';
import { format } from 'date-fns';
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'fs';
import { spawn } from 'child_process';
import { join } from 'path';
import { tmpdir } from 'os';

function buildFilename(menu: PdfRequest['menu'], mode: string): string {
  let clientLast = menu.client_name.split(' ').pop() ?? menu.client_name;
  let dateStr = menu.event_date;
  try {
    dateStr = format(new Date(menu.event_date), 'ddMMMyyyy');
  } catch {
    // keep raw
  }
  let guestStr = menu.guest_count.replace(/\s+/g, '');

  // Sanitize non-ASCII characters from headers (e.g. en-dash \u2013 -> hyphen)
  // Also clean out non-safe filename characters
  clientLast = clientLast.replace(/[^\x00-\x7F]/g, '').replace(/[^a-zA-Z0-9_-]/g, '') || 'Menu';
  dateStr = dateStr.replace(/[^\x00-\x7F]/g, '').replace(/[^a-zA-Z0-9_-]/g, '') || 'Date';
  guestStr = guestStr.replace(/[^\x00-\x7F]/g, '-').replace(/[^a-zA-Z0-9_-]/g, '') || 'Guests';

  const modeLabel = mode === 'modern' ? 'Modern' : 'Classic';
  return `EMBASSY_${clientLast}_${dateStr}_${guestStr}_${modeLabel}.pdf`;
}

/** Spawn the ESM pdf-worker.mjs in a fresh Node.js process. */
function spawnPdfWorker(htmlPath: string, pdfPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const workerPath = join(process.cwd(), 'scripts', 'pdf-worker.mjs');
    const child = spawn(process.execPath, [workerPath, htmlPath, pdfPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 60_000,
    });

    let stderr = '';
    child.stderr?.on('data', (d: Buffer) => { stderr += d.toString(); });

    child.on('close', (code: number) => {
      if (code === 0) resolve();
      else reject(new Error(`pdf-worker exited ${code}: ${stderr}`));
    });

    child.on('error', reject);
  });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as PdfRequest;
  const { menu, mode } = body;

  const html = mode === 'modern' ? buildModernHtml(menu) : buildClassicHtml(menu);
  const filename = buildFilename(menu, mode);

  // Temp file paths in OS temp dir
  const ts = Date.now();
  const htmlTmp = join(tmpdir(), `embassy-menu-${ts}.html`);
  const pdfTmp  = join(tmpdir(), `embassy-menu-${ts}.pdf`);

  try {
    writeFileSync(htmlTmp, html, 'utf-8');

    await spawnPdfWorker(htmlTmp, pdfTmp);

    const pdfBuffer = readFileSync(pdfTmp);

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-PDF-Mode': 'puppeteer',
      },
    });
  } catch (err) {
    console.error('[generate-pdf] Worker failed, returning HTML fallback:', err);
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-PDF-Filename': filename,
        'X-PDF-Mode': 'html-fallback',
      },
    });
  } finally {
    // Clean up temp files
    try { if (existsSync(htmlTmp)) unlinkSync(htmlTmp); } catch {}
    try { if (existsSync(pdfTmp))  unlinkSync(pdfTmp);  } catch {}
  }
}
