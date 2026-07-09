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
    if (section.dishes.length === 0) return '';
    const sectionLabel = section.label || (section.kind === 'NON_VEG' ? 'Non Vegetarian' : 'Vegetarian');
    const dishesHtml = section.dishes.map(d => `
      <div class="dish-block">
        <div class="dish-name">${d.name}</div>
        ${d.description ? `<div class="dish-desc">${d.description}</div>` : ''}
      </div>
    `).join('');

    return `
      <div class="section-block">
        <div class="section-title">${sectionLabel}</div>
        <div class="dishes-list">
          ${dishesHtml}
        </div>
      </div>
    `;
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
  const hasDishes = counter.sections.some(s => s.dishes.length > 0);
  if (!hasDishes) return '';

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
      margin: 28mm 32mm;
    }

    @media print {
      body { background: #FAF7F2 !important; }
      .counter-rule {
        background: linear-gradient(90deg, #C9A84C, transparent) !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .signoff {
        border-top: 0.5pt solid rgba(201, 168, 76, 0.3) !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }

    /* ── Cover Header ─────────────────────────────────────────── */
    .cover-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding-bottom: 14pt;
      border-bottom: 0.5pt solid rgba(201, 168, 76, 0.3);
      margin-bottom: 30pt;
    }

    .wordmark-embassy {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-style: italic;
      font-size: 24pt;
      font-weight: 600;
      color: #8B1A1A;
    }
    .wordmark-est {
      font-size: 7.5pt;
      letter-spacing: 0.22em;
      color: #888;
      margin-top: 3pt;
      font-weight: 500;
      text-transform: uppercase;
    }

    /* ── Proposal Title Block ─────────────────────────────────── */
    .proposal-title-block {
      margin-bottom: 32pt;
      margin-top: 10pt;
    }
    .proposal-eyebrow {
      font-family: 'Jost', sans-serif;
      font-size: 8.5pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.32em;
      color: #C9A84C;
      display: block;
      margin-bottom: 4pt;
    }
    .proposal-client-name {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 28pt;
      font-weight: 300;
      color: #1A1A1A;
      line-height: 1.1;
      font-style: italic;
    }

    /* ── Event Details Block ──────────────────────────────────── */
    .event-details {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16pt;
      margin-bottom: 35pt;
      padding: 14pt 0;
      border-top: 0.5pt solid rgba(201, 168, 76, 0.2);
      border-bottom: 0.5pt solid rgba(201, 168, 76, 0.2);
    }
    .detail-item .d-label {
      font-size: 7pt;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #8B1A1A;
      font-weight: 600;
      margin-bottom: 3pt;
    }
    .detail-item .d-value {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 13pt;
      color: #1A1A1A;
      font-weight: 500;
    }

    /* ── Counter Blocks ───────────────────────────────────────── */
    .counter-block {
      margin-bottom: 28pt;
      padding-bottom: 8pt;
      page-break-inside: avoid;
    }

    .counter-title {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 17pt;
      font-weight: 400;
      color: #8B1A1A;
      margin-bottom: 3pt;
      letter-spacing: 0.02em;
    }

    .counter-desc {
      font-size: 9pt;
      color: #777;
      font-style: italic;
      margin-bottom: 4pt;
      line-height: 1.5;
    }

    .counter-rule {
      width: 100%;
      height: 1pt;
      background: linear-gradient(90deg, #C9A84C, transparent);
      margin: 8pt 0 10pt;
    }

    /* ── Section Blocks (Veg / Non-Veg grouping) ──────────────── */
    .section-block {
      margin-bottom: 16pt;
    }
    .section-block:last-of-type {
      margin-bottom: 8pt;
    }
    .section-title {
      font-family: 'Jost', sans-serif;
      font-size: 7.5pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.22em;
      color: #C9A84C;
      margin-bottom: 8pt;
      margin-top: 14pt;
    }

    /* ── Dish Rows ────────────────────────────────────────────── */
    .dishes-list {
      display: grid;
      grid-template-columns: 1fr;
      gap: 10pt;
      padding-left: 2pt;
    }

    .dish-block {
      page-break-inside: avoid;
    }

    .dish-name {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 12pt;
      font-weight: 600;
      color: #1A1A1A;
      line-height: 1.25;
    }

    .dish-desc {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 9.5pt;
      font-style: italic;
      color: #666;
      margin-top: 1.5pt;
      line-height: 1.45;
      padding-left: 8pt;
    }

    /* ── Accompaniments ───────────────────────────────────────── */
    .modern-accompaniments {
      margin-top: 14pt;
      padding-top: 10pt;
      border-top: 0.5pt dashed rgba(0, 0, 0, 0.08);
      font-size: 9pt;
    }
    .acc-label {
      font-weight: 600;
      color: #8B1A1A;
      margin-right: 6pt;
      font-size: 8.5pt;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }
    .acc-items {
      color: #666;
      font-style: italic;
    }

    /* ── Sign-off ─────────────────────────────────────────────── */
    .signoff {
      margin-top: 40pt;
      text-align: right;
      border-top: 0.5pt solid rgba(201, 168, 76, 0.3);
      padding-top: 16pt;
      page-break-inside: avoid;
    }
    .signoff-name {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 14pt;
      font-weight: 500;
      color: #1A1A1A;
    }
    .signoff-contact {
      font-size: 9pt;
      color: #888;
      margin-top: 2.5pt;
    }
  </style>
</head>
<body>

  <!-- HEADER -->
  <div class="cover-header">
    <div>
      <div class="wordmark-embassy">The Embassy</div>
      <div class="wordmark-est">Est. 1948 · Delhi NCR</div>
    </div>
  </div>

  <!-- PROPOSAL TITLE -->
  <div class="proposal-title-block">
    <span class="proposal-eyebrow">Catering Proposal</span>
    <h1 class="proposal-client-name">${menu.client_name}</h1>
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
