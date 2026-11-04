// שפת המדריכה: עברית (ברירת מחדל) או ערבית.
// כל טקסט עברי במשחק עובר דרך טבלה אחת של עברית לערבית (js/ar/strings.js).
// בעברית שום דבר לא משתנה. בערבית: נתונים מתורגמים בטעינה (localizeDeep), טקסטים בקוד עוברים דרך tr,
// והקול נטען מ-audio/ar/ (חוץ מהמילים באנגלית של יוגי, שמשותפות).
import AR from './ar/strings.js';

function readGuide() {
  if (globalThis.LULA_GUIDE) return globalThis.LULA_GUIDE;
  try { return localStorage.getItem('lula-guide') || 'he'; } catch { return 'he'; }
}
export const GUIDE = readGuide();
export const IS_AR = GUIDE === 'ar';

const HEB = /[֐-׿]/;
export const missing = new Set();
export const missingDOM = new Set(); // טקסטים שהגיעו למסך בלי תרגום (לבדיקות)

export function tr(s) {
  if (!IS_AR || typeof s !== 'string' || !HEB.test(s)) return s;
  if (s in AR) return AR[s];
  missing.add(s);
  return s;
}

// תבנית עם משתנים: trf('הַתַּחֲנָה הַבָּאָה: הָאוֹת {0}', ch)
export function trf(pattern, ...args) {
  const p = tr(pattern);
  return p.replace(/\{(\d)\}/g, (_, i) => args[+i] ?? '');
}

// מתרגם בזמן הטעינה כל מחרוזת עברית בתוך אובייקט או מערך (בלי פונקציות ובלי לגעת בדברים אחרים)
export function localizeDeep(root) {
  if (!IS_AR) return root;
  const seen = new Set();
  const walk = (o) => {
    if (!o || typeof o !== 'object' || seen.has(o)) return;
    seen.add(o);
    for (const k of Object.keys(o)) {
      const v = o[k];
      if (typeof v === 'string') { if (HEB.test(v)) o[k] = tr(v); }
      else if (v && typeof v === 'object') walk(v);
    }
  };
  walk(root);
  return root;
}

// מזהה קטע קול: בערבית הכל מתחת ל-ar/, חוץ מקטעי האנגלית (E/...)
export const clipPath = (id) => (IS_AR && !id.startsWith('E/') ? `ar/${id}` : id);

// ---------- רשת ביטחון בדפדפן: מתרגמת כל טקסט עברי שמגיע למסך ----------
// תבניות עם משתנים כתובות בטבלה עם {0}, {1} (למשל 'עוֹד {0} ⭐ לְ{1}').
const PATTERNS = Object.keys(AR).filter((k) => /\{\d\}/.test(k)).map((k) => {
  const esc = k.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\\?\{(\d)\\?\}/g, '(.+?)');
  return { re: new RegExp(`^${esc}$`, 's'), out: AR[k] };
});
function trText(s) {
  const t = s.trim();
  if (!t || !HEB.test(t)) return s;
  let r = AR[t];
  if (r == null) {
    for (const p of PATTERNS) {
      const m = t.match(p.re);
      if (m) { r = p.out.replace(/\{(\d)\}/g, (_, i) => tr(m[+i + 1])); break; }
    }
  }
  if (r == null) { missing.add(t); missingDOM.add(t); return s; }
  return s.replace(t, r);
}
function fixOne(x) {
  if (x.nodeType === 3) {
    const v = trText(x.nodeValue);
    if (v !== x.nodeValue) x.nodeValue = v;
    return;
  }
  for (const a of ['aria-label', 'placeholder', 'title']) {
    const v = x.getAttribute(a);
    if (v && HEB.test(v)) x.setAttribute(a, trText(v));
  }
}
// data-keep: אזור שנשאר כמו שהוא (מסך הבחירה, שמציג את שתי השפות)
function fixNode(n) {
  if (n.nodeType === 3) { if (!n.parentElement?.closest('[data-keep]')) fixOne(n); return; }
  if (n.nodeType !== 1 || n.closest('[data-keep]')) return;
  fixOne(n);
  const w = document.createTreeWalker(n, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT, {
    acceptNode: (x) => (x.nodeType === 1 && x.hasAttribute('data-keep') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  let x;
  while ((x = w.nextNode())) fixOne(x);
}
export function observeDOM(root) {
  if (!IS_AR) return;
  document.documentElement.lang = 'ar';
  fixNode(root);
  new MutationObserver((ms) => {
    for (const m of ms) {
      if (m.type === 'characterData') fixNode(m.target);
      else m.addedNodes.forEach(fixNode);
    }
  }).observe(root, { childList: true, subtree: true, characterData: true });
  globalThis.__i18nMissing = missing;
  globalThis.__i18nMissingDOM = missingDOM;
}
