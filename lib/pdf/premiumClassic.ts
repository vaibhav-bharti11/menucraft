// lib/pdf/premiumClassic.ts
// THE EMBASSY CATERING — Luxury Editorial Catering Proposal PDF
// Produces a high-end, client-ready A4 catering proposal & food catalogue.
//
// Highlights:
//  • Cover page with cinematic food hero photography & gold filigree framing
//  • Event specifications blueprint page with balanced card grid & sign-off seal
//  • Strategic full-bleed section dividers for major culinary courses
//  • Adaptive editorial menu layouts: 2-column spread for long menus,
//    magazine-style photography feature cards for focused courses (no blank gaps!)
//  • 100% deterministic local image matching (Zero AI/LLM, zero API latency)

import type { Menu, MenuCounter, DishRef } from '../types';
import {
  formatEventDate,
  formatGuestCount,
  formatText,
  formatMultiline,
  getImageAsBase64,
} from './helpers';
import {
  findBestMenuItemImage,
  findBestSectionImage,
  findHeroImage,
  markUsed,
  createUsedTracker,
  type UsedImageTracker,
} from './imageMatcher';

// ─── Counter Categorisation Helpers ──────────────────────────────────────────

function inferCuisineFromCounter(counterName: string): string[] {
  const lower = counterName.toLowerCase();
  const cuisineMap: [RegExp, string[]][] = [
    [/japanese|sushi|sashimi|maki|ramen|teppan|robata/i, ['japanese']],
    [/chinese|hakka|wok|schezwan|manchurian|dim sum/i, ['chinese', 'asian']],
    [/thai|pad.thai/i, ['thai', 'asian']],
    [/mughlai|awadhi|nihari|galouti|dum pukht/i, ['mughlai', 'awadhi', 'indian']],
    [/punjabi|tandoor|bhatti|sarson|lassi/i, ['punjabi', 'north-indian', 'indian']],
    [/south.?indian|chettinad|kerala|dosa|idli/i, ['south-indian', 'indian']],
    [/rajasthani/i, ['rajasthani', 'indian']],
    [/bengali/i, ['bengali', 'indian']],
    [/italian|pasta|pizza|risotto/i, ['italian', 'continental']],
    [/continental|european|french|mediterranean/i, ['continental', 'mediterranean']],
    [/mexican|tex.mex|taco/i, ['mexican']],
    [/indian|desi|subcontinental/i, ['indian', 'north-indian']],
  ];
  for (const [re, cuisines] of cuisineMap) {
    if (re.test(lower)) return cuisines;
  }
  return [];
}

function inferCategoryFromCounter(counterName: string): string[] {
  const lower = counterName.toLowerCase();
  if (/welcome|arrival|bites|canap|hors.d|cocktail|appetizer/i.test(lower)) return ['starter', 'welcome-bites'];
  if (/dessert|mithai|sweet|halwa|pastry|patisserie|pudding/i.test(lower)) return ['dessert'];
  if (/biryani|pulao|rice|dastarkhwan/i.test(lower)) return ['rice', 'main-course'];
  if (/bread|naan|roti|tandoor/i.test(lower)) return ['bread', 'live-counter'];
  if (/salad|crudit/i.test(lower)) return ['salad'];
  if (/soup|shorba/i.test(lower)) return ['soup'];
  if (/sushi|japanese/i.test(lower)) return ['sushi'];
  if (/live|station|teppan/i.test(lower)) return ['live-counter'];
  return ['main-course'];
}

function isLiveCounter(name: string): boolean {
  return /\blive\b|\bstation\b|\btandoor\b|\bwok\b|\bteppan\b|\bbar\b/i.test(name);
}

function getDietaryBadge(kind: string): { label: string; textClass: string; dotClass: string } {
  if (kind === 'VEG') return { label: 'Vegetarian', textClass: 'badge-veg', dotClass: 'dot-veg' };
  if (kind === 'NON_VEG') return { label: 'Non-Vegetarian', textClass: 'badge-nonveg', dotClass: 'dot-nonveg' };
  return { label: 'Specialty Selection', textClass: 'badge-neutral', dotClass: 'dot-neutral' };
}

// ─── CSS Design System ────────────────────────────────────────────────────────

