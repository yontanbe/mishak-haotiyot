// שמע: קטעי Gemini TTS מוקלטים מראש (audio/**/*.mp3), גיבוי לדיבור של הדפדפן,
// ואפקטים קוליים שנוצרים ב-WebAudio (בלי קבצים).
import { buildClips } from './clips.js';
import { QA } from './qa.js';

const TEXT = Object.fromEntries(buildClips().map((c) => [c.id, c.text]));
let current = null;
let finishCurrent = null; // משחרר את מי שמחכה לקטע שנקטע באמצע
let token = 0;
export const settings = { muted: false };

function speakFallback(text) {
  return new Promise((res) => {
    try {
      if (!('speechSynthesis' in window) || !text) return res();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'he-IL';
      u.rate = 0.85;
      u.onend = res; u.onerror = res;
      setTimeout(res, QA ? 50 : 1500 + text.length * 120); // יש דפדפנים שלא מודיעים על סוף הדיבור
      speechSynthesis.speak(u);
    } catch { res(); }
  });
}

function playOne(id, my) {
  return new Promise((res) => {
    if (settings.muted || my !== token) return res();
    const a = new Audio(`audio/${id}.mp3`);
    if (QA) { a.playbackRate = 12; a.muted = true; }
    current = a;
    let done = false;
    const finish = () => { if (!done) { done = true; if (finishCurrent === finish) finishCurrent = null; res(); } };
    finishCurrent = finish;
    a.onended = finish;
    a.onerror = () => { if (my === token) speakFallback(TEXT[id]).then(finish); else finish(); };
    a.play().catch(() => speakFallback(TEXT[id]).then(finish));
  });
}

// משמיע רצף של קטעים. קריאה חדשה מפסיקה את הקודמת.
export async function say(...ids) {
  stop();
  const my = ++token;
  for (const id of ids.flat()) {
    if (my !== token) return;
    await playOne(id, my);
  }
}

export function stop() {
  token++;
  if (current) { try { current.pause(); } catch {} current = null; }
  if (finishCurrent) { const f = finishCurrent; finishCurrent = null; f(); }
  try { speechSynthesis.cancel(); } catch {}
}

export const textOf = (id) => TEXT[id] || '';

// ---------- אפקטים ----------
let ctx;
const ac = () => (ctx ||= new (window.AudioContext || window.webkitAudioContext)());

function tone(freq, dur, type = 'sine', vol = 0.15, delay = 0, slide = 0) {
  if (settings.muted) return;
  try {
    const c = ac();
    const o = c.createOscillator();
    const g = c.createGain();
    const t = c.currentTime + delay;
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t); o.stop(t + dur + 0.05);
  } catch {}
}

export const sfx = {
  pop: () => tone(520, 0.12, 'triangle', 0.2, 0, 2.2),
  ding: () => { tone(880, 0.25, 'sine', 0.18); tone(1320, 0.35, 'sine', 0.12, 0.08); },
  boop: () => tone(220, 0.25, 'sine', 0.15, 0, 0.7),
  step: () => tone(300 + Math.random() * 60, 0.06, 'triangle', 0.06),
  whoosh: () => tone(200, 0.4, 'sawtooth', 0.04, 0, 4),
  flip: () => tone(660, 0.08, 'square', 0.05),
  tada: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.4, 'triangle', 0.16, i * 0.11)),
};

export function unlockAudio() {
  try { ac().resume(); } catch {}
}
