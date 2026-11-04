// שמירת התקדמות, ציון לילד ונתונים לדוח ההורים.
// הכל נשמר בדפדפן (localStorage). אפשר להעביר בין מכשירים עם קוד גיבוי.
import { LETTERS } from './data.js';
import { IS_AR } from './i18n.js';

// לכל שפת מדריכה התקדמות נפרדת (ילד שמשחק בערבית וילד שמשחק בעברית הם שני ילדים)
export const PROGRESS_KEYS = { he: 'alefbet-quest-v1', ar: 'lula-quest-ar-v1' };
const KEY = IS_AR ? PROGRESS_KEYS.ar : PROGRESS_KEYS.he;
const MAX_STARS = LETTERS.length * 3;

const blank = () => ({ v: 2, done: {}, stats: {}, created: Date.now() });

function migrate(p) {
  if (!p || typeof p !== 'object') return blank();
  p.done ||= {};
  p.stats ||= {};
  p.v = 2;
  return p;
}

export function loadProgress() {
  try { return migrate(JSON.parse(localStorage.getItem(KEY))); } catch { return blank(); }
}
export function saveProgress(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch {}
}
export const resetProgress = () => blank();

// ---------- רישום תוך כדי משחק ----------
const statOf = (p, id) => (p.stats[id] ||= { plays: 0, right: 0, wrong: 0, secs: 0, best: 0, last: 0, wrongBy: {} });

export function startLetter(p, id) {
  const s = statOf(p, id);
  s.plays++;
  s.last = Date.now();
  p.lastPlayed = Date.now();
  return Date.now();
}
export function recordRight(p, id) { statOf(p, id).right++; }
export function recordWrong(p, id, stage) {
  const s = statOf(p, id);
  s.wrong++;
  s.wrongBy[stage] = (s.wrongBy[stage] || 0) + 1;
}
export function recordTime(p, id, since) {
  const secs = Math.round((Date.now() - since) / 1000);
  if (secs > 0 && secs < 3 * 3600) statOf(p, id).secs += secs;
}
export function completeLetter(p, id, stars) {
  p.done[id] = Math.max(p.done[id] || 0, stars);
  const s = statOf(p, id);
  s.best = Math.max(s.best, stars);
  s.completedAt ||= Date.now();
}

// ---------- ציון ----------
export const totalStars = (p) => Object.values(p.done).reduce((a, b) => a + b, 0);
export const lettersDone = (p) => Object.keys(p.done).length;
export const maxStars = MAX_STARS;

export function accuracy(s) {
  if (!s) return null;
  const n = s.right + s.wrong;
  return n ? Math.round((s.right / n) * 100) : null;
}

export function overall(p) {
  let right = 0, wrong = 0, secs = 0;
  for (const s of Object.values(p.stats)) { right += s.right; wrong += s.wrong; secs += s.secs; }
  return {
    letters: lettersDone(p),
    stars: totalStars(p),
    accuracy: right + wrong ? Math.round((right / (right + wrong)) * 100) : null,
    minutes: Math.round(secs / 60),
    percent: Math.round((lettersDone(p) / LETTERS.length) * 100),
  };
}

// דרגות לילד, בלשון רבים כמו כל הפנייה במשחק
export const RANKS = [
  { min: 0, icon: '🌱', name: 'מַתְחִילִים אֶת הַמַּסָּע' },
  { min: 6, icon: '🔎', name: 'בַּלָּשֵׁי אוֹתִיּוֹת' },
  { min: 21, icon: '🧭', name: 'מְגַלֵּי אוֹתִיּוֹת' },
  { min: 42, icon: '🦸', name: 'גִּבּוֹרֵי הָאוֹתִיּוֹת' },
  { min: 63, icon: '🏆', name: 'אַלּוּפֵי הָאוֹתִיּוֹת' },
  { min: MAX_STARS, icon: '🌟', name: 'כּוֹכְבֵי הָאוֹתִיּוֹת' },
];
export function rankOf(stars) {
  let r = RANKS[0];
  for (const x of RANKS) if (stars >= x.min) r = x;
  const next = RANKS.find((x) => x.min > stars);
  return { ...r, next, toNext: next ? next.min - stars : 0 };
}

// אותיות שכדאי לתרגל: מעט כוכבים או דיוק נמוך
export function needsPractice(p) {
  return LETTERS.filter((l) => {
    const s = p.stats[l.id];
    if (!p.done[l.id]) return false;
    const acc = accuracy(s);
    return p.done[l.id] < 3 || (acc != null && acc < 75);
  });
}

// סוגי משחקים שבהם הכי הרבה טעויות
export function weakStages(p) {
  const sum = {};
  for (const s of Object.values(p.stats)) for (const [k, v] of Object.entries(s.wrongBy || {})) sum[k] = (sum[k] || 0) + v;
  return Object.entries(sum).sort((a, b) => b[1] - a[1]);
}

// ---------- גיבוי והעברה בין מכשירים ----------
export function exportCode(p) {
  const json = JSON.stringify(p);
  return 'AB1.' + btoa(unescape(encodeURIComponent(json)));
}
export function importCode(code) {
  const c = String(code || '').trim();
  if (!c.startsWith('AB1.')) throw new Error('bad code');
  const p = JSON.parse(decodeURIComponent(escape(atob(c.slice(4)))));
  if (!p || typeof p.done !== 'object') throw new Error('bad data');
  return migrate(p);
}