function buildCss(): string {
  return `
    /* ── Reset & Core Print Setup ── */
    *, *::before, *::after {
      margin: 0; padding: 0; box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    @page { size: A4 portrait; margin: 0; }
    html, body {
      background: #FAF7F2;
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 11pt;
      line-height: 1.55;
      color: #222222;
      -webkit-font-smoothing: antialiased;
    }

    /* ── A4 Page Container ── */
    .pdf-page {
      width: 210mm;
      height: 297mm;
      min-height: 297mm;
      max-height: 297mm;
      position: relative;
      page-break-after: always;
      break-after: page;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }
    .pdf-page:last-child { page-break-after: avoid; break-after: avoid; }

    /* ══════════════════════════════════════════════════════════
       COVER PAGE
    ══════════════════════════════════════════════════════════ */
    .cover-page {
      background: #2E060D;
      color: #FAF7F2;
      position: relative;
      justify-content: space-between;
      padding: 18mm 16mm;
    }
    .cover-hero-image {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
      /* Removed opacity to fix PDF viewer lag on hover */
    }
    .cover-overlay {
      position: absolute;
      inset: 0;
      /* Simulating the opacity & radial gradient with a simple performant solid overlay */
      background: rgba(30, 3, 8, 0.75);
    }
    .cover-frame-outer {
      position: absolute;
      top: 10mm; bottom: 10mm; left: 10mm; right: 10mm;
      border: 0.75pt solid rgba(197,160,89,0.55);
      pointer-events: none; z-index: 2;
    }
    .cover-frame-inner {
      position: absolute;
      top: 13mm; bottom: 13mm; left: 13mm; right: 13mm;
      border: 0.4pt solid rgba(197,160,89,0.25);
      pointer-events: none; z-index: 2;
    }
    .corner { position: absolute; width: 12mm; height: 12mm; border-color: #C5A059; border-style: solid; z-index: 3; }
    .c-tl { top: 8.5mm; left: 8.5mm; border-width: 2pt 0 0 2pt; }
    .c-tr { top: 8.5mm; right: 8.5mm; border-width: 2pt 2pt 0 0; }
    .c-bl { bottom: 8.5mm; left: 8.5mm; border-width: 0 0 2pt 2pt; }
    .c-br { bottom: 8.5mm; right: 8.5mm; border-width: 0 2pt 2pt 0; }

    .cover-content {
      position: relative; z-index: 4;
      display: flex; flex-direction: column;
      height: 100%; justify-content: space-between;
      text-align: center;
    }

    /* Brand block */
    .brand-crest {
      width: 52pt; height: 52pt; border-radius: 50%;
      border: 1pt solid #C5A059;
      background: rgba(197,160,89,0.08);
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 10pt; position: relative;
    }
    .brand-crest::before {
      content: ''; position: absolute; inset: 3pt;
      border: 0.5pt dashed rgba(197,160,89,0.4); border-radius: 50%;
    }
    .crest-letter {
      font-family: 'Cinzel', serif; font-size: 24pt; font-weight: 700;
      color: #E2C787;
    }
    .brand-name {
      font-family: 'Cinzel', serif; font-size: 26pt; font-weight: 700;
      color: #FFFFFF; letter-spacing: 0.22em; text-transform: uppercase;
      margin-bottom: 3pt;
    }
    .brand-tagline {
      font-family: 'Jost', sans-serif; font-size: 7pt; font-weight: 600;
      letter-spacing: 0.42em; color: #C5A059; text-transform: uppercase;
    }
    .brand-est {
      font-family: 'Jost', sans-serif; font-size: 6pt; letter-spacing: 0.22em;
      color: rgba(250,247,242,0.6); text-transform: uppercase; margin-top: 3pt;
    }

    /* Center title block */
    .proposal-eyebrow {
      font-family: 'Jost', sans-serif; font-size: 7.5pt; font-weight: 600;
      letter-spacing: 0.38em; color: #E2C787; text-transform: uppercase;
      display: block; margin-bottom: 12pt;
    }
    .proposal-title {
      font-family: 'Playfair Display', Georgia, serif;
      font-size: 30pt; font-weight: 600; font-style: italic;
      color: #FFFFFF; line-height: 1.15; margin-bottom: 18pt;
      text-shadow: 0 2pt 16pt rgba(0,0,0,0.6);
    }
    .gold-rule {
      width: 120pt; height: 0.75pt;
      background: linear-gradient(90deg, transparent, #C5A059, transparent);
      margin: 0 auto 18pt;
    }
    .client-card {
      background: rgba(18,2,5,0.45);
      border: 0.75pt solid rgba(197,160,89,0.42);
      border-radius: 3pt; padding: 14pt 24pt;
      max-width: 380pt; margin: 0 auto;
    }
    .client-for {
      font-family: 'Jost', sans-serif; font-size: 6.5pt; font-weight: 600;
      letter-spacing: 0.32em; text-transform: uppercase; color: #C5A059; margin-bottom: 4pt;
    }
    .client-name {
      font-family: 'Cormorant Garamond', serif; font-size: 23pt; font-weight: 700;
      color: #FFFFFF; letter-spacing: 0.03em; margin-bottom: 2pt;
    }
    .client-occasion {
      font-family: 'Jost', sans-serif; font-size: 8.5pt; color: rgba(250,247,242,0.85);
      letter-spacing: 0.08em;
    }

    /* Cover footer metadata bar */
    .cover-meta-bar {
      display: flex; justify-content: center; align-items: center;
      gap: 16pt; margin-bottom: 10pt;
    }
    .cover-meta-item {
      font-family: 'Jost', sans-serif; font-size: 7.5pt; font-weight: 500;
      letter-spacing: 0.14em; color: rgba(250,247,242,0.9);
      text-transform: uppercase; display: flex; align-items: center; gap: 6pt;
    }
    .meta-tag {
      color: #C5A059; font-size: 6.5pt; font-weight: 700; letter-spacing: 0.2em;
    }
    .cover-heritage {
      font-family: 'Cormorant Garamond', serif; font-style: italic; font-size: 9.5pt;
      color: rgba(197,160,89,0.85); letter-spacing: 0.02em;
    }

    /* ══════════════════════════════════════════════════════════
       RUNNING HEADERS & FOOTERS (Inner Pages)
    ══════════════════════════════════════════════════════════ */
    .inner-page {
      padding: 10mm 16mm 8mm;
      justify-content: space-between;
    }
    .page-header {
      border-bottom: 0.6pt solid #C5A059;
      padding-bottom: 6pt; margin-bottom: 14pt;
      display: flex; justify-content: space-between; align-items: center;
      flex-shrink: 0;
    }
    .ph-brand {
      font-family: 'Cinzel', serif; font-size: 8.5pt; font-weight: 700;
      color: #3D0912; letter-spacing: 0.16em;
    }
    .ph-section {
      font-family: 'Jost', sans-serif; font-size: 6.5pt; letter-spacing: 0.22em;
      text-transform: uppercase; color: #888888;
    }
    .ph-page {
      font-family: 'Jost', sans-serif; font-size: 7.5pt; font-weight: 700;
      color: #3D0912; letter-spacing: 0.12em;
    }
    .page-footer {
      border-top: 0.5pt solid #E7DFD5;
      padding-top: 6pt;
      display: flex; justify-content: space-between; align-items: center;
      font-family: 'Jost', sans-serif; font-size: 6.5pt; letter-spacing: 0.12em;
      color: #999999; text-transform: uppercase; flex-shrink: 0;
    }
    .page-body { flex: 1; display: flex; flex-direction: column; }

    /* ══════════════════════════════════════════════════════════
       EVENT DETAILS / SPECIFICATIONS PAGE
    ══════════════════════════════════════════════════════════ */
    .event-title-block { text-align: center; margin-bottom: 18pt; }
    .kicker {
      display: block; font-family: 'Jost', sans-serif; font-size: 7pt; font-weight: 600;
      letter-spacing: 0.36em; text-transform: uppercase; color: #C5A059; margin-bottom: 3pt;
    }
    .main-heading {
      font-family: 'Playfair Display', serif; font-size: 22pt; font-weight: 600;
      color: #3D0912; letter-spacing: 0.02em;
    }
    .specs-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 10pt; margin-bottom: 12pt;
    }
    .spec-card {
      background: #FFFFFF; border: 1pt solid #E6DEC8;
      border-left: 3pt solid #3D0912; padding: 10pt 13pt; border-radius: 2pt;
    }
    .spec-label {
      font-family: 'Jost', sans-serif; font-size: 6.5pt; font-weight: 700;
      letter-spacing: 0.22em; text-transform: uppercase; color: #C5A059; margin-bottom: 2pt;
    }
    .spec-val {
      font-family: 'Cormorant Garamond', serif; font-size: 13pt; font-weight: 600;
      color: #1A1A1A; line-height: 1.25;
    }
    .note-card {
      background: #FFFFFF; border: 1pt solid #E6DEC8; border-radius: 2pt;
      padding: 9pt 13pt; margin-bottom: 8pt;
    }
    .note-label {
      font-family: 'Jost', sans-serif; font-size: 6.5pt; font-weight: 700;
      letter-spacing: 0.2em; text-transform: uppercase; color: #3D0912; margin-bottom: 3pt;
    }
    .note-text {
      font-family: 'Cormorant Garamond', serif; font-size: 10pt; font-style: italic;
      color: #4A4A4A; line-height: 1.45;
    }
    .scope-box {
      background: #F6F1EA; border: 0.75pt dashed #D9CEB9; border-radius: 2pt;
      padding: 10pt 14pt; margin-bottom: 10pt;
    }
    .scope-title {
      font-family: 'Jost', sans-serif; font-size: 6.5pt; font-weight: 700;
      letter-spacing: 0.22em; text-transform: uppercase; color: #3D0912; margin-bottom: 4pt;
    }
    .scope-list {
      display: grid; grid-template-columns: 1fr 1fr; gap: 4pt 16pt;
      font-family: 'Cormorant Garamond', serif; font-size: 9.5pt; color: #444;
    }
    .scope-item { display: flex; align-items: center; gap: 4pt; }
    .scope-dot { color: #C5A059; font-size: 8pt; }

    .signoff-bar {
      background: #FAF3E8; border: 1pt solid #E2D3B8; border-radius: 2pt;
      padding: 11pt 14pt; display: flex; justify-content: space-between;
      align-items: center; margin-top: auto;
    }
    .signoff-role {
      font-family: 'Jost', sans-serif; font-size: 6.5pt; font-weight: 600;
      letter-spacing: 0.2em; text-transform: uppercase; color: #C5A059; margin-bottom: 2pt;
    }
    .signoff-name {
      font-family: 'Cormorant Garamond', serif; font-size: 14pt; font-weight: 700; color: #3D0912;
    }
    .signoff-contact {
      font-family: 'Jost', sans-serif; font-size: 7.5pt; color: #666; margin-top: 1pt;
    }
    .seal-box {
      width: 46pt; height: 46pt; border: 1pt dashed #C5A059; border-radius: 50%;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      text-align: center; font-family: 'Cinzel', serif; font-size: 5.5pt; font-weight: 700;
      letter-spacing: 0.1em; color: #3D0912; line-height: 1.2;
    }
    .seal-star { font-size: 8pt; color: #C5A059; }

    /* ══════════════════════════════════════════════════════════
       SECTION DIVIDER PAGE
    ══════════════════════════════════════════════════════════ */
    .divider-page {
      background: #20040A;
      position: relative;
      justify-content: flex-end;
      padding: 0 16mm 18mm;
    }
    .divider-bg-img {
      position: absolute; inset: 0; width: 100%; height: 100%;
      object-fit: cover; object-position: center;
      /* Removed opacity for PDF viewer hover performance */
    }
    .divider-gradient {
      position: absolute; inset: 0;
      /* Using a solid background instead of a linear-gradient to fix PDF viewer hover lag */
      background: rgba(22, 3, 7, 0.82);
    }
    .divider-frame {
      position: absolute; top: 8mm; bottom: 8mm; left: 8mm; right: 8mm;
      border: 0.6pt solid rgba(197,160,89,0.4); pointer-events: none; z-index: 2;
    }
    .divider-content {
      position: relative; z-index: 3;
    }
    .divider-tag {
      display: inline-flex; align-items: center; gap: 4pt;
      background: rgba(0,0,0,0.4); border: 0.5pt solid rgba(197,160,89,0.5);
      color: #E2C787; font-family: 'Jost', sans-serif; font-size: 6.5pt; font-weight: 600;
      letter-spacing: 0.22em; text-transform: uppercase;
      padding: 3pt 8pt; border-radius: 12pt; margin-bottom: 10pt;
    }
    .divider-eyebrow {
      font-family: 'Jost', sans-serif; font-size: 7pt; font-weight: 600;
      letter-spacing: 0.4em; text-transform: uppercase; color: #C5A059; margin-bottom: 6pt;
    }
    .divider-title {
      font-family: 'Playfair Display', serif; font-size: 34pt; font-weight: 700;
      font-style: italic; color: #FFFFFF; line-height: 1.1; margin-bottom: 8pt;
      /* Removed heavy blur text-shadow that causes lag in PDF viewers */
      text-shadow: 0 1pt 2pt rgba(0,0,0,0.8);
    }
    .divider-desc {
      font-family: 'Cormorant Garamond', serif; font-size: 11pt; font-style: italic;
      color: rgba(250,247,242,0.85); line-height: 1.45; max-width: 420pt;
    }
    .divider-acc-card {
      background: rgba(0, 0, 0, 0.3); border: 0.5pt solid rgba(197, 160, 89, 0.3); border-radius: 2pt;
      padding: 8pt 12pt; margin-top: 14pt; max-width: 420pt;
    }
    .divider-acc-title {
      font-family: 'Jost', sans-serif; font-size: 6.5pt; font-weight: 700;
      letter-spacing: 0.22em; color: #E2C787; text-transform: uppercase; margin-bottom: 3pt;
      display: flex; align-items: center; gap: 4pt;
    }
    .divider-acc-gem { color: #C5A059; font-size: 7pt; }
    .divider-acc-content {
      font-family: 'Cormorant Garamond', serif; font-size: 10.5pt; font-style: italic;
      color: rgba(250, 247, 242, 0.85); line-height: 1.4;
    }

    /* ══════════════════════════════════════════════════════════
       MENU CONTENT PAGES
    ══════════════════════════════════════════════════════════ */
    .menu-header-block {
      text-align: center; margin-bottom: 12pt;
    }
    .menu-meta-row {
      display: flex; justify-content: center; align-items: center; gap: 8pt;
      margin-bottom: 3pt;
    }
    .menu-curation-tag {
      font-family: 'Jost', sans-serif; font-size: 6.5pt; font-weight: 600;
      letter-spacing: 0.28em; color: #C5A059; text-transform: uppercase;
    }
    .live-pill {
      background: #FDF0F0; color: #8B1A1A; border: 0.5pt solid #E8B4B8;
      padding: 1.5pt 6pt; border-radius: 8pt;
      font-family: 'Jost', sans-serif; font-size: 5.5pt; font-weight: 700;
      letter-spacing: 0.16em; text-transform: uppercase; display: inline-flex;
      align-items: center; gap: 3pt;
    }
    .live-dot { width: 3.5pt; height: 3.5pt; border-radius: 50%; background: #8B1A1A; }
    .menu-counter-title {
      font-family: 'Playfair Display', serif; font-size: 19pt; font-weight: 700;
      color: #3D0912; text-transform: uppercase; letter-spacing: 0.04em;
      line-height: 1.2; margin-bottom: 3pt;
    }
    .menu-counter-story {
      font-family: 'Cormorant Garamond', serif; font-size: 10pt; font-style: italic;
      color: #555555; max-width: 420pt; margin: 0 auto 3pt; line-height: 1.4;
    }
    .menu-ornament {
      display: flex; align-items: center; justify-content: center;
      gap: 6pt; margin: 4pt auto 10pt; width: 140pt;
    }
    .orn-line { flex: 1; height: 0.5pt; background: linear-gradient(90deg, transparent, #C5A059, transparent); }
    .orn-star { color: #C5A059; font-size: 6pt; }

    /* Dietary Badge Headers */
    .dietary-header {
      display: flex; align-items: center; gap: 6pt; margin-bottom: 7pt;
    }
    .dietary-badge {
      display: inline-flex; align-items: center; gap: 3.5pt;
      padding: 2pt 6pt; border-radius: 2pt; font-family: 'Jost', sans-serif;
      font-size: 6.5pt; font-weight: 700; letter-spacing: 0.2em; text-transform: uppercase;
    }
    .badge-veg { background: #F0F7F1; color: #1E5C22; border: 0.5pt solid #C2E2C5; }
    .badge-nonveg { background: #FDF2F3; color: #8B1A24; border: 0.5pt solid #F2CDD0; }
    .badge-neutral { background: #F3EFEA; color: #555; border: 0.5pt solid #DDD; }
    .badge-dot { width: 5pt; height: 5pt; border-radius: 50%; }
    .dot-veg { background: #28A745; }
    .dot-nonveg { background: #C0392B; }
    .dot-neutral { background: #888888; }
    .dietary-rule { flex: 1; height: 0.5pt; background: #E7DFD5; }

    /* Dish Items — Editorial Item-Level Layout */
    .dish-card {
      display: flex;
      align-items: flex-start;
      gap: 7.5pt;
      padding-bottom: 5pt;
      margin-bottom: 5pt;
      border-bottom: 0.5pt dotted #E5DFD7;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .dish-card:last-child { border-bottom: none; }
    
    .dish-thumb-wrap {
      width: 44pt;
      height: 44pt;
      flex-shrink: 0;
      border-radius: 2pt;
      overflow: hidden;
      border: 0.75pt solid #DECFC0;
      background: #EFE8DE;
      box-shadow: 0 1pt 3pt rgba(0,0,0,0.05);
    }
    .dish-thumb {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center;
      display: block;
    }
    
    .dish-info {
      flex: 1;
      min-width: 0;
    }
    .dish-info-full {
      width: 100%;
    }
    .dish-name {
      font-family: 'Cormorant Garamond', serif;
      font-size: 11pt;
      font-weight: 700;
      color: #1A1A1A;
      line-height: 1.25;
      letter-spacing: 0.02em;
    }
    .dish-desc {
      font-family: 'Cormorant Garamond', serif;
      font-size: 8.5pt;
      font-style: italic;
      color: #5C5C5C;
      line-height: 1.3;
      margin-top: 1pt;
    }

    /* ── Editorial Menu Grid Modes ── */
    .menu-sections-wrapper {
      display: flex;
      flex-direction: column;
      gap: 8pt;
      flex: 1;
    }
    .dishes-grid-2col {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 5pt 14pt;
    }
    .dishes-grid-1col {
      display: grid;
      grid-template-columns: 1fr;
      gap: 5pt;
    }

    /* Accompaniments Box */
    .acc-card {
      background: #F6F1EA; border: 1pt solid #E4DAC9; border-radius: 2pt;
      padding: 6pt 10pt; margin-top: 8pt;
    }
    .acc-title {
      font-family: 'Jost', sans-serif; font-size: 6pt; font-weight: 700;
      letter-spacing: 0.22em; color: #3D0912; text-transform: uppercase; margin-bottom: 2pt;
      display: flex; align-items: center; gap: 4pt;
    }
    .acc-gem { color: #C5A059; font-size: 7pt; }
    .acc-content {
      font-family: 'Cormorant Garamond', serif; font-size: 9pt; font-style: italic;
      color: #4A4A4A; line-height: 1.35;
    }

    /* ══════════════════════════════════════════════════════════
       COUNTER INTRO SPREAD PAGE
    ══════════════════════════════════════════════════════════ */
    .feature-spread-page {
      display: flex; flex-direction: row;
      background: #FAF7F2; padding: 0; margin: 0;
    }
    .feature-left {
      width: 48%; height: 100%; position: relative;
    }
    .feature-left-img {
      width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;
    }
    .feature-right {
      width: 52%; height: 100%; padding: 12mm; display: flex; flex-direction: column; justify-content: center;
    }
    .feature-header-block { margin-bottom: 12pt; border-bottom: 0.6pt solid #C5A059; padding-bottom: 10pt; }
    .feature-kicker { font-family: 'Jost', sans-serif; font-size: 6.5pt; font-weight: 600; letter-spacing: 0.28em; color: #C5A059; text-transform: uppercase; margin-bottom: 4pt; display: block; }
    .feature-title { font-family: 'Playfair Display', serif; font-size: 26pt; font-weight: 700; color: #3D0912; text-transform: uppercase; line-height: 1.1; margin-bottom: 8pt; }
    .feature-desc { font-family: 'Cormorant Garamond', serif; font-size: 11.5pt; font-style: italic; color: #555; line-height: 1.45; }
    .feature-dishes-wrap { flex: 1; display: flex; flex-direction: column; gap: 4pt; padding-top: 8pt; }
    .feature-footer-block { border-top: 0.5pt solid #E7DFD5; padding-top: 8pt; margin-top: auto; display: flex; justify-content: space-between; align-items: flex-end; }
    .feature-support-img { width: 90pt; height: 90pt; object-fit: cover; border-radius: 2pt; border: 1pt solid #DECFC0; box-shadow: 0 2pt 8pt rgba(0,0,0,0.08); }
    .feature-branding { text-align: right; padding-bottom: 4pt; margin-left: auto; }

    /* ══════════════════════════════════════════════════════════
       DISH SHOWCASE PAGES (2 ROWS PER PAGE)
    ══════════════════════════════════════════════════════════ */
    .showcase-page {
      background: #FAF7F2; padding: 0; margin: 0;
      display: flex; flex-direction: column;
    }
    .showcase-row {
      display: flex; flex-direction: row; flex: 1;
      height: 50%; 
    }
    .showcase-row + .showcase-row {
      border-top: 1pt solid #E7DFD5;
    }
    .showcase-left {
      width: 48%; height: 100%; position: relative;
    }
    .showcase-left-img {
      width: 100%; height: 100%; object-fit: cover; object-position: center; display: block;
    }
    .showcase-right {
      width: 52%; height: 100%; padding: 12mm; display: flex; flex-direction: column; justify-content: center;
    }
    .showcase-title {
      font-family: 'Playfair Display', serif; font-size: 21pt; font-weight: 700; color: #1A1A1A; line-height: 1.15; margin-bottom: 6pt;
    }
    .showcase-desc {
      font-family: 'Cormorant Garamond', serif; font-size: 11pt; font-style: italic; color: #555; line-height: 1.4; margin-bottom: 10pt;
    }
    .showcase-meta {
      display: flex; align-items: center; gap: 8pt;
    }

    /* ══════════════════════════════════════════════════════════
       CLOSING PAGE
    ══════════════════════════════════════════════════════════ */
    .closing-page {
      background: #FAF7F2; text-align: center; justify-content: center;
      padding: 20mm; position: relative;
    }
    .closing-crest {
      width: 44pt; height: 44pt; border-radius: 50%;
      border: 1pt solid #C5A059; background: rgba(197,160,89,0.06);
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 8pt;
    }
    .closing-brand-title {
      font-family: 'Cinzel', serif; font-size: 17pt; font-weight: 700;
      color: #3D0912; letter-spacing: 0.18em;
    }
    .closing-brand-subtitle {
      font-family: 'Jost', sans-serif; font-size: 6.5pt; letter-spacing: 0.3em;
      color: #C5A059; text-transform: uppercase; margin-top: 2pt;
    }
    .closing-quote {
      font-family: 'Playfair Display', serif; font-size: 17pt; font-style: italic;
      color: #3D0912; line-height: 1.35; margin: 20pt auto 14pt; max-width: 400pt;
    }
    .closing-text {
      font-family: 'Cormorant Garamond', serif; font-size: 10.5pt; color: #555;
      line-height: 1.65; margin: 0 auto 24pt; max-width: 380pt;
    }
    .closing-sig-block {
      border-top: 0.5pt solid #C5A059; padding-top: 14pt; display: inline-block;
    }
    .sig-regards {
      font-family: 'Cormorant Garamond', serif; font-style: italic; font-size: 10pt;
      color: #777; margin-bottom: 4pt;
    }
    .sig-person {
      font-family: 'Playfair Display', serif; font-size: 15pt; font-weight: 700; color: #1A1A1A;
    }
    .sig-designation {
      font-family: 'Jost', sans-serif; font-size: 7pt; letter-spacing: 0.2em;
      text-transform: uppercase; color: #3D0912; margin-top: 2pt;
    }
    .sig-phone-num {
      font-family: 'Jost', sans-serif; font-size: 7.5pt; color: #666; margin-top: 2pt;
    }
    .closing-footer-bar {
      position: absolute; bottom: 8mm; left: 16mm; right: 16mm;
      border-top: 0.5pt solid #E7DFD5; padding-top: 6pt;
      display: flex; justify-content: space-between;
      font-family: 'Jost', sans-serif; font-size: 6.5pt; letter-spacing: 0.12em;
      color: #999; text-transform: uppercase;
    }
  `;
}

