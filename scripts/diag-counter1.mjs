import { findBestMenuItemImage } from '../lib/pdf/imageMatcher.ts';

const items = [
  { name: 'Assorted Bite Size Sandwich', desc: 'Crustless tea sandwiches layered with English cucumber, herbed cream cheese, and microgreens.', sec: 'Vegetarian Canapés', kind: 'veg', counter: 'ARRIVAL BITES & PHERA WELCOME' },
  { name: 'Cocktail Samosa', desc: 'Crisp pastry triangles stuffed with spiced potatoes, green peas, and roasted cumin.', sec: 'Vegetarian Canapés', kind: 'veg', counter: 'ARRIVAL BITES & PHERA WELCOME' },
  { name: 'Smoked Paneer Tikka Skewers', desc: 'Cottage cheese steeped in mustard oil, yellow chili, and roasted gram flour, char-grilled over embers.', sec: 'Vegetarian Canapés', kind: 'veg', counter: 'ARRIVAL BITES & PHERA WELCOME' },
  { name: 'Malabari Fish Curry Bites', desc: 'River sole simmered in spiced coconut milk and tempered with curry leaves.', sec: 'Non-Vegetarian Canapés', kind: 'non_veg', counter: 'ARRIVAL BITES & PHERA WELCOME' },
  { name: 'Tandoori Pomfret Morsels', desc: 'Silver pomfret marinated in Kashmiri chilies, carom seeds, and hung yogurt, roasted in tandoor.', sec: 'Non-Vegetarian Canapés', kind: 'non_veg', counter: 'ARRIVAL BITES & PHERA WELCOME' }
];

const tracker = new Set();
for (const it of items) {
  const match = findBestMenuItemImage({
    itemName: it.name,
    description: it.desc,
    dietary: it.kind,
    sectionName: it.sec,
    counterName: it.counter
  }, tracker, 35);
  console.log(it.name, '-->', match ? `${match.filename} (Score: ${match.score})` : 'NULL (text-only)');
}
