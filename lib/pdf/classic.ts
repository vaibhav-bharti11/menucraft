// lib/pdf/classic.ts
// Embassy Catering Classic Proposal PDF Template
// Editorial Luxury Catering Proposal inspired by The Embassy Catering aesthetic

import type { Menu, MenuCounter, MenuSection } from '../types';
import { formatEventDate, formatGuestCount, formatText, formatMultiline } from './helpers';

function renderSection(section: MenuSection): string {
  if (!section.dishes || section.dishes.length === 0) return '';

  const isVeg = section.kind === 'VEG';
  const isNonVeg = section.kind === 'NON_VEG';

  const badgeColor = isVeg ? '#1B5E20' : isNonVeg ? '#721B29' : '#333333';
  const dotColor = isVeg ? '#2E7D32' : isNonVeg ? '#8B1A1A' : '#666666';
  const label = section.label || (isVeg ? 'Vegetarian' : isNonVeg ? 'Non Vegetarian' : 'Specialty Selection');

  const dishesHtml = section.dishes
    .map(
      d => `
      <div class="dish-item">
        <div class="dish-title">${formatText(d.name)}</div>
        ${d.description ? `<div class="dish-description">${formatText(d.description)}</div>` : ''}
      </div>`
    )
    .join('');

  return `
    <div class="menu-section-group">
      <div class="section-badge-wrapper">
        <div class="section-badge" style="color: ${badgeColor}; border-color: ${badgeColor}22;">
          <span class="dietary-dot" style="background-color: ${dotColor};"></span>
          <span class="section-badge-text">${label.toUpperCase()}</span>
        </div>
        <div class="section-hairline"></div>
      </div>
      <div class="dishes-container">
        ${dishesHtml}
      </div>
    </div>
  `;
}

function renderAccompaniments(counter: MenuCounter): string {
  if (!counter.accompaniments || counter.accompaniments.trim() === '') return '';
  const label = counter.accompaniments_label || 'Accompaniments & Condiments';

  return `
    <div class="accompaniments-box">
      <div class="acc-header">
        <span class="acc-icon">❖</span>
        <span class="acc-title">${formatText(label).toUpperCase()}</span>
      </div>
      <div class="acc-content">${formatText(counter.accompaniments)}</div>
    </div>
  `;
}

function renderCounter(counter: MenuCounter, index: number, total: number): string {
  const isLive = /live/i.test(counter.display_name) || /live/i.test(counter.display_name_print || '');
  const title = (counter.display_name_print || counter.display_name).toUpperCase();
  const sectionsHtml = counter.sections.map(renderSection).join('');
  const accHtml = renderAccompaniments(counter);

  if (!sectionsHtml && !accHtml && !counter.description) {
    return '';
  }

  return `
    <div class="counter-container">
      <div class="counter-header-block">
        <div class="counter-meta-top">
          <span class="counter-number">CURATION ${String(index + 1).padStart(2, '0')} OF ${String(total).padStart(2, '0')}</span>
          ${isLive ? `<span class="live-station-tag"><span class="pulse-dot"></span> LIVE CULINARY STATION</span>` : ''}
        </div>
        <h2 class="counter-main-title">${formatText(title)}</h2>
        ${counter.description ? `<p class="counter-story">${formatText(counter.description)}</p>` : ''}
        <div class="ornamental-gold-divider">
          <span class="orn-line"></span>
          <span class="orn-emblem">✦</span>
          <span class="orn-line"></span>
        </div>
      </div>

      <div class="counter-body">
        ${sectionsHtml}
        ${accHtml}
      </div>
    </div>
  `;
}