// ─── Component Renderers ──────────────────────────────────────────────────────

function renderCoverPage(
  menu: Menu,
  heroDataUri: string | null,
  eventDate: string,
  guestCount: string,
  clientName: string,
  functionType: string,
  venue: string
): string {
  const heroImg = heroDataUri
    ? `<img class="cover-hero-image" src="${heroDataUri}" alt="Culinary showcase" />`
    : '';

  return `
  <div class="pdf-page cover-page">
    ${heroImg}
    <div class="cover-overlay"></div>
    <div class="cover-frame-outer"></div>
    <div class="cover-frame-inner"></div>
    <div class="corner c-tl"></div><div class="corner c-tr"></div>
    <div class="corner c-bl"></div><div class="corner c-br"></div>

    <div class="cover-content">
      <div>
        <div class="brand-crest"><span class="crest-letter">E</span></div>
        <div class="brand-name">The Embassy</div>
        <div class="brand-tagline">Bespoke Catering Services</div>
        <div class="brand-est">Established 1948 &middot; Delhi NCR</div>
      </div>

      <div>
        <span class="proposal-eyebrow">Exclusive Culinary Proposal</span>
        <div class="proposal-title">A Symphony of Flavours<br>&amp; Refined Hospitality</div>
        <div class="gold-rule"></div>
        <div class="client-card">
          <div class="client-for">Prepared Exclusively For</div>
          <div class="client-name">${clientName}</div>
          <div class="client-occasion">${functionType}</div>
        </div>
      </div>

      <div>
        <div class="cover-meta-bar">
          <div class="cover-meta-item"><span class="meta-tag">DATE:</span> ${eventDate}</div>
          <span style="color:rgba(197,160,89,0.5);">&middot;</span>
          <div class="cover-meta-item"><span class="meta-tag">ATTENDANCE:</span> ${guestCount}</div>
          ${venue && venue !== 'Venue to be finalized' ? `
          <span style="color:rgba(197,160,89,0.5);">&middot;</span>
          <div class="cover-meta-item"><span class="meta-tag">VENUE:</span> ${venue}</div>` : ''}
        </div>
        <div class="cover-heritage">Over seven decades of culinary legacy, crafted with passion and precision.</div>
      </div>
    </div>
  </div>`;
}

