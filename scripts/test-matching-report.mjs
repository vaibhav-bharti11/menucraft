// scripts/test-matching-report.mjs
// Comprehensive test suite & matching report generator for the 7-Level Matching Engine.

import { evaluateMenuItemMatch, createUsedImageTracker } from '../lib/pdf/imageMatcher.ts';
import { buildPremiumClassicHtml } from '../lib/pdf/premiumClassic.ts';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import puppeteerCore from 'puppeteer-core';

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

const QA_DIR = join(process.cwd(), 'public', 'qa-inspection');
if (!existsSync(QA_DIR)) {
  mkdirSync(QA_DIR, { recursive: true });
}

// ─── 1. Primary Required Dishes ───────────────────────────────────────────────

const testDishes = [
  { name: 'Assorted Bite Size Sandwich', desc: 'Crustless tea sandwiches layered with English cucumber, herbed cream cheese, and microgreens.', dietary: 'vegetarian', sec: 'Vegetarian Canapés', counter: 'ARRIVAL BITES & PHERA WELCOME' },
  { name: 'Cocktail Samosa', desc: 'Crisp pastry triangles stuffed with spiced potatoes, green peas, and roasted cumin.', dietary: 'vegetarian', sec: 'Vegetarian Canapés', counter: 'ARRIVAL BITES & PHERA WELCOME' },
  { name: 'Malabari Fish Curry Bites', desc: 'River sole simmered in spiced coconut milk and tempered with curry leaves.', dietary: 'seafood', sec: 'Non-Vegetarian Canapés', counter: 'ARRIVAL BITES & PHERA WELCOME' },
  { name: 'Tandoori Pomfret Morsels', desc: 'Silver pomfret marinated in Kashmiri chilies, carom seeds, and hung yogurt, roasted in tandoor.', dietary: 'seafood', sec: 'Non-Vegetarian Canapés', counter: 'ARRIVAL BITES & PHERA WELCOME' },
  { name: 'Smoked Paneer Tikka Skewers', desc: 'Cottage cheese steeped in mustard oil, yellow chili, and roasted gram flour, char-grilled over embers.', dietary: 'vegetarian', sec: 'Vegetarian Canapés', counter: 'ARRIVAL BITES & PHERA WELCOME' },
  { name: 'Classic Embassy Butter Chicken', desc: 'Tandoor-roasted chicken simmered in an aromatic tomato-butter satin sauce finished with dried fenugreek.', dietary: 'non-vegetarian', sec: 'Non-Vegetarian Specialties', counter: 'ROYAL AWADHI & MUGHLAI KITCHEN' },
  { name: 'Awadhi Chicken Biryani', desc: 'Fragrant chicken biryani infused with kewra essence, green cardamom, and rich saffron.', dietary: 'non-vegetarian', sec: 'Royal Rice Curations', counter: 'DUM PUKHT BIRYANI DASTARKHWAN' },
  { name: 'Embassy Dal Makhani', desc: 'Our signature black lentils slow-simmered for 24 hours with churned butter and dairy cream.', dietary: 'vegetarian', sec: 'Vegetarian Curations', counter: 'ROYAL AWADHI & MUGHLAI KITCHEN' },
  { name: 'Warm Angoori Gulab Jamun', desc: 'Mini golden khoya dumplings soaked in wild rose petal and cardamom syrup.', dietary: 'vegetarian', sec: 'Heritage Indian Mithai', counter: 'THE GRAND DESSERT SYMPHONY' },
  { name: 'Sushi Platter Selection', desc: 'Norwegian salmon nigiri, spicy tuna uramaki, and prawn tempura rolls with flying fish roe.', dietary: 'seafood', sec: 'Seafood & Specialty Rolls', counter: 'JAPANESE TEPPAN & SUSHI BAR' },
  { name: 'Truffled Wild Mushroom Pasta', desc: 'Artisanal fettuccine tossed in a rich black truffle and porcini mushroom reduction with aged parmesan.', dietary: 'vegetarian', sec: 'Live Pasta Station', counter: 'CONTINENTAL & MEDITERRANEAN LIVE' },
  { name: 'Wood-Fired Neapolitan Pizza', desc: 'Hand-stretched sourdough base with San Marzano tomato sauce, fresh buffalo mozzarella, and basil.', dietary: 'vegetarian', sec: 'Artisanal Pizza Station', counter: 'CONTINENTAL & MEDITERRANEAN LIVE' },
  
  // Bonus Level 3/5 Hierarchy Test Cases
  { name: 'Paneer Butter Masala', desc: 'Fresh cottage cheese cubes in rich spiced butter gravy.', dietary: 'vegetarian', sec: 'Main Course', counter: 'ROYAL AWADHI' },
  { name: 'Murgh Tikka Masala', desc: 'Charred chicken chunks in spiced onion tomato gravy.', dietary: 'non-vegetarian', sec: 'Main Course', counter: 'ROYAL AWADHI' },
  { name: 'Kesar Rasmalai', desc: 'Poached chenna discs in saffron infused condensed milk.', dietary: 'vegetarian', sec: 'Dessert', counter: 'DESSERT SYMPHONY' },
];

