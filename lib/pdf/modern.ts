// lib/pdf/modern.ts
// Modern Premium PDF — Hermès/Aesop aesthetic (PRD Section 04, 3B)

import type { Menu, MenuCounter } from '../types';
import { format } from 'date-fns';

function formatEventDate(dateStr: string): string {
  try { return format(new Date(dateStr), 'd MMMM yyyy'); }
  catch { return dateStr; }
}

function renderModernSections(counter: MenuCounter): string {
  return counter.sections.map(section => {
    return section.dishes.map(d => {
      const dotColor = section.kind === 'NON_VEG' ? '#8B1A1A' : '#2E7D32';
      return `
      <div class="dish-row">
        <span class="dot" style="background:${dotColor}"></span>
        <div class="dish-content">
          <div class="dish-name">${d.name}</div>
          ${d.description ? `<div class="dish-desc">${d.description}</div>` : ''}
        </div>
      </div>`;
    }).join('');
  }).join('');
}

function renderModernAccompaniments(counter: MenuCounter): string {
  if (!counter.accompaniments) return '';
  return `
    <div class="modern-accompaniments">
      <span class="acc-label">${counter.accompaniments_label || 'Accompaniments'}</span>
      <span class="acc-items">${counter.accompaniments}</span>
    </div>
  `;
}

function renderModernCounter(counter: MenuCounter): string {
  return `
    <div class="counter-block">
      <div class="counter-title">${counter.display_name}</div>
      ${counter.description ? `<div class="counter-desc">${counter.description}</div>` : ''}
      <div class="counter-rule"></div>
      ${renderModernSections(counter)}
      ${renderModernAccompaniments(counter)}
    </div>
  `;
}

export function buildModernHtml(menu: Menu): string {
  const eventDate = formatEventDate(menu.event_date);
  const countersHtml = menu.counters.map(c => renderModernCounter(c)).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Embassy Catering — ${menu.client_name}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400;1,600&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Jost', system-ui, sans-serif;
      background: #FAF7F2;
      color: #1A1A1A;
      font-size: 10pt;
      line-height: 1.7;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    @page {
      size: A4 portrait;
      margin: 28mm 36mm;
    }

    @media print {
      body { background: #FAF7F2 !important; }
      .counter-rule {
        background: linear-gradient(90deg, #C9A84C, transparent) !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .signoff {
        border-top: 1pt solid #C9A84C !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }

    /* ── Cover Header ─────────────────────────────────────────── */
    .cover-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 16pt;
      border-bottom: 1pt solid #C9A84C;
      margin-bottom: 40pt;
    }

    .wordmark-embassy {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-style: italic;
      font-size: 22pt;
      font-weight: 600;
      color: #8B1A1A;
    }
    .wordmark-est {
      font-size: 7pt;
      letter-spacing: 0.18em;
      color: #888;
      margin-top: 3pt;
      font-weight: 400;
    }

    .client-info { text-align: right; }
    .client-name {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 16pt;
      font-weight: 600;
      color: #1A1A1A;
    }
    .event-meta {
      font-size: 9pt;
      color: #888;
      margin-top: 4pt;
      line-height: 1.6;
    }

    /* ── Event Details Block ──────────────────────────────────── */
    .event-details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 4pt 32pt;
      margin-bottom: 40pt;
      padding-bottom: 28pt;
      border-bottom: 1pt solid #D4C4A8;
    }
    .detail-item .d-label {
      font-size: 7pt;
      letter-spacing: 0.15em;
      text-transform: uppercase;
      color: #8B1A1A;
      font-weight: 600;
      margin-bottom: 2pt;
    }
    .detail-item .d-value {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 13pt;
      color: #1A1A1A;
      font-weight: 500;
    }

    /* ── Counter Blocks ───────────────────────────────────────── */
    .counter-block {
      margin-bottom: 32pt;
      padding-bottom: 28pt;
      border-bottom: 1pt solid #D4C4A8;
    }
    .counter-block:last-child {
      border-bottom: none;
    }

    .counter-title {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 14pt;
      font-weight: 500;
      color: #8B1A1A;
      margin-bottom: 4pt;
      letter-spacing: 0.01em;
    }

    .counter-desc {
      font-size: 9pt;
      color: #888;
      font-style: italic;
      margin-bottom: 2pt;
      line-height: 1.5;
    }

    .counter-rule {
      width: 100%;
      height: 1pt;
      background: linear-gradient(90deg, #C9A84C, transparent);
      margin: 10pt 0 14pt;
    }

    /* ── Dish Rows ────────────────────────────────────────────── */
    .dish-row {
      display: flex;
      align-items: flex-start;
      gap: 12pt;
      margin-bottom: 12pt;
    }

    .dot {
      width: 6pt;
      height: 6pt;
      border-radius: 50%;
      flex-shrink: 0;
      margin-top: 4pt;
    }

    .dish-content { flex: 1; }

    .dish-name {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 11pt;
      font-weight: 600;
      color: #1A1A1A;
    }

    .dish-desc {
      font-size: 9pt;
      font-style: italic;
      color: #888;
      margin-top: 1pt;
      line-height: 1.5;
    }

    /* ── Accompaniments ───────────────────────────────────────── */
    .modern-accompaniments {
      margin-top: 10pt;
      padding-top: 8pt;
    }
    .acc-label {
      font-size: 9pt;
      font-weight: 600;
      color: #8B1A1A;
      margin-right: 6pt;
    }
    .acc-items {
      font-size: 9pt;
      color: #888;
    }

    /* ── Sign-off ─────────────────────────────────────────────── */
    .signoff {
      margin-top: 40pt;
      text-align: right;
      border-top: 1pt solid #C9A84C;
      padding-top: 16pt;
    }
    .signoff-name {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 13pt;
      font-weight: 500;
      color: #1A1A1A;
    }
    .signoff-contact {
      font-size: 9pt;
      color: #888;
      margin-top: 2pt;
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="cover-header">
    <div>
      <div class="wordmark-embassy">The Embassy</div>
      <div class="wordmark-est">Est. 1948 · Okhla, Delhi NCR</div>
    </div>
    <div class="client-info">
      <div class="client-name">${menu.client_name}</div>
      <div class="event-meta">
        ${eventDate}<br>
        ${menu.function_type} · ${menu.guest_count}<br>
        ${menu.venue}
      </div>
    </div>
  </div>

  <!-- EVENT DETAILS -->
  <div class="event-details">
    <div class="detail-item">
      <div class="d-label">Function</div>
      <div class="d-value">${menu.function_type}</div>
    </div>
    <div class="detail-item">
      <div class="d-label">Guests</div>
      <div class="d-value">${menu.guest_count}</div>
    </div>
    <div class="detail-item">
      <div class="d-label">Date</div>
      <div class="d-value">${eventDate}</div>
    </div>
    <div class="detail-item">
      <div class="d-label">Venue</div>
      <div class="d-value">${menu.venue}</div>
    </div>
  </div>

  <!-- COUNTERS -->
  ${countersHtml}

  <!-- SIGN-OFF -->
  <div class="signoff">
    <div class="signoff-name">${menu.signed_by_name}</div>
    <div class="signoff-contact">${menu.signed_by_phone}</div>
  </div>

</body>
</html>`;
}