function renderEventPage(
  menu: Menu,
  eventDate: string,
  guestCount: string,
  clientName: string,
  functionType: string,
  venue: string,
  signedByName: string,
  signedByPhone: string,
  pageNum: number
): string {
  return `
  <div class="pdf-page inner-page">
    <div class="page-header">
      <span class="ph-brand">THE EMBASSY CATERING</span>
      <span class="ph-section">Event Specifications &middot; Page ${String(pageNum).padStart(2, '0')}</span>
      <span class="ph-page">PAGE ${String(pageNum).padStart(2, '0')}</span>
    </div>

    <div class="page-body">
      <div class="event-title-block">
        <span class="kicker">Catering Blueprint</span>
        <div class="main-heading">Event Specifications &amp; Overview</div>
      </div>

      <div class="specs-grid">
        <div class="spec-card">
          <div class="spec-label">Date of Celebration</div>
          <div class="spec-val">${eventDate}</div>
        </div>
        <div class="spec-card">
          <div class="spec-label">Occasion / Function</div>
          <div class="spec-val">${functionType}</div>
        </div>
        <div class="spec-card">
          <div class="spec-label">Guest Attendance</div>
          <div class="spec-val">${guestCount}</div>
        </div>
        <div class="spec-card">
          <div class="spec-label">Celebration Venue</div>
          <div class="spec-val">${venue}</div>
        </div>
      </div>

      ${menu.requirements_note ? `
      <div class="note-card">
        <div class="note-label">&#9889; Production &amp; Operational Requirements</div>
        <div class="note-text">${formatMultiline(menu.requirements_note)}</div>
      </div>` : ''}

      ${menu.exclusions_note ? `
      <div class="note-card">
        <div class="note-label" style="color:#777;">&#9432; Commercial Exclusions &amp; Scope Limits</div>
        <div class="note-text">${formatMultiline(menu.exclusions_note)}</div>
      </div>` : ''}

      <div class="scope-box">
        <div class="scope-title">&#10022; Standard Embassy Catering Commitments</div>
        <div class="scope-list">
          <div class="scope-item"><span class="scope-dot">&#10003;</span> Dedicated On-Site Executive Chef &amp; Kitchen Brigade</div>
          <div class="scope-item"><span class="scope-dot">&#10003;</span> Premium Bone China &amp; Silver-Plated Tableware</div>
          <div class="scope-item"><span class="scope-dot">&#10003;</span> Live Temperature-Controlled Banquet Stations</div>
          <div class="scope-item"><span class="scope-dot">&#10003;</span> Strict HACCP Certified Food Safety Protocol</div>
        </div>
      </div>

      <div class="signoff-bar">
        <div>
          <div class="signoff-role">Authorized Catering Director</div>
          <div class="signoff-name">${signedByName}</div>
          <div class="signoff-contact">Direct Mobile: ${signedByPhone} &middot; The Embassy Banqueting Directorate</div>
        </div>
        <div class="seal-box">
          <span>THE</span><span>EMBASSY</span>
          <span class="seal-star">&#9733;</span>
          <span>APPROVED</span>
        </div>
      </div>
    </div>

    <div class="page-footer">
      <span>The Embassy Catering &middot; Established 1948</span>
      <span>Confidential Client Proposal</span>
    </div>
  </div>`;
}