console.log('='.repeat(110));
console.log('  ITEM-LEVEL MATCHING REPORT (7-LEVEL HIERARCHY EVALUATION)');
console.log('='.repeat(110));

const reportTable = [];
const tracker = createUsedImageTracker();

for (const dish of testDishes) {
  const evalResult = evaluateMenuItemMatch(
    {
      itemName: dish.name,
      description: dish.desc,
      dietary: dish.dietary,
      sectionName: dish.sec,
      counterName: dish.counter,
    },
    tracker,
    35
  );

  reportTable.push({
    'Menu Item': dish.name,
    'Selected Image': evalResult.entry ? evalResult.entry.filename : 'None',
    'Score': evalResult.score >= 35 ? evalResult.score : '< 35',
    'Match Level': evalResult.matchLevel,
    'Confidence': evalResult.confidence,
    'Match Reason': evalResult.matchReason,
  });
}

console.table(reportTable);

// ─── 2. Critical Negative Safety Tests ────────────────────────────────────────

console.log('\n' + '='.repeat(110));
console.log('  CRITICAL NEGATIVE SAFETY TESTS (ZERO FALSE POSITIVE VERIFICATION)');
console.log('='.repeat(110));

const negativeTests = [
  { item: 'Cocktail Samosa', dietary: 'vegetarian', forbidden: ['sushi-platter.jpg', 'gulab-jamun.jpg', 'butter-chicken.jpg', 'paneer-tikka.jpg'] },
  { item: 'Malabari Fish Curry', dietary: 'seafood', forbidden: ['paneer-tikka.jpg', 'gulab-jamun.jpg', 'butter-chicken.jpg', 'chicken-biryani.jpg', 'dal-makhani.jpg'] },
  { item: 'Tandoori Pomfret', dietary: 'seafood', forbidden: ['paneer-tikka.jpg', 'gulab-jamun.jpg', 'butter-chicken.jpg', 'chicken-biryani.jpg', 'dal-makhani.jpg'] },
  { item: 'Gulab Jamun Dessert', dietary: 'vegetarian', forbidden: ['butter-chicken.jpg', 'chicken-biryani.jpg', 'sushi-platter.jpg', 'paneer-tikka.jpg', 'dal-makhani.jpg'] },
  { item: 'Neapolitan Pizza', dietary: 'vegetarian', forbidden: ['sushi-platter.jpg', 'butter-chicken.jpg', 'dal-makhani.jpg', 'gulab-jamun.jpg', 'paneer-tikka.jpg'] },
  { item: 'Mushroom Pasta', dietary: 'vegetarian', forbidden: ['sushi-platter.jpg', 'butter-chicken.jpg', 'dal-makhani.jpg', 'gulab-jamun.jpg', 'paneer-tikka.jpg'] },
];

let allNegativesPassed = true;
for (const nt of negativeTests) {
  const result = evaluateMenuItemMatch({ itemName: nt.item, dietary: nt.dietary }, new Set(), 35);
  const selected = result.entry ? result.entry.filename : 'None';
  const isForbidden = nt.forbidden.includes(selected);
  const status = isForbidden ? '❌ FAILED' : '✅ PASSED';
  if (isForbidden) allNegativesPassed = false;
  console.log(`  ${status}: "${nt.item}" -> Selected: "${selected}" (Forbidden: ${nt.forbidden.join(', ')})`);
}

if (!allNegativesPassed) {
  console.error('\n❌ CRITICAL: One or more negative safety tests failed!');
  process.exit(1);
} else {
  console.log('\n✅ ALL NEGATIVE SAFETY TESTS PASSED WITH 100% ISOLATION!\n');
}

