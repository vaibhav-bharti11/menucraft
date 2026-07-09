// lib/pdf/classic.ts
// Classic PDF HTML template — exact match to Embassy format (Mr. Suri PDF)
// PRD Section 04, 3A — Classic Mode specification

import type { Menu, MenuCounter } from '../types';
import { format } from 'date-fns';

function formatEventDate(dateStr: string): string {
  try {
    return format(new Date(dateStr), 'd MMMM yyyy');
  } catch {
    return dateStr;
  }
}

function renderSections(counter: MenuCounter): string {
  return counter.sections.map(section => {
    const colorClass =
      section.kind === 'NON_VEG'
        ? 'color: #8B1A1A'
        : section.kind === 'VEG'
        ? 'color: #2E7D32'
        : 'color: #555';

    const sectionLabel =
      section.label ||
      (section.kind === 'NON_VEG' ? 'Non Vegetarian' : section.kind === 'VEG' ? 'Vegetarian' : '');

    const dishesHtml = section.dishes
      .map(
        d => `
        <div class="dish">
          <div class="dish-name">${d.name}</div>
          ${d.description ? `<div class="dish-desc">${d.description}</div>` : ''}
        </div>`
      )
      .join('');

    return `
      <div class="section-label" style="${colorClass}">${sectionLabel}</div>
      ${dishesHtml}
    `;
  }).join('');
}

function renderAccompaniments(counter: MenuCounter): string {
  if (!counter.accompaniments) return '';
  return `
    <div class="accompaniments">
      <div class="acc-label">${counter.accompaniments_label || 'Accompaniments'}</div>
      <div class="acc-items">${counter.accompaniments}</div>
    </div>
  `;
}

function renderCounter(counter: MenuCounter): string {
  return `
    <div class="counter-page">
      <div class="logo-area">
        <div class="logo-rules">
          <span class="logo-dash">— — — — — — — — —</span>
          <span class="logo-text">The Embassy</span>
          <span class="logo-dash">— — — — — — — — —</span>
        </div>
        <div class="logo-sub">CATERING</div>
      </div>

      <div class="counter-title">${counter.display_name_print || counter.display_name.toUpperCase()}</div>
      ${counter.description ? `<div class="counter-desc">${counter.description}</div>` : ''}

      <div class="gold-rule"></div>

      ${renderSections(counter)}
      ${renderAccompaniments(counter)}
    </div>
  `;
}

