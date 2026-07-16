// scripts/seed-supabase.mjs
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data', 'seed');

const SUPABASE_URL = process.env.SUPABASE_URL?.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Error: Please define SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
  process.exit(1);
}

async function uploadChunk(table, records) {
  const url = `${SUPABASE_URL}/rest/v1/${table}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify(records)
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Upload failed for ${table}: ${res.statusText} (${res.status}) - ${errText}`);
  }
}

async function seedTable(filename, table) {
  const filepath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filepath)) {
    console.log(`Skipping ${table}: ${filename} not found.`);
    return;
  }
  const records = JSON.parse(fs.readFileSync(filepath, 'utf8'));
  console.log(`Seeding ${records.length} records into table: ${table}...`);
  
  const CHUNK_SIZE = 100;
  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const chunk = records.slice(i, i + CHUNK_SIZE);
    await uploadChunk(table, chunk);
    console.log(`  Uploaded records ${i + 1} to ${Math.min(i + CHUNK_SIZE, records.length)}`);
  }
}

async function run() {
  try {
    await seedTable('counter_types.json', 'counter_types');
    await seedTable('dishes.json', 'dishes');
    await seedTable('menus.json', 'menus');
    console.log('Seeding completed successfully!');
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

run();
