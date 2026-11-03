// מקטין טקסט שלא נכנס לכרטיס שלו (מילים ארוכות כמו אֲבַטִּיחַ בכרטיס זיכרון).
const SEL = '.mcard .front, .choice .cap, .balloon .cap, .word-card .word, .build .word, .yn .cap, .rv-word, .album-name, .letter-name, .sticker span';

function fitOne(el) {
  el.style.fontSize = '';
  const box = el.closest('.mcard, .choice, .balloon, .word-card, .build, .yn, .album-card, .sticker') || el.parentElement;
  const maxW = Math.min(el.clientWidth || Infinity, box.clientWidth - 8);
  let size = parseFloat(getComputedStyle(el).fontSize);
  let guard = 30;
  while (guard-- > 0 && size > 11 && (el.scrollWidth > maxW + 1 || el.scrollHeight > el.clientHeight + 2)) {
    size *= 0.9;
    el.style.fontSize = `${size}px`;
  }
}

export function fitAll(root = document) {
  root.querySelectorAll(SEL).forEach(fitOne);
}

// מתאים מחדש בכל פעם שהתוכן משתנה או שהמסך משנה גודל
export function autoFit(root) {
  let raf = 0;
  const run = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => fitAll(root)); };
  const mo = new MutationObserver(run);
  mo.observe(root, { childList: true, subtree: true });
  window.addEventListener('resize', run);
  run();
  return () => { mo.disconnect(); window.removeEventListener('resize', run); };
}
