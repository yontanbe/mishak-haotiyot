// לולה הגדולה: תמונות תלת ממד של Gemini בשש תנוחות (img/lula/<pose>.webp),
// עם אנימציית נשימה, הליכה, קפיצה ודיבור. אם התמונות חסרות, מוצגת דמות ה-SVG.
import { lulaSVG } from './lula.js';

export const POSES = ['wave', 'walk', 'jump', 'talk', 'think', 'oops'];

export function heroHTML(pose = 'wave', cls = '') {
  return `
  <div class="hero ${cls}" data-pose="${pose}">
    <div class="hero-shadow"></div>
    <div class="hero-body">
      ${POSES.map((p) => `<img class="pose p-${p}" src="img/lula/${p}.webp" alt="" draggable="false" onerror="this.closest('.hero').classList.add('noimg')">`).join('')}
      <div class="hero-svg">${lulaSVG('idle')}</div>
    </div>
  </div>`;
}

// שינוי תנוחה. אם יש משך, חוזרים אחריו לתנוחה הקודמת.
export function pose(el, p, ms = 0) {
  if (!el) return;
  const prev = el.dataset.base || el.dataset.pose;
  el.dataset.pose = p;
  const svg = el.querySelector('.lula');
  if (svg) {
    svg.classList.remove('walking', 'happy', 'oops', 'dance', 'jumping');
    const map = { walk: 'walking', jump: 'jumping', oops: 'oops' };
    if (map[p]) svg.classList.add(map[p]);
  }
  el.classList.remove('anim-jump', 'anim-oops'); void el.offsetWidth;
  if (p === 'jump') el.classList.add('anim-jump');
  if (p === 'oops') el.classList.add('anim-oops');
  clearTimeout(el._t);
  if (ms) el._t = setTimeout(() => pose(el, prev), ms);
}

export function setBase(el, p) {
  if (!el) return;
  el.dataset.base = p;
  pose(el, p);
}

// friend picture: תמונת החבר (img/friends/<id>.webp) או אימוג'י אם אין תמונה
export function friendHTML(l, cls = '') {
  return `<span class="fpic ${cls}"><img src="img/friends/${l.id}.webp" alt="" draggable="false" onerror="this.parentNode.classList.add('noimg')"><span class="emo">${l.friend.e}</span></span>`;
}