function renderSectionDivider(
  counter: MenuCounter,
  counterIndex: number,
  totalCounters: number,
  imgDataUri: string | null
): string {
  const title = formatText(counter.display_name_print || counter.display_name, 'Curated Selection');
  const isLive = isLiveCounter(counter.display_name);
  const liveTag = isLive
    ? `<div class="divider-tag"><span style="width:4pt;height:4pt;border-radius:50%;background:#E2C787;display:inline-block;"></span> Live Culinary Station</div>`
    : `<div class="divider-tag">Curation ${String(counterIndex + 1).padStart(2, '0')} of ${String(totalCounters).padStart(2, '0')}</div>`;

  const heroImg = imgDataUri
    ? `<img class="divider-bg-img" src="${imgDataUri}" alt="${title}" />`
    : '';

  const eyebrow = counterIndex === 0 
    ? 'The Embassy Catering &middot; Commencing First Course'
    : 'The Embassy Catering &middot; Commencing Next Course';

  // Accompaniments HTML for the dark divider page
  let accHtml = '';
  if (counter.accompaniments && counter.accompaniments.trim() !== '') {
    const accLabel = counter.accompaniments_label || 'Accompaniments & Condiments';
    accHtml = `
      <div class="divider-acc-card">
        <div class="divider-acc-title"><span class="divider-acc-gem">&#10070;</span> ${formatText(accLabel)}</div>
        <div class="divider-acc-content">${formatText(counter.accompaniments)}</div>
      </div>`;
  }

  return `
  <div class="pdf-page divider-page">
    ${heroImg}
    <div class="divider-gradient"></div>
    <div class="divider-frame"></div>
    <div class="divider-content">
      ${liveTag}
      <div class="divider-eyebrow">${eyebrow}</div>
      <div class="divider-title">${title}</div>
      ${counter.description ? `<div class="divider-desc">${formatText(counter.description)}</div>` : ''}
      ${accHtml}
    </div>
  </div>`;
}