// ─── 3. Full Realistic Menu for PDF Rendering ─────────────────────────────────

const fullRealisticMenu = {
  id: 'proposal-item-matching-test',
  proposal_title: 'A Symphony of Flavours & Refined Hospitality',
  client_name: 'Mr. Raghavendra Singhania',
  client_occasion: 'Grand Wedding Reception',
  event_date: 'Friday, 18 December 2026',
  event_venue: 'The Taj Palace, Diplomatic Enclave, New Delhi',
  guest_count: 650,
  serving_style: 'Royal Plated & Live Interactive Curation',
  company_name: 'The Embassy Catering',
  counters: [
    {
      id: 'c1',
      counter_type: 'canapes',
      display_name: 'Arrival Bites & Phera Welcome',
      display_name_print: 'Arrival Bites & Phera Welcome',
      description: 'Handcrafted bite-sized culinary preludes circulated on silver salvers alongside refreshing welcome infusions.',
      accompaniments: 'Pudina & Dhaniya Chutney, Saunth & Anardana Glaze, Truffle Garlic Aioli',
      accompaniments_label: 'Chutneys & Dips',
      sections: [
        {
          id: 'c1-s1',
          kind: 'veg',
          label: 'Vegetarian Canapés',
          dishes: [
            { id: 'd1', name: 'Assorted Bite Size Sandwich', description: 'Crustless tea sandwiches layered with English cucumber, herbed cream cheese, and microgreens.', dietary: 'veg' },
            { id: 'd2', name: 'Cocktail Samosa', description: 'Crisp pastry triangles stuffed with spiced potatoes, green peas, and roasted cumin.', dietary: 'veg' },
            { id: 'd3', name: 'Smoked Paneer Tikka Skewers', description: 'Cottage cheese steeped in mustard oil, yellow chili, and roasted gram flour, char-grilled over embers.', dietary: 'veg' }
          ]
        },
        {
          id: 'c1-s2',
          kind: 'non_veg',
          label: 'Non-Vegetarian Canapés',
          dishes: [
            { id: 'd4', name: 'Malabari Fish Curry Bites', description: 'River sole simmered in spiced coconut milk and tempered with curry leaves.', dietary: 'non_veg' },
            { id: 'd5', name: 'Tandoori Pomfret Morsels', description: 'Silver pomfret marinated in Kashmiri chilies, carom seeds, and hung yogurt, roasted in tandoor.', dietary: 'non_veg' }
          ]
        }
      ]
    },
    {
      id: 'c2',
      counter_type: 'main_course',
      display_name: 'Royal Awadhi & Mughlai Kitchen',
      display_name_print: 'Royal Awadhi & Mughlai Kitchen',
      description: 'A tribute to the culinary refinement of the Nawabs, simmered patiently in copper degs with fragrant essences.',
      accompaniments: 'Ulte Tawe Ka Paratha, Warqi Paratha, Roghani Naan, Burani Raita, Sirka Pyaz',
      accompaniments_label: 'Artisanal Breads & Condiments',
      sections: [
        {
          id: 'c2-s1',
          kind: 'veg',
          label: 'Vegetarian Curations',
          dishes: [
            { id: 'd6', name: 'Embassy Dal Makhani', description: 'Our signature black lentils slow-simmered for 24 hours with churned butter and dairy cream.', dietary: 'veg' },
            { id: 'd7', name: 'Kashmiri Dum Aloo', description: 'Baby potatoes simmered in yogurt and dried ginger gravy flavoured with fennel.', dietary: 'veg' }
          ]
        },
        {
          id: 'c2-s2',
          kind: 'non_veg',
          label: 'Non-Vegetarian Specialties',
          dishes: [
            { id: 'd8', name: 'Classic Embassy Butter Chicken', description: 'Tandoor-roasted chicken simmered in an aromatic tomato-butter satin sauce finished with dried fenugreek.', dietary: 'non_veg' },
            { id: 'd9', name: 'Awadhi Mutton Rogan Josh', description: 'Prime baby lamb cuts slow-braised with Kashmiri chillies and whole spices.', dietary: 'non_veg' }
          ]
        }
      ]
    },
    {
      id: 'c3',
      counter_type: 'live_counter',
      display_name: 'Japanese Teppan & Sushi Bar',
      display_name_print: 'Japanese Teppan & Sushi Bar',
      description: 'Master chefs preparing delicate handcrafted sushi rolls, nigiri, and hot robata grill skewers live before guests.',
      accompaniments: 'Fresh Hon-Wasabi, House Pickled Gari Ginger, Aged Tamari Soy Sauce',
      accompaniments_label: 'Artisanal Condiments',
      sections: [
        {
          id: 'c3-s1',
          kind: 'non_veg',
          label: 'Seafood & Specialty Rolls',
          dishes: [
            { id: 'd10', name: 'Sushi Platter Selection', description: 'Norwegian salmon nigiri, spicy tuna uramaki, and prawn tempura rolls with flying fish roe.', dietary: 'non_veg' }
          ]
        }
      ]
    },
    {
      id: 'c4',
      counter_type: 'rice',
      display_name: 'Dum Pukht Biryani Dastarkhwan',
      display_name_print: 'Dum Pukht Biryani Dastarkhwan',
      description: 'Aged long-grain basmati rice sealed with dough in heavy earthenware handis and cooked slowly on charcoal embers.',
      accompaniments: 'Hyderabadi Mirchi Ka Salan, Smoked Mint & Cucumber Raita',
      accompaniments_label: 'Traditional Accompaniments',
      sections: [
        {
          id: 'c4-s1',
          kind: 'non_veg',
          label: 'Royal Rice Curations',
          dishes: [
            { id: 'd11', name: 'Awadhi Chicken Biryani', description: 'Fragrant chicken biryani infused with kewra essence, green cardamom, and rich saffron.', dietary: 'non_veg' }
          ]
        }
      ]
    },
    {
      id: 'c5',
      counter_type: 'dessert',
      display_name: 'The Grand Dessert Symphony',
      display_name_print: 'The Grand Dessert Symphony',
      description: 'An indulgent grand finale featuring warm heritage Indian confections and artisanal sweet delicacies.',
      sections: [
        {
          id: 'c5-s1',
          kind: 'veg',
          label: 'Heritage Indian Mithai',
          dishes: [
            { id: 'd12', name: 'Warm Angoori Gulab Jamun', description: 'Mini golden khoya dumplings soaked in wild rose petal and cardamom syrup.', dietary: 'veg' }
          ]
        }
      ]
    }
  ]
};

