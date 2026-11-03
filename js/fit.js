// מקטין טקסט שלא נכנס לכרטיס שלו (מילים ארוכות כמו אֲבַטִּיחַ בכרטיס זיכרון).
const SEL = '.mcard .front, .choice .cap, .balloon .cap, .word-card .word, .build .word, .yn .cap, .rv-word, .album-name, .letter-name, .sticker span';

// רוחב הטקסט עצמו (ולא של האלמנט, שתמיד ממלא את הכרטיס)
function textWidth(el) {
  const m = document.createElement('div');
  m.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;display:inline-block;width:auto;font:inherit;letter-spacing:inherit;pointer-events:none';
  m.innerHTML = el.innerHTML;
  el.appendChild(m);
  const w = m.getBoundingClientRect().width;
  m.remove();
  return w;
}

function fitOne(el) {
  el.style.fontSize = '';
  const box = el.closest('.mcard, .choice, .balloon, .word-card, .build, .yn, .album-card, .sticker') || el.parentElement;
  const cs = getComputedStyle(el);
  const own = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const avail = Math.min(own > 0 ? own : Infinity, box.clientWidth - 12);
  let size = parseFloat(cs.fontSize);
  let guard = 30;
  while (guard-- > 0 && size > 12 && textWidth(el) > avail) {
    size *= 0.92;
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
