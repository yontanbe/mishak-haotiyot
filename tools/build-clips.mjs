// בונה את audio/clips.json: כל קטעי השמע (טקסט מנוקד + קול) שמחולל השמע של Gemini יוצר.
// הרצה: npm run clips
import { writeFileSync, mkdirSync } from 'node:fs';
import { buildClips } from '../js/clips.js';

const clips = buildClips();
mkdirSync('audio', { recursive: true });
writeFileSync('audio/clips.json', JSON.stringify(clips, null, 1));
console.log(`${clips.length} clips`);