export function buildClassicHtml(menu: Menu): string {
  const eventDate = formatEventDate(menu.event_date);
  const guestCount = formatGuestCount(menu.guest_count);
  const clientName = formatText(menu.client_name, 'Valued Patron');
  const functionType = formatText(menu.function_type, 'Catering Reception');
  const venue = formatText(menu.venue, 'Venue to be finalized');
  const signedByName = formatText(menu.signed_by_name, 'Pranay Bahl');
  const signedByPhone = formatText(menu.signed_by_phone, '+91 98990 04852');

  const validCounters = menu.counters.filter(c => {
    const hasDishes = c.sections.some(s => s.dishes && s.dishes.length > 0);
    return hasDishes || !!c.description || !!c.accompaniments;
  });

  const totalCounters = validCounters.length;
  const countersHtml = validCounters
    .map((c, idx) => renderCounter(c, idx, totalCounters))
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The Embassy Catering — ${clientName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700;800&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Jost:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,500;0,600;0,700;1,400;1,600&display=swap" rel="stylesheet">
  <style>
    /* ── Reset & Page Setup ── */
    *, *::before, *::after {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    @page {
      size: A4 portrait;
      margin: 0;
    }

    html, body {
      background-color: #FAF7F2;
      color: #1A1A1A;
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 11pt;
      line-height: 1.55;
      letter-spacing: 0.01em;
      -webkit-font-smoothing: antialiased;
    }

    /* ── Page Layout Containers ── */
    .pdf-page {
      width: 210mm;
      min-height: 297mm;
      position: relative;
      background: #FAF7F2;
      page-break-after: always;
      break-after: page;
      overflow: hidden;
    }

    /* ═══════════════════════════════════════════════════════════════
       PAGE 1: COVER PAGE (Imperial Embassy Burgundy & Gold)
    ═══════════════════════════════════════════════════════════════ */
    .cover-page {
      background: #5B111D;
      background: radial-gradient(circle at 50% 40%, #701524 0%, #480C16 100%);
      color: #FAF7F2;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      padding: 16mm 14mm;
      text-align: center;
    }

    .cover-frame-outer {
      position: absolute;
      top: 10mm;
      bottom: 10mm;
      left: 10mm;
      right: 10mm;
      border: 1pt solid rgba(197, 160, 89, 0.45);
      pointer-events: none;
    }

    .cover-frame-inner {
      position: absolute;
      top: 13mm;
      bottom: 13mm;
      left: 13mm;
      right: 13mm;
      border: 0.5pt solid rgba(197, 160, 89, 0.25);
      pointer-events: none;
    }

    /* Corner flourishes */
    .corner-motif {
      position: absolute;
      width: 14mm;
      height: 14mm;
      border-color: #C5A059;
      border-style: solid;
      pointer-events: none;
    }
    .corner-tl { top: 9mm; left: 9mm; border-width: 2pt 0 0 2pt; }
    .corner-tr { top: 9mm; right: 9mm; border-width: 2pt 2pt 0 0; }
    .corner-bl { bottom: 9mm; left: 9mm; border-width: 0 0 2pt 2pt; }
    .corner-br { bottom: 9mm; right: 9mm; border-width: 0 2pt 2pt 0; }

    .cover-content {
      position: relative;
      z-index: 2;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 12mm 8mm;
    }

    .cover-brand-header {
      padding-top: 10mm;
    }

    .brand-crest {
      width: 52pt;
      height: 52pt;
      margin: 0 auto 14pt;
      border: 1pt solid #C5A059;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(197, 160, 89, 0.08);
      position: relative;
    }

    .brand-crest::before {
      content: '';
      position: absolute;
      inset: 3pt;
      border: 0.5pt dashed rgba(197, 160, 89, 0.5);
      border-radius: 50%;
    }

    .crest-letter {
      font-family: 'Cinzel', serif;
      font-size: 24pt;
      font-weight: 700;
      color: #E2C787;
      letter-spacing: 0.05em;
    }

    .brand-name {
      font-family: 'Cinzel', serif;
      font-size: 26pt;
      font-weight: 700;
      color: #FAF7F2;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      margin-bottom: 4pt;
      text-shadow: 0 2pt 12pt rgba(0, 0, 0, 0.4);
    }

    .brand-tagline {
      font-family: 'Jost', sans-serif;
      font-size: 8pt;
      font-weight: 600;
      letter-spacing: 0.4em;
      color: #C5A059;
      text-transform: uppercase;
    }

    .brand-established {
      font-family: 'Jost', sans-serif;
      font-size: 7pt;
      letter-spacing: 0.25em;
      color: rgba(250, 247, 242, 0.6);
      text-transform: uppercase;
      margin-top: 5pt;
    }

    .cover-centerpiece {
      margin: 20pt 0;
    }

    .proposal-eyebrow {
      font-family: 'Jost', sans-serif;
      font-size: 8.5pt;
      font-weight: 600;
      letter-spacing: 0.35em;
      color: #E2C787;
      text-transform: uppercase;
      margin-bottom: 12pt;
      display: block;
    }

    .proposal-title {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 30pt;
      font-weight: 600;
      font-style: italic;
      color: #FAF7F2;
      line-height: 1.15;
      margin-bottom: 16pt;
    }

    .cover-divider-gold {
      width: 140pt;
      height: 1pt;
      background: linear-gradient(90deg, transparent, #C5A059, transparent);
      margin: 16pt auto;
    }

    .client-block {
      background: rgba(0, 0, 0, 0.22);
      border: 1pt solid rgba(197, 160, 89, 0.35);
      border-radius: 4pt;
      padding: 16pt 24pt;
      max-width: 380pt;
      margin: 0 auto;
    }

    .client-for-label {
      font-family: 'Jost', sans-serif;
      font-size: 7.5pt;
      letter-spacing: 0.28em;
      text-transform: uppercase;
      color: #C5A059;
      margin-bottom: 4pt;
      font-weight: 600;
    }

    .client-name-display {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 22pt;
      font-weight: 700;
      color: #FFFFFF;
      letter-spacing: 0.04em;
      margin-bottom: 4pt;
    }

    .client-occasion {
      font-family: 'Jost', sans-serif;
      font-size: 9.5pt;
      font-weight: 400;
      color: rgba(250, 247, 242, 0.85);
      letter-spacing: 0.08em;
    }

    .cover-footer {
      padding-bottom: 8mm;
    }

    .cover-event-summary {
      display: flex;
      justify-content: center;
      gap: 24pt;
      font-family: 'Jost', sans-serif;
      font-size: 8pt;
      letter-spacing: 0.15em;
      color: rgba(250, 247, 242, 0.8);
      text-transform: uppercase;
      margin-bottom: 14pt;
    }

    .cover-event-summary span {
      display: flex;
      align-items: center;
      gap: 6pt;
    }

    .cover-heritage-note {
      font-family: 'Cormorant Garamond', serif;
      font-style: italic;
      font-size: 10pt;
      color: rgba(197, 160, 89, 0.9);
      letter-spacing: 0.02em;
    }

    /* ═══════════════════════════════════════════════════════════════
       PAGE 2: EVENT SPECIFICATIONS & CULINARY OVERVIEW
    ═══════════════════════════════════════════════════════════════ */
    .overview-page {
      padding: 16mm 18mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .running-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 0.5pt solid #C5A059;
      padding-bottom: 8pt;
      margin-bottom: 18pt;
    }

    .rh-brand {
      font-family: 'Cinzel', serif;
      font-size: 9.5pt;
      font-weight: 700;
      color: #721B29;
      letter-spacing: 0.16em;
    }

    .rh-title {
      font-family: 'Jost', sans-serif;
      font-size: 7.5pt;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #888;
    }

    .rh-page-num {
      font-family: 'Jost', sans-serif;
      font-size: 8pt;
      font-weight: 600;
      color: #721B29;
      letter-spacing: 0.1em;
    }

    .overview-title-block {
      text-align: center;
      margin-bottom: 22pt;
    }

    .page-kicker {
      font-family: 'Jost', sans-serif;
      font-size: 7.5pt;
      letter-spacing: 0.35em;
      text-transform: uppercase;
      color: #C5A059;
      font-weight: 600;
      margin-bottom: 4pt;
      display: block;
    }

    .page-headline {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 23pt;
      font-weight: 600;
      color: #721B29;
      letter-spacing: 0.02em;
    }

    .grid-specs {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12pt;
      margin-bottom: 18pt;
    }

    .spec-card {
      background: #FFFFFF;
      border: 1pt solid #E7DFD5;
      border-left: 3pt solid #721B29;
      padding: 12pt 14pt;
      border-radius: 2pt;
    }

    .spec-label {
      font-family: 'Jost', sans-serif;
      font-size: 7pt;
      font-weight: 700;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: #C5A059;
      margin-bottom: 3pt;
    }

    .spec-value {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 13.5pt;
      font-weight: 600;
      color: #1A1A1A;
      line-height: 1.25;
    }

    .notes-section {
      margin-bottom: 14pt;
    }

    .note-card {
      background: #FFFFFF;
      border: 1pt solid #E7DFD5;
      border-radius: 2pt;
      padding: 12pt 16pt;
      margin-bottom: 10pt;
    }

    .note-card-header {
      display: flex;
      align-items: center;
      gap: 6pt;
      font-family: 'Jost', sans-serif;
      font-size: 8pt;
      font-weight: 700;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #721B29;
      margin-bottom: 6pt;
    }

    .note-card-body {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 10.5pt;
      color: #4A4A4A;
      line-height: 1.5;
      font-style: italic;
    }

    .signoff-seal-card {
      background: #FAF3E8;
      border: 1pt solid #E2D3B8;
      padding: 14pt 18pt;
      border-radius: 2pt;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 10pt;
    }

    .signoff-details {
      display: flex;
      flex-direction: column;
    }

    .signoff-role {
      font-family: 'Jost', sans-serif;
      font-size: 7.5pt;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #C5A059;
      font-weight: 600;
      margin-bottom: 2pt;
    }

    .signoff-name-text {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 14pt;
      font-weight: 700;
      color: #721B29;
    }

    .signoff-contact-text {
      font-family: 'Jost', sans-serif;
      font-size: 8.5pt;
      color: #666666;
      margin-top: 1pt;
    }

    .seal-badge {
      border: 1pt dashed #C5A059;
      border-radius: 50%;
      width: 50pt;
      height: 50pt;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      color: #721B29;
      font-family: 'Cinzel', serif;
      font-size: 6pt;
      font-weight: 700;
      letter-spacing: 0.1em;
      line-height: 1.2;
    }

    .running-footer {
      border-top: 0.5pt solid #E7DFD5;
      padding-top: 8pt;
      margin-top: 14pt;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-family: 'Jost', sans-serif;
      font-size: 7pt;
      letter-spacing: 0.12em;
      color: #888888;
      text-transform: uppercase;
    }

    /* ═══════════════════════════════════════════════════════════════
       PAGE 3+: DETAILED MENU SPREAD
    ═══════════════════════════════════════════════════════════════ */
    .menu-page {
      padding: 16mm 18mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .counter-container {
      margin-bottom: 24pt;
      page-break-inside: auto;
      break-inside: auto;
    }

    .counter-header-block {
      text-align: center;
      margin-bottom: 16pt;
      page-break-inside: avoid;
      break-inside: avoid;
      page-break-after: avoid;
      break-after: avoid;
    }

    .counter-meta-top {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 10pt;
      margin-bottom: 4pt;
    }

    .counter-number {
      font-family: 'Jost', sans-serif;
      font-size: 7.5pt;
      font-weight: 600;
      letter-spacing: 0.3em;
      color: #C5A059;
      text-transform: uppercase;
    }

    .live-station-tag {
      background: #FDF0F0;
      color: #8B1A1A;
      border: 0.5pt solid #E8B4B8;
      padding: 2pt 7pt;
      border-radius: 10pt;
      font-family: 'Jost', sans-serif;
      font-size: 6.5pt;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      display: inline-flex;
      align-items: center;
      gap: 4pt;
    }

    .pulse-dot {
      width: 4pt;
      height: 4pt;
      border-radius: 50%;
      background: #8B1A1A;
    }

    .counter-main-title {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 19pt;
      font-weight: 700;
      color: #721B29;
      letter-spacing: 0.05em;
      text-transform: uppercase;
      line-height: 1.2;
      margin-bottom: 4pt;
    }

    .counter-story {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 10.5pt;
      font-style: italic;
      color: #555555;
      max-width: 440pt;
      margin: 0 auto 6pt;
      line-height: 1.45;
    }

    .ornamental-gold-divider {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8pt;
      margin: 8pt auto 14pt;
      width: 160pt;
    }

    .orn-line {
      flex: 1;
      height: 0.5pt;
      background: linear-gradient(90deg, transparent, #C5A059, transparent);
    }

    .orn-emblem {
      color: #C5A059;
      font-size: 7pt;
    }

    /* ── Dietary Sections & Dishes ── */
    .menu-section-group {
      margin-bottom: 14pt;
      page-break-inside: auto;
      break-inside: auto;
    }

    .section-badge-wrapper {
      display: flex;
      align-items: center;
      gap: 8pt;
      margin-bottom: 10pt;
      page-break-after: avoid;
      break-after: avoid;
    }

    .section-badge {
      display: inline-flex;
      align-items: center;
      gap: 5pt;
      border: 0.5pt solid;
      background: #FFFFFF;
      padding: 3pt 8pt;
      border-radius: 2pt;
    }

    .dietary-dot {
      width: 6pt;
      height: 6pt;
      border-radius: 50%;
    }

    .section-badge-text {
      font-family: 'Jost', sans-serif;
      font-size: 7.5pt;
      font-weight: 700;
      letter-spacing: 0.2em;
    }

    .section-hairline {
      flex: 1;
      height: 0.5pt;
      background: #E7DFD5;
    }

    .dishes-container {
      display: grid;
      grid-template-columns: 1fr;
      gap: 9pt;
      padding-left: 4pt;
    }

    .dish-item {
      page-break-inside: avoid;
      break-inside: avoid;
      padding-bottom: 6pt;
      border-bottom: 0.5pt dotted #E5DFD7;
    }

    .dish-item:last-child {
      border-bottom: none;
    }

    .dish-title {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 12pt;
      font-weight: 700;
      color: #1A1A1A;
      line-height: 1.25;
      letter-spacing: 0.02em;
    }

    .dish-description {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 9.5pt;
      font-style: italic;
      color: #5C5C5C;
      line-height: 1.4;
      margin-top: 1.5pt;
    }

    /* ── Accompaniments Box ── */
    .accompaniments-box {
      background: #F6F1EA;
      border: 1pt solid #E4DAC9;
      border-radius: 2pt;
      padding: 9pt 14pt;
      margin-top: 12pt;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .acc-header {
      display: flex;
      align-items: center;
      gap: 5pt;
      font-family: 'Jost', sans-serif;
      font-size: 7pt;
      font-weight: 700;
      letter-spacing: 0.22em;
      color: #721B29;
      margin-bottom: 2pt;
    }

    .acc-icon {
      color: #C5A059;
      font-size: 8pt;
    }

    .acc-content {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 10pt;
      font-style: italic;
      color: #4A4A4A;
      line-height: 1.45;
    }

    /* ═══════════════════════════════════════════════════════════════
       FINAL PAGE: PHILOSOPHY & RECEPTION SIGN-OFF
    ═══════════════════════════════════════════════════════════════ */
    .closing-page {
      padding: 20mm 20mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      align-items: center;
      text-align: center;
      background: #FAF7F2;
    }

    .closing-crest-area {
      padding-top: 15mm;
    }

    .closing-message-block {
      max-width: 420pt;
    }

    .closing-quote {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 20pt;
      font-style: italic;
      color: #721B29;
      line-height: 1.35;
      margin-bottom: 16pt;
    }

    .closing-body {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 11.5pt;
      color: #555555;
      line-height: 1.65;
      margin-bottom: 24pt;
    }

    .closing-signature-card {
      border-top: 0.5pt solid #C5A059;
      padding-top: 16pt;
      display: inline-block;
    }

    .closing-sig-yours {
      font-family: 'Cormorant Garamond', serif;
      font-style: italic;
      font-size: 11pt;
      color: #777777;
      margin-bottom: 6pt;
    }

    .closing-sig-name {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 16pt;
      font-weight: 700;
      color: #1A1A1A;
    }

    .closing-sig-title {
      font-family: 'Jost', sans-serif;
      font-size: 8pt;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #721B29;
      margin-top: 2pt;
    }

    .closing-sig-phone {
      font-family: 'Jost', sans-serif;
      font-size: 8.5pt;
      color: #666666;
      margin-top: 2pt;
    }
  </style>
</head>
<body>

  <!-- ══════════════════════════════════════════════════════════
       PAGE 1: COVER PAGE
  ══════════════════════════════════════════════════════════ -->
  <div class="pdf-page cover-page">
    <div class="cover-frame-outer"></div>
    <div class="cover-frame-inner"></div>
    <div class="corner-motif corner-tl"></div>
    <div class="corner-motif corner-tr"></div>
    <div class="corner-motif corner-bl"></div>
    <div class="corner-motif corner-br"></div>

    <div class="cover-content">
      <div class="cover-brand-header">
        <div class="brand-crest">
          <span class="crest-letter">E</span>
        </div>
        <h1 class="brand-name">The Embassy</h1>
        <div class="brand-tagline">Catering Services</div>
        <div class="brand-established">ESTABLISHED 1948 · DELHI NCR</div>
      </div>

      <div class="cover-centerpiece">
        <span class="proposal-eyebrow">Bespoke Catering Proposal</span>
        <h2 class="proposal-title">A Symphony of Flavours &amp; Refined Hospitality</h2>
        <div class="cover-divider-gold"></div>

        <div class="client-block">
          <div class="client-for-label">Prepared Exclusively For</div>
          <div class="client-name-display">${clientName}</div>
          <div class="client-occasion">${functionType}</div>
        </div>
      </div>

      <div class="cover-footer">
        <div class="cover-event-summary">
          <span>📅 ${eventDate}</span>
          <span>•</span>
          <span>👥 ${guestCount}</span>
          <span>•</span>
          <span>📍 ${venue}</span>
        </div>
        <p class="cover-heritage-note">Over seven decades of culinary legacy, crafted with passion and precision.</p>
      </div>
    </div>
  </div>

  <!-- ══════════════════════════════════════════════════════════
       PAGE 2: EVENT SPECIFICATIONS & OVERVIEW
  ══════════════════════════════════════════════════════════ -->
  <div class="pdf-page overview-page">
    <div>
      <div class="running-header">
        <span class="rh-brand">THE EMBASSY CATERING</span>
        <span class="rh-title">Event Overview &amp; Specifications</span>
        <span class="rh-page-num">PAGE 02</span>
      </div>

      <div class="overview-title-block">
        <span class="page-kicker">Catering Blueprint</span>
        <h2 class="page-headline">Event Specifications</h2>
      </div>

      <div class="grid-specs">
        <div class="spec-card">
          <div class="spec-label">Date of Event</div>
          <div class="spec-value">${eventDate}</div>
        </div>
        <div class="spec-card">
          <div class="spec-label">Occasion / Function</div>
          <div class="spec-value">${functionType}</div>
        </div>
        <div class="spec-card">
          <div class="spec-label">Guest Attendance</div>
          <div class="spec-value">${guestCount}</div>
        </div>
        <div class="spec-card">
          <div class="spec-label">Event Venue</div>
          <div class="spec-value">${venue}</div>
        </div>
      </div>

      <div class="notes-section">
        ${menu.requirements_note ? `
        <div class="note-card">
          <div class="note-card-header">
            <span>⚡</span>
            <span>Infrastructure &amp; Operational Requirements</span>
          </div>
          <div class="note-card-body">${formatMultiline(menu.requirements_note)}</div>
        </div>` : ''}

        ${menu.exclusions_note ? `
        <div class="note-card">
          <div class="note-card-header" style="color: #666;">
            <span>ⓘ</span>
            <span>Exclusions &amp; Scope Limits</span>
          </div>
          <div class="note-card-body">${formatMultiline(menu.exclusions_note)}</div>
        </div>` : ''}
      </div>

      <div class="signoff-seal-card">
        <div class="signoff-details">
          <div class="signoff-role">Authorized Catering Executive</div>
          <div class="signoff-name-text">${signedByName}</div>
          <div class="signoff-contact-text">Mobile: ${signedByPhone} · The Embassy Catering Sales Directorate</div>
        </div>
        <div class="seal-badge">
          <span>THE EMBASSY</span>
          <span style="font-size: 10pt; color: #C5A059;">★</span>
          <span>APPROVED</span>
        </div>
      </div>
    </div>

    <div class="running-footer">
      <span>The Embassy Catering · Established 1948</span>
      <span>Confidential Catering Proposal</span>
    </div>
  </div>

  <!-- ══════════════════════════════════════════════════════════
       PAGE 3+: CURATED MENU SPREAD
  ══════════════════════════════════════════════════════════ -->
  <div class="pdf-page menu-page">
    <div>
      <div class="running-header">
        <span class="rh-brand">THE EMBASSY CATERING</span>
        <span class="rh-title">Curated Gastronomic Curation</span>
        <span class="rh-page-num">PAGE 03</span>
      </div>

      ${countersHtml}
    </div>

    <div class="running-footer">
      <span>The Embassy Catering · Bespoke Culinary Experience</span>
      <span>Delhi NCR · www.theembassycatering.com</span>
    </div>
  </div>

  <!-- ══════════════════════════════════════════════════════════
       FINAL PAGE: THANK YOU & CATERING HERITAGE
  ══════════════════════════════════════════════════════════ -->
  <div class="pdf-page closing-page">
    <div class="closing-crest-area">
      <div class="brand-crest" style="width: 44pt; height: 44pt;">
        <span class="crest-letter" style="font-size: 20pt; color: #721B29;">E</span>
      </div>
      <div style="font-family: 'Cinzel', serif; font-size: 16pt; font-weight: 700; color: #721B29; letter-spacing: 0.18em; margin-top: 6pt;">
        THE EMBASSY
      </div>
      <div style="font-family: 'Jost', sans-serif; font-size: 7pt; letter-spacing: 0.3em; color: #C5A059; text-transform: uppercase;">
        CATERING SINCE 1948
      </div>
    </div>

    <div class="closing-message-block">
      <div class="closing-quote">
        &ldquo;Hospitality is not merely what we serve, but the enduring memories we create together.&rdquo;
      </div>
      <p class="closing-body">
        Thank you for granting The Embassy Catering the honour of curating the gastronomic journey for your celebratory occasion. Our master chefs, experienced banquet stewards, and culinary directors remain dedicated to executing an unforgettable experience.
      </p>

      <div class="closing-signature-card">
        <div class="closing-sig-yours">With warmest regards &amp; culinary compliments,</div>
        <div class="closing-sig-name">${signedByName}</div>
        <div class="closing-sig-title">Senior Culinary Consultant</div>
        <div class="closing-sig-phone">${signedByPhone}</div>
      </div>
    </div>

    <div class="running-footer" style="width: 100%;">
      <span>The Embassy Catering Services</span>
      <span>Exceptional Celebrations</span>
    </div>
  </div>

</body>
</html>`;
}
