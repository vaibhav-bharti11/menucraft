// lib/pdf/modern.ts
// Embassy Catering Modern Editorial Proposal PDF Template
// Sleek luxury editorial aesthetic (Hermès / Luxury Catalogue style)

import type { Menu, MenuCounter, MenuSection } from '../types';
import { formatEventDate, formatGuestCount, formatText, formatMultiline, getImageAsBase64 } from './helpers';
import { findHeroImage, findCounterImage, markUsed, createUsedTracker } from './imageMatcher';

function renderModernSection(section: MenuSection): string {
  if (!section.dishes || section.dishes.length === 0) return '';

  const isVeg = section.kind === 'VEG';
  const isNonVeg = section.kind === 'NON_VEG';
  const label = section.label || (isVeg ? 'Vegetarian' : isNonVeg ? 'Non Vegetarian' : 'Specialty Selection');
  const badgeClass = isVeg ? 'badge-veg' : isNonVeg ? 'badge-nonveg' : 'badge-neutral';

  const dishesHtml = section.dishes
    .map(
      d => `
      <div class="m-dish-row">
        <div class="m-dish-main">
          <div class="m-dish-name">${formatText(d.name)}</div>
          ${d.description ? `<div class="m-dish-desc">${formatText(d.description)}</div>` : ''}
        </div>
      </div>`
    )
    .join('');

  return `
    <div class="m-section-block">
      <div class="m-section-header">
        <span class="m-dietary-badge ${badgeClass}">${label.toUpperCase()}</span>
        <span class="m-section-rule"></span>
      </div>
      <div class="m-dishes-grid">
        ${dishesHtml}
      </div>
    </div>
  `;
}

function renderModernAccompaniments(counter: MenuCounter): string {
  if (!counter.accompaniments || counter.accompaniments.trim() === '') return '';
  const label = counter.accompaniments_label || 'Served Alongside';

  return `
    <div class="m-accompaniments-pill-card">
      <div class="m-acc-tag">${formatText(label).toUpperCase()}</div>
      <div class="m-acc-text">${formatText(counter.accompaniments)}</div>
    </div>
  `;
}

function renderModernCounter(counter: MenuCounter, index: number, total: number, imgDataUri: string | null): string {
  const isLive = /live/i.test(counter.display_name) || /live/i.test(counter.display_name_print || '');
  const title = (counter.display_name_print || counter.display_name).toUpperCase();
  const sectionsHtml = counter.sections.map(renderModernSection).join('');
  const accHtml = renderModernAccompaniments(counter);

  if (!sectionsHtml && !accHtml && !counter.description) return '';

  const imgBanner = imgDataUri
    ? `<div class="m-counter-image-banner">
         <img src="${imgDataUri}" alt="${formatText(title)}" />
       </div>`
    : '';

  return `
    <div class="m-counter-wrapper">
      ${imgBanner}
      <div class="m-counter-header">
        <div class="m-counter-num-tag">
          <span>STATION ${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}</span>
          ${isLive ? `<span class="m-live-pill">LIVE KITCHEN</span>` : ''}
        </div>
        <h2 class="m-counter-title">${formatText(title)}</h2>
        ${counter.description ? `<p class="m-counter-desc">${formatText(counter.description)}</p>` : ''}
      </div>

      <div class="m-counter-body">
        ${sectionsHtml}
        ${accHtml}
      </div>
    </div>
  `;
}

