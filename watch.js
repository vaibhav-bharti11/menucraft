const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');

const dir = path.join(__dirname, 'public', 'menu-images', 'counters');
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

let isGenerating = false;
let needsRegen = false;

function generate() {
  if (isGenerating) {
    needsRegen = true;
    return;
  }
  isGenerating = true;
  console.log('Regenerating PDF...');
  
  const c = spawn('node', ['scripts/inspect-pdf-pages.mjs'], { stdio: 'inherit' });
  
  c.on('close', () => {
    isGenerating = false;
    console.log('Done generating PDF! Screenshots updated in public/qa-inspection/');
    if (needsRegen) {
      needsRegen = false;
      generate();
    }
  });
}

let t;
fs.watch(dir, (e, f) => {
  if (f && (f.endsWith('.jpg') || f.endsWith('.png'))) {
    clearTimeout(t);
    t = setTimeout(generate, 1000); // 1s debounce to allow file to finish saving
  }
});

console.log('Watching for images in ' + dir);
