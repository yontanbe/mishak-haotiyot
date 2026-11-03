// בדיקה לפני פרסום: שכל קובצי השמע והתמונות שהמשחק צריך קיימים.
// הרצה: npm run check
import { existsSync } from 'node:fs';
import { buildClips } from '../js/clips.js';
import { LETTERS, REGIONS } from '../js/data.js';
import { POSES } from '../js/hero.js';

const missingAudio = buildClips().filter((c) => !existsSync(`audio/${c.id}.mp3`)).map((c) => c.id);
const images = [
  ...POSES.map((p) => `img/lula/${p}.webp`),
  ...LETTERS.map((l) => `img/friends/${l.id}.webp`),
  ...REGIONS.map((r) => `img/regions/${r.id}.webp`),
  'img/regions/home.webp',
];
const missingImg = images.filter((f) => !existsSync(f));
console.log(`audio: ${buildClips().length - missingAudio.length}/${buildClips().length} clips`);
if (missingAudio.length) console.log('  missing (browser voice is used instead):', missingAudio.join(', '));
console.log(`images: ${images.length - missingImg.length}/${images.length}`);
if (missingImg.length) { console.log('  missing:', missingImg.join(', ')); process.exit(1); }
