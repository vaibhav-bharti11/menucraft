// scripts/inspect-pdf-pages.mjs
import puppeteerCore from 'puppeteer-core';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import http from 'http';

const CANDIDATE_CHROME_PATHS = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean);

function findChromePath() {
  for (const p of CANDIDATE_CHROME_PATHS) {
    if (existsSync(p)) return p;
  }
  return 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
}

const realisticMenu = {
  id: 'menu-qa-001',
  client_name: 'Mr. Raghavendra Singhania',
  event_date: '2026-12-18',
  function_type: 'Grand Wedding Reception',
  guest_count: '650 Pax',
  venue: 'The Taj Palace, Diplomatic Enclave, New Delhi',
  requirements_note: 'Dedicated kitchen area with 3-phase commercial electrical supply, continuous fresh running water, and dedicated dry storage zone.\nSeparate service passage required for banquet stewards.',
  exclusions_note: 'Floral setups, banquet furniture, structural marquee tenting, and bar management are excluded from this culinary proposal.',
  signed_by_name: 'Pranay Bahl',
  signed_by_phone: '+91 98990 04852',
  status: 'CONFIRMED',
  created_at: '2026-08-01T00:00:00Z',
  updated_at: '2026-08-31T00:00:00Z',
  counters: [
    {
      id: 'c1',
      counter_type_id: 'ct1',
      display_name: 'Arrival Hors d\'œuvres',
      display_name_print: 'ARRIVAL HORS D\'ŒUVRES',
      description: 'Handcrafted bite-sized culinary preludes circulated on silver salvers alongside refreshing welcome infusions.',
      accompaniments_label: 'Chutneys & Dips',
      accompaniments: 'Pudina & Dhaniya Chutney, Saunth & Anardana Glaze, Truffle Garlic Aioli, Raw Mango Relish',
      sections: [
        {
          label: 'Vegetarian Canapés',
          kind: 'VEG',
          dishes: [
            { dish_id: 'd1', name: 'Smoked Paneer Tikka Skewers', description: 'Cottage cheese steeped in mustard oil, yellow chili, and roasted gram flour, char-grilled over charcoal embers.' },
            { dish_id: 'd2', name: 'Dahi Kebab Truffles', description: 'Hung spiced yogurt encased in golden crust, finished with crushed pistachios and pomegranate caviar.' },
            { dish_id: 'd3', name: 'Tandoori Stuffed Button Mushrooms', description: 'Button mushrooms stuffed with herbed goat cheese and bell pepper concassé.' },
            { dish_id: 'd4', name: 'Crispy Lotus Stem Chaat', description: 'Crisp fried lotus root discs tossed in sweet tamarind, tangy yogurt, and microgreens.' },
            { dish_id: 'd5', name: 'Wild Mushroom Tartlets', description: 'Buttery shortcrust pastry filled with wild forest mushroom duxelles and parmesan.' }
          ]
        },
        {
          label: 'Non-Vegetarian Canapés',
          kind: 'NON_VEG',
          dishes: [
            { dish_id: 'd6', name: 'Bhatti Da Murgh Tikka', description: 'Boneless chicken morsels marinated in robust Punjabi spices, charred in the clay oven.' },
            { dish_id: 'd7', name: 'Mutton Galouti Kebab on Sheermal', description: 'Melt-in-mouth smoked lamb patties subtly flavoured with 32 spices, served on mini saffron flatbreads.' },
            { dish_id: 'd8', name: 'Kasundi Mustard Fish Goujons', description: 'Crisp river sole crusted with Bengal kasundi mustard and carom seeds.' },
            { dish_id: 'd9', name: 'Zaffrani Chicken Seekh', description: 'Tender chicken mince blended with saffron strands, mace, and royal cumin.' }
          ]
        }
      ]
    },
    {
      id: 'c2',
      counter_type_id: 'ct2',
      display_name: 'Royal Awadhi & Mughlai Kitchen',
      display_name_print: 'ROYAL AWADHI & MUGHLAI KITCHEN',
      description: 'A tribute to the culinary refinement of the Nawabs, simmered patiently in copper degs with fragrant essences.',
      accompaniments_label: 'Artisanal Breads & Condiments',
      accompaniments: 'Ulte Tawe Ka Paratha, Warqi Paratha, Roghani Naan, Burani Raita, Sirka Pyaz, Pomegranate Raita',
      sections: [
        {
          label: 'Vegetarian Curations',
          kind: 'VEG',
          dishes: [
            { dish_id: 'd10', name: 'Paneer Lababdar', description: 'Cottage cheese chunks enveloped in a luscious tomato and cashew cream gravy with grated paneer.' },
            { dish_id: 'd11', name: 'Embassy Dal Makhani', description: 'Our signature black lentils slow-simmered for 24 hours with churned butter and dairy cream.' },
            { dish_id: 'd12', name: 'Subz Miloni Handi', description: 'Melange of seasonal winter vegetables tossed with baby spinach and fenugreek leaves in rich gravy.' },
            { dish_id: 'd13', name: 'Kashmiri Dum Aloo', description: 'Scooped baby potatoes simmered in a yogurt and dried ginger gravy flavoured with fennel.' }
          ]
        },
        {
          label: 'Non-Vegetarian Specialties',
          kind: 'NON_VEG',
          dishes: [
            { dish_id: 'd14', name: 'Classic Embassy Butter Chicken', description: 'Tandoor-roasted chicken simmered in an aromatic tomato-butter satin sauce finished with dried fenugreek.' },
            { dish_id: 'd15', name: 'Awadhi Mutton Rogan Josh', description: 'Prime baby lamb cuts slow-braised with Kashmiri chillies, ratan jot, and whole spices.' },
            { dish_id: 'd16', name: 'Murgh Awadhi Korma', description: 'Chicken braised gently in an opulent white gravy of cashew paste, poppy seeds, and rose water.' }
          ]
        }
      ]
    },
    {
      id: 'c3',
      counter_type_id: 'ct3',
      display_name: 'Japanese Teppan & Sushi Bar',
      display_name_print: 'JAPANESE TEPPAN & SUSHI BAR',
      description: 'Master chefs preparing delicate handcrafted sushi rolls, nigiri, and hot robata grill skewers live before guests.',
      accompaniments_label: 'Artisanal Condiments',
      accompaniments: 'Fresh Hon-Wasabi, House Pickled Gari Ginger, Aged Tamari Soy Sauce, Yuzu Ponzu',
      sections: [
        {
          label: 'Plant-Based Rolls',
          kind: 'VEG',
          dishes: [
            { dish_id: 'd17', name: 'Truffled Asparagus & Avocado Uramaki', description: 'Charred asparagus and Hass avocado rolled with toasted sesame and black truffle glaze.' },
            { dish_id: 'd18', name: 'Crispy Tempura Shiitake Roll', description: 'Crisp enoki and shiitake mushrooms with spicy sriracha mayo and micro herbs.' },
            { dish_id: 'd19', name: 'Edamame Sea Salt Pods', description: 'Steamed young soybeans tossed in Maldon smoked sea salt and shichimi togarashi.' }
          ]
        },
        {
          label: 'Seafood & Premium Cuts',
          kind: 'NON_VEG',
          dishes: [
            { dish_id: 'd20', name: 'Salmon Nigiri Selection', description: 'Norwegian Atlantic salmon glazed with sweet nikiri soy over seasoned koshihikari rice.' },
            { dish_id: 'd21', name: 'Prawn Tempura Maki', description: 'Crispy tiger prawn tempura wrapped with cucumber, tobiko, and tare sauce.' },
            { dish_id: 'd22', name: 'Spicy Tuna Tataki Roll', description: 'Yellowfin tuna seared briefly and paired with scallions, sesame oil, and spicy miso.' }
          ]
        }
      ]
    },
    {
      id: 'c4',
      counter_type_id: 'ct4',
      display_name: 'Dum Pukht Biryani Dastarkhwan',
      display_name_print: 'DUM PUKHT BIRYANI DASTARKHWAN',
      description: 'Aged long-grain basmati rice sealed with dough in heavy earthenware handis and cooked slowly on charcoal embers.',
      accompaniments_label: 'Traditional Accompaniments',
      accompaniments: 'Hyderabadi Mirchi Ka Salan, Smoked Mint & Cucumber Raita, Lachha Onions with Green Chillies',
      sections: [
        {
          label: 'Vegetarian Dum Rice',
          kind: 'VEG',
          dishes: [
            { dish_id: 'd23', name: 'Subz Dum Biryani', description: 'Garden vegetables, green peas, and paneer layered with saffron basmati and caramelized brown onions.' }
          ]
        },
        {
          label: 'Non-Vegetarian Dum Rice',
          kind: 'NON_VEG',
          dishes: [
            { dish_id: 'd24', name: 'Gosht Dum Biryani', description: 'Tender baby mutton marinated in brown onion paste, yogurt, and royal spices, cooked in sealed clay handi.' },
            { dish_id: 'd25', name: 'Awadhi Murgh Biryani', description: 'Fragrant chicken biryani infused with kewra essence, green cardamom, and rich saffron.' }
          ]
        }
      ]
    },
    {
      id: 'c5',
      counter_type_id: 'ct5',
      display_name: 'The Grand Dessert Symphony',
      display_name_print: 'THE GRAND DESSERT SYMPHONY',
      description: 'An indulgent grand finale featuring warm heritage Indian confections and artisanal French patisserie delicacies.',
      accompaniments_label: '',
      accompaniments: '',
      sections: [
        {
          label: 'Heritage Indian Mithai',
          kind: 'VEG',
          dishes: [
            { dish_id: 'd26', name: 'Warm Angoori Gulab Jamun', description: 'Mini golden khoya dumplings soaked in wild rose petal and cardamom syrup.' },
            { dish_id: 'd27', name: 'Kesari Rasmalai', description: 'Delicate chenna discs submerged in saffron-scented clotted cream milk with slivered almonds.' },
            { dish_id: 'd28', name: 'Jalebi with Rabri Live Station', description: 'Crisp saffron jalebis fried live in pure desi ghee, served atop chilled lachha rabri.' },
            { dish_id: 'd29', name: 'Moong Dal Halwa', description: 'Slow-roasted yellow lentils simmered in ghee with mawa, saffron, and crushed green cardamoms.' }
          ]
        }
      ]
    }
  ]
};

