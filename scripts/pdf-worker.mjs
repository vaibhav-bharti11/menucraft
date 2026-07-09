// scripts/pdf-worker.mjs
// Standalone ESM Node.js script — spawned by app/api/generate-pdf/route.ts
// Runs OUTSIDE Next.js/webpack so ESM imports work correctly.
//
// Uses puppeteer-core with system Chrome to render HTML → real PDF.
// Usage: node scripts/pdf-worker.mjs <html_file> <output_pdf_file>

import puppeteerCore from 'puppeteer-core';
import { readFileSync, writeFileSync } from 'fs';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const [, , htmlFile, outFile] = process.argv;

if (!htmlFile || !outFile) {
  console.error('Usage: node pdf-worker.mjs <html_file> <output_file>');
  process.exit(1);
}

const html = readFileSync(htmlFile, 'utf-8');

let browser;
try {
  browser = await puppeteerCore.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--run-all-compositor-stages-before-draw',
    ],
  });

  const page = await browser.newPage();

  // networkidle0 ensures Google Fonts finish loading before we render
  await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

  const pdfBuffer = await page.pdf({
    format: 'A4',
    printBackground: true,
    // The HTML templates define their own @page margins
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