export function buildModernHtml(menu: Menu): string {
  const eventDate = formatEventDate(menu.event_date);
  const guestCount = formatGuestCount(menu.guest_count);
  const clientName = formatText(menu.client_name, 'Valued Patron');
  const functionType = formatText(menu.function_type, 'Private Gala');
  const venue = formatText(menu.venue, 'Venue to be confirmed');
  const signedByName = formatText(menu.signed_by_name, 'Pranay Bahl');
  const signedByPhone = formatText(menu.signed_by_phone, '+91 98990 04852');

  const validCounters = menu.counters.filter(c => {
    const hasDishes = c.sections.some(s => s.dishes && s.dishes.length > 0);
    return hasDishes || !!c.description || !!c.accompaniments;
  });

  const totalCounters = validCounters.length;

  const usedTracker = createUsedTracker();
  const heroEntry = findHeroImage(menu.function_type || '', usedTracker);
  const heroDataUri = heroEntry ? getImageAsBase64(heroEntry.filename) : null;
  if (heroEntry) markUsed(heroEntry, usedTracker);

  const countersHtml = validCounters
    .map((c, idx) => {
      const cImgEntry = findCounterImage(c.display_name, ['main-course'], [], usedTracker);
      const cImgUri = cImgEntry ? getImageAsBase64(cImgEntry.filename) : null;
      if (cImgEntry) markUsed(cImgEntry, usedTracker);
      return renderModernCounter(c, idx, totalCounters, cImgUri);
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>The Embassy — ${clientName}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600&family=Montserrat:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400;1,600&display=swap" rel="stylesheet">
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
      background-color: #F8F5F0;
      color: #1F1F1F;
      font-family: 'Montserrat', system-ui, sans-serif;
      font-size: 10pt;
      line-height: 1.6;
      -webkit-font-smoothing: antialiased;
    }

    /* ── Multi-Page Setup ── */
    .m-page {
      width: 210mm;
      min-height: 297mm;
      position: relative;
      background: #F8F5F0;
      page-break-after: always;
      break-after: page;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    /* ═══════════════════════════════════════════════════════════════
       PAGE 1: MODERN COVER
    ═══════════════════════════════════════════════════════════════ */
    .m-cover-page {
      padding: 22mm 20mm;
      background: #1C1917;
      color: #F8F5F0;
      position: relative;
    }

    .m-cover-bg-image {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      opacity: 0.35;
    }

    .m-cover-overlay {
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, rgba(28,25,23,0.7) 0%, rgba(28,25,23,0.85) 100%);
    }

    .m-cover-border {
      position: absolute;
      inset: 12mm;
      border: 1pt solid rgba(212, 175, 55, 0.3);
      pointer-events: none;
      z-index: 2;
    }

    .m-cover-top {
      position: relative;
      z-index: 3;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 0.5pt solid rgba(212, 175, 55, 0.25);
      padding-bottom: 14pt;
    }

    .m-brand-name {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 22pt;
      font-weight: 700;
      letter-spacing: 0.08em;
      color: #FFFFFF;
    }

    .m-brand-sub {
      font-size: 7.5pt;
      font-weight: 500;
      letter-spacing: 0.35em;
      color: #D4AF37;
      text-transform: uppercase;
      margin-top: 3pt;
    }

    .m-brand-est {
      font-size: 7pt;
      font-weight: 500;
      letter-spacing: 0.2em;
      color: rgba(248, 245, 240, 0.5);
      text-transform: uppercase;
      text-align: right;
    }

    .m-cover-center {
      position: relative;
      z-index: 3;
      margin: auto 0;
      padding: 24pt 0;
    }

    .m-proposal-tag {
      display: inline-block;
      font-size: 8pt;
      font-weight: 600;
      letter-spacing: 0.35em;
      text-transform: uppercase;
      color: #D4AF37;
      margin-bottom: 10pt;
    }

    .m-client-title {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 36pt;
      font-weight: 400;
      line-height: 1.1;
      color: #FFFFFF;
      margin-bottom: 8pt;
      font-style: italic;
    }

    .m-cover-divider {
      width: 60pt;
      height: 1.5pt;
      background: #D4AF37;
      margin: 18pt 0;
    }

    .m-event-subtitle {
      font-family: 'Montserrat', sans-serif;
      font-size: 11pt;
      font-weight: 300;
      color: rgba(248, 245, 240, 0.85);
      letter-spacing: 0.05em;
    }

    .m-cover-bottom {
      position: relative;
      z-index: 3;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16pt;
      border-top: 0.5pt solid rgba(212, 175, 55, 0.25);
      padding-top: 14pt;
    }

    .m-meta-item .m-meta-label {
      font-size: 7pt;
      font-weight: 600;
      letter-spacing: 0.25em;
      text-transform: uppercase;
      color: #D4AF37;
      margin-bottom: 2pt;
    }

    .m-meta-item .m-meta-val {
      font-size: 9pt;
      font-weight: 400;
      color: #FFFFFF;
    }

    /* ═══════════════════════════════════════════════════════════════
       PAGE 2: MODERN OVERVIEW & SPECS
    ═══════════════════════════════════════════════════════════════ */
    .m-overview-page {
      padding: 18mm 20mm;
    }

    .m-running-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 0.5pt solid #E5E0D8;
      padding-bottom: 8pt;
      margin-bottom: 20pt;
    }

    .m-rh-left {
      font-size: 8pt;
      font-weight: 600;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #1F1F1F;
    }

    .m-rh-right {
      font-size: 7.5pt;
      font-weight: 500;
      letter-spacing: 0.15em;
      color: #8C827A;
      text-transform: uppercase;
    }

    .m-page-heading-block {
      margin-bottom: 22pt;
    }

    .m-page-sub {
      font-size: 7.5pt;
      font-weight: 600;
      letter-spacing: 0.3em;
      text-transform: uppercase;
      color: #B38F2D;
      margin-bottom: 4pt;
    }

    .m-page-title {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 24pt;
      font-weight: 600;
      color: #1F1F1F;
      letter-spacing: -0.01em;
    }

    .m-specs-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 12pt;
      margin-bottom: 20pt;
    }

    .m-spec-box {
      background: #FFFFFF;
      border: 1pt solid #EAE5DD;
      padding: 14pt 16pt;
      border-radius: 4pt;
    }

    .m-spec-label {
      font-size: 7pt;
      font-weight: 600;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: #8C827A;
      margin-bottom: 4pt;
    }

    .m-spec-value {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 15pt;
      font-weight: 600;
      color: #1F1F1F;
      line-height: 1.2;
    }

    .m-notes-block {
      margin-bottom: 16pt;
    }

    .m-note-card {
      background: #FFFFFF;
      border: 1pt solid #EAE5DD;
      border-radius: 4pt;
      padding: 12pt 16pt;
      margin-bottom: 10pt;
    }

    .m-note-card-title {
      font-size: 7.5pt;
      font-weight: 600;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #1F1F1F;
      margin-bottom: 6pt;
    }

    .m-note-card-content {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 11pt;
      color: #555555;
      line-height: 1.5;
      font-style: italic;
    }

    .m-signoff-bar {
      background: #1C1917;
      color: #F8F5F0;
      padding: 14pt 18pt;
      border-radius: 4pt;
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 14pt;
    }

    .m-signoff-title {
      font-size: 7pt;
      font-weight: 600;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #D4AF37;
      margin-bottom: 2pt;
    }

    .m-signoff-name {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 15pt;
      font-weight: 600;
      color: #FFFFFF;
    }

    .m-signoff-tel {
      font-size: 8pt;
      color: rgba(248, 245, 240, 0.7);
      margin-top: 2pt;
    }

    .m-running-footer {
      border-top: 0.5pt solid #E5E0D8;
      padding-top: 8pt;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 7pt;
      letter-spacing: 0.12em;
      color: #8C827A;
      text-transform: uppercase;
    }

    /* ═══════════════════════════════════════════════════════════════
       PAGE 3+: MODERN CONTENT PAGES
    ═══════════════════════════════════════════════════════════════ */
    .m-content-page {
      padding: 18mm 20mm;
    }

    .m-counter-wrapper {
      margin-bottom: 26pt;
      page-break-inside: auto;
      break-inside: auto;
    }

    .m-counter-image-banner {
      width: 100%;
      height: 110pt;
      border-radius: 4pt;
      overflow: hidden;
      margin-bottom: 12pt;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .m-counter-image-banner img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
      display: block;
    }

    .m-counter-header {
      margin-bottom: 14pt;
      page-break-inside: avoid;
      break-inside: avoid;
      page-break-after: avoid;
      break-after: avoid;
    }

    .m-counter-num-tag {
      display: flex;
      align-items: center;
      gap: 8pt;
      font-size: 7pt;
      font-weight: 600;
      letter-spacing: 0.25em;
      color: #B38F2D;
      text-transform: uppercase;
      margin-bottom: 3pt;
    }

    .m-live-pill {
      background: #1C1917;
      color: #D4AF37;
      padding: 1.5pt 6pt;
      border-radius: 3pt;
      font-size: 6pt;
      font-weight: 700;
      letter-spacing: 0.18em;
    }

    .m-counter-title {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 18pt;
      font-weight: 600;
      color: #1F1F1F;
      letter-spacing: 0.02em;
      line-height: 1.2;
      margin-bottom: 4pt;
    }

    .m-counter-desc {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 11pt;
      font-style: italic;
      color: #666666;
      line-height: 1.45;
    }

    .m-section-block {
      margin-bottom: 14pt;
      page-break-inside: auto;
      break-inside: auto;
    }

    .m-section-header {
      display: flex;
      align-items: center;
      gap: 10pt;
      margin-bottom: 8pt;
      page-break-after: avoid;
      break-after: avoid;
    }

    .m-dietary-badge {
      font-size: 7pt;
      font-weight: 600;
      letter-spacing: 0.2em;
      padding: 2pt 6pt;
      border-radius: 2pt;
    }

    .badge-veg {
      background: #E8F0E8;
      color: #1E5C1E;
    }

    .badge-nonveg {
      background: #F3EAE8;
      color: #7A281E;
    }

    .badge-neutral {
      background: #EAE5DD;
      color: #555555;
    }

    .m-section-rule {
      flex: 1;
      height: 0.5pt;
      background: #E5E0D8;
    }

    .m-dishes-grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 8pt;
    }

    .m-dish-row {
      page-break-inside: avoid;
      break-inside: avoid;
      padding-bottom: 6pt;
      border-bottom: 0.5pt solid #EAE5DD;
    }

    .m-dish-row:last-child {
      border-bottom: none;
    }

    .m-dish-name {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 13pt;
      font-weight: 600;
      color: #1F1F1F;
      line-height: 1.25;
    }

    .m-dish-desc {
      font-size: 8.5pt;
      color: #666666;
      line-height: 1.4;
      margin-top: 1pt;
    }

    .m-accompaniments-pill-card {
      background: #FFFFFF;
      border: 1pt solid #EAE5DD;
      border-radius: 4pt;
      padding: 8pt 12pt;
      margin-top: 10pt;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .m-acc-tag {
      font-size: 6.5pt;
      font-weight: 600;
      letter-spacing: 0.22em;
      color: #B38F2D;
      margin-bottom: 2pt;
    }

    .m-acc-text {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 10.5pt;
      font-style: italic;
      color: #444444;
    }

    /* ═══════════════════════════════════════════════════════════════
       FINAL PAGE: MODERN CLOSING
    ═══════════════════════════════════════════════════════════════ */
    .m-closing-page {
      padding: 24mm 20mm;
      background: #1C1917;
      color: #F8F5F0;
      text-align: center;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .m-closing-quote {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 22pt;
      font-style: italic;
      color: #FFFFFF;
      line-height: 1.35;
      margin-bottom: 18pt;
      max-width: 440pt;
      margin-left: auto;
      margin-right: auto;
    }

    .m-closing-text {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 12pt;
      color: rgba(248, 245, 240, 0.8);
      line-height: 1.65;
      max-width: 380pt;
      margin: 0 auto 30pt;
    }

    .m-closing-author {
      border-top: 0.5pt solid rgba(212, 175, 55, 0.3);
      padding-top: 16pt;
      display: inline-block;
    }

    .m-closing-author-name {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 16pt;
      font-weight: 600;
      color: #FFFFFF;
    }

    .m-closing-author-role {
      font-size: 8pt;
      font-weight: 500;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      color: #D4AF37;
      margin-top: 3pt;
    }
  </style>
</head>
<body>

  <!-- ══════════════════════════════════════════════════════════
       PAGE 1: MODERN COVER
  ══════════════════════════════════════════════════════════ -->
  <div class="m-page m-cover-page">
    ${heroDataUri ? `<img class="m-cover-bg-image" src="${heroDataUri}" alt="Cover Background" />` : ''}
    <div class="m-cover-overlay"></div>
    <div class="m-cover-border"></div>

    <div class="m-cover-top">
      <div>
        <div class="m-brand-name">THE EMBASSY</div>
        <div class="m-brand-sub">Catering Portfolio</div>
      </div>
      <div class="m-brand-est">
        Est. 1948<br>Delhi NCR
      </div>
    </div>

    <div class="m-cover-center">
      <span class="m-proposal-tag">Bespoke Proposal</span>
      <h1 class="m-client-title">${clientName}</h1>
      <div class="m-cover-divider"></div>
      <div class="m-event-subtitle">${functionType} · Private Gathering</div>
    </div>

    <div class="m-cover-bottom">
      <div class="m-meta-item">
        <div class="m-meta-label">Date</div>
        <div class="m-meta-val">${eventDate}</div>
      </div>
      <div class="m-meta-item">
        <div class="m-meta-label">Attendance</div>
        <div class="m-meta-val">${guestCount}</div>
      </div>
      <div class="m-meta-item">
        <div class="m-meta-label">Venue</div>
        <div class="m-meta-val">${venue}</div>
      </div>
    </div>
  </div>

  <!-- ══════════════════════════════════════════════════════════
       PAGE 2: SPECIFICATIONS OVERVIEW
  ══════════════════════════════════════════════════════════ -->
  <div class="m-page m-overview-page">
    <div>
      <div class="m-running-header">
        <span class="m-rh-left">The Embassy Catering</span>
        <span class="m-rh-right">Specifications · Page 02</span>
      </div>

      <div class="m-page-heading-block">
        <div class="m-page-sub">Event Blueprint</div>
        <h2 class="m-page-title">Executive Summary</h2>
      </div>

      <div class="m-specs-grid">
        <div class="m-spec-box">
          <div class="m-spec-label">Event Date</div>
          <div class="m-spec-value">${eventDate}</div>
        </div>
        <div class="m-spec-box">
          <div class="m-spec-label">Function</div>
          <div class="m-spec-value">${functionType}</div>
        </div>
        <div class="m-spec-box">
          <div class="m-spec-label">Guest Count</div>
          <div class="m-spec-value">${guestCount}</div>
        </div>
        <div class="m-spec-box">
          <div class="m-spec-label">Venue</div>
          <div class="m-spec-value">${venue}</div>
        </div>
      </div>

      <div class="m-notes-block">
        ${menu.requirements_note ? `
        <div class="m-note-card">
          <div class="m-note-card-title">Kitchen &amp; Production Requirements</div>
          <div class="m-note-card-content">${formatMultiline(menu.requirements_note)}</div>
        </div>` : ''}

        ${menu.exclusions_note ? `
        <div class="m-note-card">
          <div class="m-note-card-title">Commercial Exclusions</div>
          <div class="m-note-card-content">${formatMultiline(menu.exclusions_note)}</div>
        </div>` : ''}
      </div>

      <div class="m-signoff-bar">
        <div>
          <div class="m-signoff-title">Senior Consultant</div>
          <div class="m-signoff-name">${signedByName}</div>
          <div class="m-signoff-tel">${signedByPhone}</div>
        </div>
        <div style="font-size: 8pt; color: #D4AF37; letter-spacing: 0.2em; text-transform: uppercase;">
          The Embassy Group
        </div>
      </div>
    </div>

    <div class="m-running-footer">
      <span>The Embassy Catering Portfolio</span>
      <span>Confidential &amp; Proprietary</span>
    </div>
  </div>

  <!-- ══════════════════════════════════════════════════════════
       PAGE 3+: CURATED MENU SPREAD
  ══════════════════════════════════════════════════════════ -->
  <div class="m-page m-content-page">
    <div>
      <div class="m-running-header">
        <span class="m-rh-left">The Embassy Catering</span>
        <span class="m-rh-right">Menu Selection · Page 03</span>
      </div>

      ${countersHtml}
    </div>

    <div class="m-running-footer">
      <span>The Embassy Catering</span>
      <span>Delhi NCR · Estd. 1948</span>
    </div>
  </div>

  <!-- ══════════════════════════════════════════════════════════
       FINAL PAGE: MODERN CLOSING
  ══════════════════════════════════════════════════════════ -->
  <div class="m-page m-closing-page">
    <div>
      <div style="font-size: 7.5pt; font-weight: 700; letter-spacing: 0.35em; color: #D4AF37; text-transform: uppercase; margin-bottom: 20pt;">
        Culinary Philosophy
      </div>
      <div class="m-closing-quote">
        &ldquo;Crafting timeless culinary narratives that celebrate tradition with modern refinement.&rdquo;
      </div>
      <p class="m-closing-text">
        Every menu at The Embassy is an intentional composition of authentic spices, premium seasonal produce, and meticulous banquet execution. We look forward to creating an unforgettable celebration for you and your esteemed guests.
      </p>
    </div>

    <div class="m-closing-author">
      <div class="m-closing-author-name">${signedByName}</div>
      <div class="m-closing-author-role">Catering Director · The Embassy Group</div>
      <div style="font-size: 8pt; color: rgba(248, 245, 240, 0.6); margin-top: 4pt;">Direct Contact: ${signedByPhone}</div>
    </div>
  </div>

</body>
</html>`;
}
