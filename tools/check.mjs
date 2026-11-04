// בדיקה לפני פרסום: שכל קובצי השמע והתמונות שהמשחק צריך קיימים, בעברית ובערבית.
// הרצה: npm run check
import { existsSync, readFileSync } from 'node:fs';
import { LETTERS, REGIONS } from '../js/data.js';
import { AR_LETTERS } from '../js/ar/letters.js';
import { POSES } from '../js/hero.js';

for (const [name, file] of [['he', 'audio/clips.json'], ['ar', 'audio/ar/clips.json']]) {
  const list = JSON.parse(readFileSync(file, 'utf8'));
  const missing = list.filter((c) => !existsSync(`audio/${c.id}.mp3`)).map((c) => c.id);
  console.log(`audio ${name}: ${list.length - missing.length}/${list.length} clips`);
  if (missing.length) console.log('  missing (browser voice is used instead):', missing.slice(0, 40).join(', '), missing.length > 40 ? `... +${missing.length - 40}` : '');
}
const images = [
  ...POSES.map((p) => `img/lula/${p}.webp`),
  ...LETTERS.map((l) => `img/friends/${l.id}.webp`),
  ...AR_LETTERS.map((l) => `img/friends/${l.img}.webp`),
  ...REGIONS.map((r) => `img/regions/${r.id}.webp`),
  'img/regions/home.webp',
];
const missingImg = [...new Set(images)].filter((f) => !existsSync(f));
console.log(`images: ${new Set(images).size - missingImg.length}/${new Set(images).size}`);
if (missingImg.length) console.log('  missing (emoji is shown instead):', missingImg.join(', '));