interface DishRenderItem {
  dish: DishRef;
  imageDataUri: string | null;
  imageName?: string;
}

function renderDishCard(item: DishRenderItem, hideThumbnail: boolean = false): string {
  const { dish, imageDataUri, imageName } = item;
  const imgHtml = (!hideThumbnail && imageDataUri)
    ? `<div class="dish-thumb-wrap">
         <img class="dish-thumb" src="${imageDataUri}" alt="${formatText(imageName || dish.name)}" />
       </div>`
    : '';

  return `
    <div class="dish-card ${(imageDataUri && !hideThumbnail) ? 'has-dish-image' : 'text-only-card'}">
      ${imgHtml}
      <div class="dish-info ${(!imageDataUri || hideThumbnail) ? 'dish-info-full' : ''}">
        <div class="dish-name">${formatText(dish.name)}</div>
        <div class="dish-desc">${formatText(dish.description || 'An exquisite culinary creation featuring authentic flavours and premium ingredients, crafted by our master chefs.')}</div>
      </div>
    </div>`;
}

function renderCounterIntro(
  counter: MenuCounter,
  counterIndex: number,
  totalCounters: number,
  pageNum: number,
  heroDataUri: string | null
): string {
  const isLive = isLiveCounter(counter.display_name);
  const title = formatText(counter.display_name_print || counter.display_name, 'Curated Selection').toUpperCase();

  // Accompaniments HTML
  let accHtml = '';
  if (counter.accompaniments && counter.accompaniments.trim() !== '') {
    const accLabel = counter.accompaniments_label || 'Accompaniments & Condiments';
    accHtml = `
      <div class="acc-card">
        <div class="acc-title"><span class="acc-gem">&#10070;</span> ${formatText(accLabel)}</div>
        <div class="acc-content">${formatText(counter.accompaniments)}</div>
      </div>`;
  }

  return `
  <div class="pdf-page feature-spread-page">
    <div class="feature-left">
      ${heroDataUri ? `<img class="feature-left-img" src="${heroDataUri}" alt="Hero Image" />` : '<div style="width:100%;height:100%;background:#EAE3D9;"></div>'}
    </div>
    <div class="feature-right">
      <div class="feature-header-block">
        <span class="feature-kicker">CURATION ${String(counterIndex + 1).padStart(2, '0')} OF ${String(totalCounters).padStart(2, '0')} ${isLive ? '&middot; LIVE STATION' : ''}</span>
        <div class="feature-title">${title}</div>
        ${counter.description ? `<div class="feature-desc">${formatText(counter.description)}</div>` : ''}
      </div>
      
      <div class="feature-dishes-wrap">
        ${accHtml}
      </div>

      <div class="feature-footer-block">
        <div class="feature-branding">
          <div class="ph-brand" style="margin-bottom:2pt;">THE EMBASSY CATERING</div>
          <div class="ph-page" style="font-size:6.5pt;color:#999;">PAGE ${String(pageNum).padStart(2, '0')}</div>
        </div>
      </div>
    </div>
  </div>`;
}

