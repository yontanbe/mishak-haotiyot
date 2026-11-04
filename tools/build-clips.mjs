// בונה את רשימות קטעי השמע (טקסט + קול) שמחולל השמע של Gemini יוצר.
// audio/clips.json לעברית, ו-audio/ar/clips.json לערבית (LULA_GUIDE=ar).
// הרצה: npm run clips
import { writeFileSync, mkdirSync } from 'node:fs';

const guide = process.env.LULA_GUIDE || 'he';
globalThis.LULA_GUIDE = guide;
const { buildClips } = await import('../js/clips.js');

let clips = buildClips();
let file = 'audio/clips.json';
if (guide === 'ar') {
  clips = clips.map((c) => ({ ...c, id: `ar/${c.id}` }));
  file = 'audio/ar/clips.json';
}
mkdirSync(file.replace(/\/[^/]+$/, ''), { recursive: true });
writeFileSync(file, JSON.stringify(clips, null, 1));
console.log(`${guide}: ${clips.length} clips`);