// ─── 4. Render PDF & PNG Screenshots ──────────────────────────────────────────

async function renderQA() {
  console.log('\nBuilding HTML with buildPremiumClassicHtml...');
  const html = buildPremiumClassicHtml(fullRealisticMenu, {
    preparedFor: 'Mr. Raghavendra Singhania',
    eventName: 'Grand Wedding Reception',
    eventDate: 'Friday, 18 December 2026',
    venue: 'The Taj Palace, Diplomatic Enclave, New Delhi',
    paxCount: 650,
    preparedBy: 'The Embassy Catering Directorate',
    contactNumber: '+91 98990 04852',
    authorizerName: 'Pranay Bahl',
    authorizerTitle: 'Director of Banqueting & Gastronomy',
    productionNotes: 'Dedicated kitchen area with 3-phase commercial electrical supply, continuous fresh running water, and dedicated dry storage zone.\nSeparate service passage required for banquet stewards.',
    exclusions: 'Floral setups, banquet furniture, structural marquee tenting, and bar management are excluded from this culinary proposal.',
  });

  const htmlPath = join(QA_DIR, 'test-item-menu.html');
  writeFileSync(htmlPath, html, 'utf-8');
  console.log(`Saved HTML: ${htmlPath}`);

  console.log('Rendering screenshots for 13 pages...');
  const browser = await puppeteerCore.launch({
    executablePath: findChromePath(),
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });

  const pages = await page.$$('.pdf-page');
  console.log(`Found ${pages.length} pages to capture.`);

  for (let i = 0; i < pages.length; i++) {
    const pNum = String(i + 1).padStart(2, '0');
    const pngPath = join(QA_DIR, `page-${pNum}.png`);
    await pages[i].screenshot({ path: pngPath, type: 'png' });
    console.log(`Page ${i + 1} PNG saved: ${pngPath}`);
  }

  const pdfPath = join(process.cwd(), 'public', 'test-classic.pdf');
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
  });
  console.log(`PDF saved: ${pdfPath}`);

  await browser.close();
  console.log('\n✅ Visual QA generation complete!');
}

renderQA().catch(err => {
  console.error('Fatal QA error:', err);
  process.exit(1);
});