export function buildClassicHtml(menu: Menu): string {
  const eventDate = formatEventDate(menu.event_date);

  const countersHtml = menu.counters.map(renderCounter).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Embassy Catering — ${menu.client_name}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=Jost:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Cormorant Garamond', Georgia, serif;
      background: #ffffff;
      color: #1A1A1A;
      font-size: 11pt;
      line-height: 1.6;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    @page {
      size: A4 portrait;
      margin: 20mm 25mm;
    }

    @media print {
      body { background: #fff !important; }
      .cover-page, .counter-page {
        min-height: auto !important;
        page-break-after: always;
      }
      .signoff-page { min-height: auto !important; }
      .gold-rule, .cover-gold-rule {
        background: linear-gradient(90deg, transparent, #C9A84C, transparent) !important;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }

    /* ── Cover / Event Header ─────────────────────────────────── */
    .cover-page {
      page-break-after: always;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding-top: 40mm;
    }

    .cover-logo-area { text-align: center; margin-bottom: 32pt; }
    .cover-logo-text {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-style: italic;
      font-size: 36pt;
      font-weight: 600;
      color: #8B1A1A;
      letter-spacing: 0.02em;
    }
    .cover-logo-sub {
      font-family: 'Jost', sans-serif;
      font-size: 9pt;
      letter-spacing: 0.35em;
      color: #777;
      text-transform: uppercase;
      margin-top: 4pt;
    }

    .cover-gold-rule {
      width: 120pt;
      height: 1pt;
      background: linear-gradient(90deg, transparent, #C9A84C, transparent);
      margin: 20pt auto;
    }

    .event-table {
      width: 100%;
      max-width: 400pt;
      border-collapse: collapse;
      margin-top: 24pt;
    }
    .event-table td {
      padding: 6pt 12pt;
      font-size: 11pt;
      vertical-align: top;
    }
    .event-table .label {
      font-weight: 700;
      text-align: left;
      width: 45%;
      color: #1A1A1A;
    }
    .event-table .value {
      text-align: right;
      color: #333;
    }

    .cover-requirements {
      margin-top: 28pt;
      max-width: 420pt;
      text-align: center;
    }
    .cover-requirements .req-label {
      font-weight: 700;
      font-size: 10pt;
      color: #8B1A1A;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      margin-bottom: 6pt;
    }
    .cover-requirements p {
      font-size: 10pt;
      color: #555;
      font-style: italic;
      line-height: 1.7;
    }

    /* ── Counter Pages ────────────────────────────────────────── */
    .counter-page {
      page-break-after: always;
      min-height: 100vh;
      padding: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .logo-area { text-align: center; margin-bottom: 24pt; }
    .logo-rules {
      display: flex;
      align-items: center;
      gap: 8pt;
      justify-content: center;
    }
    .logo-dash { color: #C9A84C; font-size: 10pt; letter-spacing: 2pt; }
    .logo-text {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-style: italic;
      font-size: 22pt;
      font-weight: 600;
      color: #8B1A1A;
    }
    .logo-sub {
      font-family: 'Jost', sans-serif;
      font-size: 8pt;
      letter-spacing: 0.3em;
      color: #999;
      text-transform: uppercase;
      margin-top: 2pt;
      text-align: center;
    }

    .gold-rule {
      width: 200pt;
      height: 1pt;
      background: linear-gradient(90deg, transparent, #C9A84C, transparent);
      margin: 16pt auto;
    }

    .counter-title {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 18pt;
      font-weight: 700;
      text-transform: uppercase;
      text-align: center;
      color: #1A1A1A;
      letter-spacing: 0.08em;
      margin-top: 20pt;
      margin-bottom: 4pt;
    }

    .counter-desc {
      font-style: italic;
      font-size: 10pt;
      color: #777;
      text-align: center;
      max-width: 400pt;
      line-height: 1.5;
      margin-bottom: 4pt;
    }

    .section-label {
      font-family: 'Jost', sans-serif;
      font-size: 10pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      text-align: center;
      margin-top: 16pt;
      margin-bottom: 10pt;
    }

    .dish { text-align: center; margin-bottom: 14pt; }
    .dish-name {
      font-weight: 700;
      font-size: 11pt;
      color: #1A1A1A;
      font-family: 'Cormorant Garamond', Georgia, serif;
    }
    .dish-desc {
      font-style: italic;
      font-size: 9pt;
      color: #666;
      margin-top: 2pt;
      line-height: 1.5;
    }

    .accompaniments {
      margin-top: 16pt;
      text-align: center;
      border-top: 1pt solid #E5E0D8;
      padding-top: 12pt;
    }
    .acc-label {
      font-weight: 700;
      font-size: 10pt;
      color: #1A1A1A;
      margin-bottom: 6pt;
    }
    .acc-items {
      font-style: italic;
      font-size: 9pt;
      color: #666;
    }

    /* ── Sign-off Page ────────────────────────────────────────── */
    .signoff-page {
      min-height: 60vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      padding-bottom: 40pt;
    }
    .signoff-text {
      text-align: center;
      font-style: italic;
      font-size: 11pt;
      color: #555;
      line-height: 1.8;
    }
    .signoff-name {
      font-weight: 700;
      font-style: normal;
      color: #1A1A1A;
    }
  </style>
</head>
<body>

  <!-- COVER PAGE -->
  <div class="cover-page">
    <div class="cover-logo-area">
      <div class="cover-logo-text">The Embassy</div>
      <div class="cover-logo-sub">Catering</div>
    </div>
    <div class="cover-gold-rule"></div>

    <table class="event-table">
      <tr>
        <td class="label">Kind Attn</td>
        <td class="value">${menu.client_name}</td>
      </tr>
      <tr>
        <td class="label">Date</td>
        <td class="value">${eventDate}</td>
      </tr>
      <tr>
        <td class="label">Function Type</td>
        <td class="value">${menu.function_type}</td>
      </tr>
      <tr>
        <td class="label">No. of Guests</td>
        <td class="value">${menu.guest_count}</td>
      </tr>
      <tr>
        <td class="label">Venue</td>
        <td class="value">${menu.venue}</td>
      </tr>
    </table>

    ${menu.requirements_note ? `
    <div class="cover-requirements">
      <div class="req-label">Requirements</div>
      <p>${menu.requirements_note.replace(/\n/g, '<br>')}</p>
    </div>` : ''}

    ${menu.exclusions_note ? `
    <div class="cover-requirements" style="margin-top:16pt">
      <div class="req-label">Exclusions</div>
      <p>${menu.exclusions_note.replace(/\n/g, '<br>')}</p>
    </div>` : ''}
  </div>

  <!-- COUNTER PAGES -->
  ${countersHtml}

  <!-- SIGN-OFF -->
  <div class="signoff-page">
    <div class="gold-rule"></div>
    <div class="signoff-text">
      Thanking You,<br>
      Yours sincerely,<br><br>
      <span class="signoff-name">${menu.signed_by_name}</span><br>
      ${menu.signed_by_phone}
    </div>
  </div>

</body>
</html>`;
}