interface DishShowcaseItem {
  dish: DishRef;
  sectionLabel: string;
  badge: ReturnType<typeof getDietaryBadge>;
  imageDataUri: string | null;
}

function renderDishShowcasePages(items: DishShowcaseItem[], startPageNum: number): { html: string; pagesUsed: number } {
  let html = '';
  let pagesUsed = 0;
  
  // Chunk items into pairs of 2
  for (let i = 0; i < items.length; i += 2) {
    const chunk = items.slice(i, i + 2);
    pagesUsed++;
    
    let rowsHtml = chunk.map(item => {
      const { dish, sectionLabel, badge, imageDataUri } = item;
      const imgHtml = imageDataUri 
        ? `<img class="showcase-left-img" src="${imageDataUri}" alt="Dish Image" />`
        : `<div style="width:100%;height:100%;background:#F2ECE4;display:flex;align-items:center;justify-content:center;color:#D8CABA;font-family:'Cinzel',serif;font-size:30pt;">THE EMBASSY</div>`;
        
      return `
        <div class="showcase-row">
          <div class="showcase-left">
            ${imgHtml}
          </div>
          <div class="showcase-right">
            <div class="showcase-title">${formatText(dish.name)}</div>
            <div class="showcase-desc">${formatText(dish.description || 'An exquisite culinary creation featuring authentic flavours and premium ingredients, crafted by our master chefs.')}</div>
            <div class="showcase-meta">
              <span class="dietary-badge ${badge.textClass}">
                <span class="badge-dot ${badge.dotClass}"></span>
                ${badge.label}
              </span>
              ${sectionLabel && sectionLabel.toUpperCase() !== badge.label.toUpperCase() ? `<span style="font-family:'Jost',sans-serif;font-size:6pt;letter-spacing:0.2em;color:#999;text-transform:uppercase;">${formatText(sectionLabel)}</span>` : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
    
    // If there's only 1 item on this page, add an empty row to maintain the 50% height structure
    if (chunk.length === 1) {
      rowsHtml += `
        <div class="showcase-row">
          <div class="showcase-left" style="background:#FAF7F2;"></div>
          <div class="showcase-right"></div>
        </div>
      `;
    }

    html += `
      <div class="pdf-page showcase-page">
        ${rowsHtml}
      </div>
    `;
  }
  
  return { html, pagesUsed };
}

function renderClosingPage(signedByName: string, signedByPhone: string): string {
  return `
  <div class="pdf-page closing-page">
    <div class="closing-crest">
      <span class="crest-letter" style="font-size:20pt;color:#3D0912;">E</span>
    </div>
    <div class="closing-brand-title">THE EMBASSY</div>
    <div class="closing-brand-subtitle">Catering Since 1948</div>

    <div class="closing-quote">
      &ldquo;Hospitality is not merely what we serve,<br>but the enduring memories we create together.&rdquo;
    </div>
    <p class="closing-text">
      Thank you for granting The Embassy Catering the honour of curating the gastronomic journey
      for your celebratory occasion. Our master chefs, experienced banquet stewards, and culinary
      directors remain dedicated to executing an unforgettable experience.
    </p>
    <div class="closing-sig-block">
      <div class="sig-regards">With warmest regards &amp; culinary compliments,</div>
      <div class="sig-person">${signedByName}</div>
      <div class="sig-designation">Senior Culinary Consultant</div>
      <div class="sig-phone-num">${signedByPhone}</div>
    </div>

    <div class="closing-footer-bar">
      <span>The Embassy Catering Services</span>
      <span>Exceptional Celebrations</span>
    </div>
  </div>`;
}

// ─── Main Export Function ─────────────────────────────────────────────────────

export function buildPremiumClassicHtml(menu: Menu): string {
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

  const usedIds = createUsedTracker();

  // 1. Cover Hero Image
  const heroEntry = findHeroImage(menu.function_type || '', usedIds);
  const heroDataUri = heroEntry ? getImageAsBase64(heroEntry.filename) : null;
  if (heroEntry) markUsed(heroEntry, usedIds);

  const pages: string[] = [];
  let pageNum = 1;

  // Cover Page
  pages.push(renderCoverPage(menu, heroDataUri, eventDate, guestCount, clientName, functionType, venue));

  // Event Details Page
  pageNum = 2;
  pages.push(renderEventPage(menu, eventDate, guestCount, clientName, functionType, venue, signedByName, signedByPhone, pageNum));

  // Per-Counter Pages: Intro Page + Dish Showcase Pages
  for (let ci = 0; ci < validCounters.length; ci++) {
    const counter = validCounters[ci];
    const counterName = counter.display_name_print || counter.display_name;
    const cuisineHints = inferCuisineFromCounter(counterName);
    const categoryHints = inferCategoryFromCounter(counterName);

    const validSections = counter.sections.filter(s => s.dishes && s.dishes.length > 0);

    // 1. Counter Intro Page
    pageNum++;
    let heroDataUri: string | null = null;
    
    // FIRST PRIORITY: Check for a dedicated Curation / Counter Image
    // We will store these as: /menu-images/counters/c_{counter_type_id}.jpg or .png
    heroDataUri = getImageAsBase64(`c_${counter.counter_type_id}.jpg`, 'counters');
    if (!heroDataUri) {
      heroDataUri = getImageAsBase64(`c_${counter.counter_type_id}.png`, 'counters');
    }
    
    // SECOND PRIORITY: Pick the most representative dish image from THIS counter
    if (!heroDataUri) {
      const allDishes = validSections.flatMap(s => (s.dishes || []).map(d => ({ dish: d, sec: s })));
      for (const representative of allDishes) {
        const match = findBestMenuItemImage(
          {
            dishId: representative.dish.dish_id,
            itemName: representative.dish.name,
            description: representative.dish.description,
            category: categoryHints,
            cuisine: cuisineHints,
            dietary: representative.dish.dietary || representative.sec.kind,
            sectionName: representative.sec.label,
            counterName,
          },
          usedIds,
          35
        );
        if (match) {
          heroDataUri = getImageAsBase64(match.filename);
          break; // Do not markUsed so it appears on showcase page
        }
      }
    }

    // THIRD PRIORITY: Fallback to section semantic match
    if (!heroDataUri) {
      const heroEntry = findBestSectionImage({ counterName, categoryHints, cuisineHints, description: counter.description }, usedIds);
      if (heroEntry) {
        heroDataUri = getImageAsBase64(heroEntry.filename);
        markUsed(heroEntry, usedIds);
      }
    }

    // Add a dramatic dark divider page to signal the start of a new counter
    pages.push(renderSectionDivider(counter, ci, totalCounters, heroDataUri));
    
    // 2. Dish Showcase Pages (2 per page)
    const showcaseItems: DishShowcaseItem[] = [];
    
    validSections.forEach(sec => {
      const badge = getDietaryBadge(sec.kind);
      const label = sec.label || badge.label;
      
      (sec.dishes || []).forEach(d => {
        const match = findBestMenuItemImage(
          {
            dishId: d.dish_id,
            itemName: d.name,
            description: d.description,
            category: categoryHints,
            cuisine: cuisineHints,
            dietary: d.dietary || sec.kind,
            sectionName: sec.label,
            counterName,
          },
          usedIds,
          35
        );

        let imageDataUri: string | null = null;
        if (match) {
          imageDataUri = getImageAsBase64(match.filename);
          if (imageDataUri) markUsed(match, usedIds);
        }

        showcaseItems.push({
          dish: d,
          sectionLabel: label,
          badge,
          imageDataUri
        });
      });
    });

    if (showcaseItems.length > 0) {
      const { html, pagesUsed } = renderDishShowcasePages(showcaseItems, pageNum + 1);
      pages.push(html);
      pageNum += 1 + pagesUsed;
    } else {
      pageNum += 1;
    }
  }

  // Closing Page
  pageNum++;
  pages.push(renderClosingPage(signedByName, signedByPhone));

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
${buildCss()}
  </style>
</head>
<body>
${pages.join('\n')}
</body>
</html>`;
}
