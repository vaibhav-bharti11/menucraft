import { readFileSync } from 'fs';

const html = readFileSync('public/qa-inspection/test-item-menu.html', 'utf-8');
const lines = html.split('\n');
let print = false;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('CURATION 01 OF 05')) print = true;
  if (line.includes('CURATION 02 OF 05')) print = false;
  if (print) {
    if (line.includes('data:image')) {
      console.log('    [IMAGE BASE64 DATA]');
    } else {
      console.log(line);
    }
  }
}
