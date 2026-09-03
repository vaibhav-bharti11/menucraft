// app/api/generate-pdf/route.ts
// PDF generation — spawns standalone Node.js ESM worker (scripts/pdf-worker.mjs)
// Returns real binary PDF with HTML fallback if worker fails.
//
// Both Preview PDF and Export PDF call this same route.
// The 'preview' flag only changes Content-Disposition (inline vs attachment).

import { NextRequest, NextResponse } from 'next/server';
import { buildPremiumClassicHtml } from '@/lib/pdf/premiumClassic';
import { buildModernHtml } from '@/lib/pdf/modern';
import { sanitizeFilenamePart, clearImageCache } from '@/lib/pdf/helpers';
import type { PdfRequest } from '@/lib/types';
import { format, parseISO } from 'date-fns';
import { writeFileSync, readFileSync, unlinkSync, existsSync } from 'fs';
import { spawn } from 'child_process';
import { join } from 'path';
import { tmpdir } from 'os';

/**
 * Build a professional filename: The-Embassy-Catering-ClientName-18-August-2026.pdf
 */
function buildFilename(menu: PdfRequest['menu']): string {
  const clientPart = sanitizeFilenamePart(menu.client_name || 'Client');
  let datePart = 'Proposal';
  try {
    if (menu.event_date) {
      const d = menu.event_date.includes('T') ? parseISO(menu.event_date) : new Date(menu.event_date);
      if (!isNaN(d.getTime())) {
        datePart = format(d, 'd-MMMM-yyyy');
      }
    }
  } catch {
    // fallback to 'Proposal'
  }
  return `The-Embassy-Catering-${clientPart}-${datePart}.pdf`;
}

/** Spawn the ESM pdf-worker.mjs in a fresh Node.js process. */
function spawnPdfWorker(htmlPath: string, pdfPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const workerPath = join(process.cwd(), 'scripts', 'pdf-worker.mjs');
    const child = spawn(process.execPath, [workerPath, htmlPath, pdfPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 90_000, // increased for image-heavy pages
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
  let body: PdfRequest & { preview?: boolean };
  try {
    body = (await req.json()) as PdfRequest & { preview?: boolean };
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { menu, mode, preview, returnHtml } = body as PdfRequest & { preview?: boolean; returnHtml?: boolean };

  if (!menu) {
    return NextResponse.json({ error: 'No menu data provided' }, { status: 400 });
  }

  // Image cache is now smartly managed with mtime in helpers.ts
  // clearImageCache();

  // Build HTML — classic mode now uses the premium builder
  let html: string;
  try {
    html = mode === 'modern' ? buildModernHtml(menu) : buildPremiumClassicHtml(menu);
  } catch (buildErr) {
    console.error('[generate-pdf] HTML build failed:', buildErr);
    return NextResponse.json({ error: 'Failed to build PDF content' }, { status: 500 });
  }

  if (returnHtml) {
    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  }

  const filename = buildFilename(menu);

  // Temp file paths in OS temp dir
  const ts = `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const htmlTmp = join(tmpdir(), `embassy-menu-${ts}.html`);
  const pdfTmp = join(tmpdir(), `embassy-menu-${ts}.pdf`);

  try {
    writeFileSync(htmlTmp, html, 'utf-8');

    await spawnPdfWorker(htmlTmp, pdfTmp);

    const pdfBuffer = readFileSync(pdfTmp);
    // inline = Preview in browser tab; attachment = download
    const disposition = preview
      ? `inline; filename="${filename}"`
      : `attachment; filename="${filename}"`;

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': disposition,
        'X-PDF-Mode': 'puppeteer',
        'X-PDF-Filename': filename,
      },
    });
  } catch (err) {
    // Graceful fallback: return the HTML so Puppeteer failure doesn't brick the UX
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
    // Always clean up temp files
    try { if (existsSync(htmlTmp)) unlinkSync(htmlTmp); } catch {}
    try { if (existsSync(pdfTmp)) unlinkSync(pdfTmp); } catch {}
  }
}