async function main() {
  const outDir = join(process.cwd(), 'public', 'qa-inspection');
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  // 1. Fetch HTML from API
  const payload = JSON.stringify({ mode: 'classic', returnHtml: true, menu: realisticMenu });

  console.log('Fetching rendered HTML from Next.js server...');
  const html = await new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/generate-pdf',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });

  const htmlPath = join(outDir, 'rendered-menu.html');
  writeFileSync(htmlPath, html, 'utf-8');
  console.log(`Saved HTML: ${htmlPath} (${html.length} chars)`);

  // 2. Open HTML in puppeteer and screenshot every page!
  const executablePath = findChromePath();
  const browser = await puppeteerCore.launch({
    executablePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
  });

  const page = await browser.newPage();
  // 794x1123 is 96 DPI A4 (210mm x 297mm) -> at 2x scaleFactor it is 1588x2246 (crisp 192 DPI print preview)
  await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 2 });
  await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 15000 });

  try {
    await Promise.race([
      page.evaluateHandle('document.fonts.ready'),
      new Promise(r => setTimeout(r, 4000)),
    ]);
  } catch {}

  const pageHandles = await page.$$('.pdf-page');
  console.log(`Rendering screenshots for ${pageHandles.length} pages...`);

  for (let i = 0; i < pageHandles.length; i++) {
    const screenshotPath = join(outDir, `page-${String(i + 1).padStart(2, '0')}.png`);
    await pageHandles[i].screenshot({ path: screenshotPath });
    console.log(`Page ${i + 1} screenshot: ${screenshotPath}`);
  }

  await browser.close();
  console.log('Inspection images successfully generated!');
}

main().catch(console.error);
