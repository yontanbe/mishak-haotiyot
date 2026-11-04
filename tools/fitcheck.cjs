// בודק שכל המילים (195 בעברית, LULA_GUIDE=ar לערבית) נכנסות לכרטיס זיכרון, לכרטיס תמונה ולבלון, בשלושה גדלי מסך.
// הרצה: npm run serve ואז node tools/fitcheck.cjs
const { chromium } = require('playwright');
const BASE = process.env.QA_URL || 'http://localhost:8080/';
(async () => {
  const b = await chromium.launch();
  for (const [w, h] of [[1280, 800], [390, 844], [1024, 768]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.goto(`${BASE}?qa=1`);
    // LULA_GUIDE=ar בודק את המילים בערבית
    await p.evaluate((g) => localStorage.setItem('lula-guide', g), process.env.LULA_GUIDE || 'he');
    await p.goto(`${BASE}?qa=1`); await p.waitForTimeout(500);
    const res = await p.evaluate(async () => {
      const { LETTERS, parseWord } = await import('./js/data.js');
      const { fitAll } = await import('./js/fit.js');
      const { wordHTML } = await import('./js/stages.js');
      const words = LETTERS.flatMap((l) => l.words.map((s) => ({ l, ...parseWord(s) })));
      document.body.innerHTML = `<section class="screen level-screen" style="position:fixed;inset:0"><div class="level-main"><aside class="side-hero"></aside><main class="stage-body" style="overflow:visible">
        <div class="memory">${words.slice(0, 6).map((x) => `<button class="mcard up"><span class="back">?</span><span class="front word">${wordHTML(x.l, x.w)}</span></button>`).join('')}</div></main></div></section>`;
      const out = [];
      const mem = document.querySelector('.memory');
      for (const x of words) {
        mem.innerHTML = `<button class="mcard up"><span class="back">?</span><span class="front word">${wordHTML(x.l, x.w)}</span></button>`.repeat(6);
        const sb = document.querySelector('.stage-body');
        sb.insertAdjacentHTML('beforeend', `<div class="choices tmp"><button class="choice"><div class="pic">${x.e}</div><div class="cap">${x.w}</div></button></div><div class="party tmp"><button class="balloon"><span class="pic">${x.e}</span><span class="cap">${x.w}</span></button></div>`);
        fitAll(document);
        for (const el of document.querySelectorAll('.mcard .front, .choice .cap, .balloon .cap')) {
          const box = el.closest('.mcard, .choice, .balloon');
          if (el.scrollWidth > el.clientWidth + 2 || el.getBoundingClientRect().width > box.getBoundingClientRect().width + 2) out.push(`${x.w} in ${box.className}`);
        }
        const minFs = Math.min(...[...document.querySelectorAll('.mcard .front')].map((e) => parseFloat(getComputedStyle(e).fontSize)));
        if (minFs < 14) out.push(`${x.w} shrunk to ${Math.round(minFs)}px`);
        document.querySelectorAll('.tmp').forEach((e) => e.remove());
      }
      return { n: words.length, out };
    });
    console.log(`${w}x${h}: ${res.n} words, problems: ${res.out.length}`, res.out.slice(0, 10));
    await p.close();
  }
  await b.close();
})();
