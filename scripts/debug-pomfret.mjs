import { scoreMenuItemMatch } from '../lib/pdf/imageMatcher.ts';
import { IMAGE_REGISTRY } from '../lib/pdf/imageRegistry.ts';

const item = {
  itemName: 'Tandoori Pomfret Morsels',
  description: 'Silver pomfret marinated in Kashmiri chilies, carom seeds, and hung yogurt, roasted in tandoor.',
  dietary: 'non_veg',
  sectionName: 'Non-Vegetarian Canapés',
  counterName: 'ARRIVAL BITES & PHERA WELCOME'
};

console.log('Scores for', item.itemName);
for (const entry of IMAGE_REGISTRY) {
  const debug = { reasons: [] };
  const score = scoreMenuItemMatch(entry, item, debug);
  console.log(`- ${entry.filename} (${entry.name}): Score = ${score}`);
  for (const r of debug.reasons) {
    console.log(`    * ${r}`);
  }
}
