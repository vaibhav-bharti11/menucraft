// scripts/pdf-worker.mjs
// Standalone ESM Node.js script — spawned by app/api/generate-pdf/route.ts
// Runs OUTSIDE Next.js/webpack so ESM imports work correctly.
//
// Uses puppeteer-core with system Chrome or Edge to render HTML → high-fidelity real PDF.
// Usage: node scripts/pdf-worker.mjs <html_file> <output_pdf_file>

import puppeteerCore from 'puppeteer-core';
import { readFileSync, writeFileSync, existsSync } from 'fs';

const CANDIDATE_CHROME_PATHS = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/usr/bin/chromium',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);

function findChromePath() {
  for (const p of CANDIDATE_CHROME_PATHS) {
    if (existsSync(p)) return p;
  }
  return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
}

const [, , htmlFile, outFile] = process.argv;

if (!htmlFile || !outFile) {
  console.error('Usage: node pdf-worker.mjs <html_file> <output_file>');
  process.exit(1);
}

const html = readFileSync(htmlFile, 'utf-8');
const executablePath = findChromePath();

let browser;
try {
  browser = await puppeteerCore.launch({
    executablePath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--font-render-hinting=none',
      '--run-all-compositor-stages-before-draw',
    ],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 1600, deviceScaleFactor: 2 });

  // Use domcontentloaded for fast HTML rendering, followed by fonts ready
  await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 15000 });

  // Wait for document fonts to be ready with a safety timeout
  try {
    await Promise.race([
      page.evaluateHandle('document.fonts.ready'),
      new Promise(resolve => setTimeout(resolve, 6000))
    ]);
  } catch (fontErr) {
    console.warn('Font loading warning:', fontErr.message);
  }

  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: '0', bottom: '0', left: '0', right: '0' },
  });

  await browser.close();

  writeFileSync(outFile, pdfBuffer);
  console.log(`PDF written: ${outFile} (${pdfBuffer.length} bytes)`);
  process.exit(0);
} catch (err) {
  if (browser) {
    try { await browser.close(); } catch {}
  }
  console.error('PDF worker error:', err.message);
  process.exit(1);
}
