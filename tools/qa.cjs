// בוט QA: משחק את כל המסע מההתחלה ועד הסוף (27 אותיות ו-14 תחנות חזרה) ובודק כל מסך.
// הרצה: npm run serve בחלון אחד, ואז: node tools/qa.cjs [desktop|phone] [מספר-תחנות]
// צריך Playwright (npm i -D playwright && npx playwright install chromium).
// הדוח נכתב ל-qa-report.json ותמונות של בעיות לתיקייה qa-shots.
const { chromium } = require('playwright');
const fs = require('fs');

const MODE = process.argv[2] || 'desktop';
const LIMIT = +(process.argv[3] || 999);
const VIEW = MODE === 'phone' ? { width: 390, height: 844 } : { width: 1280, height: 800 };
const BASE = process.env.QA_URL || 'http://localhost:8080/';
const SHOTS = 'qa-shots';
fs.mkdirSync(SHOTS, { recursive: true });

const issues = [];
const note = (where, kind, detail) => { issues.push({ where, kind, detail }); console.log(`  ! ${where} ${kind}: ${detail}`); };

// בדיקות על המסך הנוכחי: טקסט שגולש, חפיפות בין כפתורים, דברים מחוץ למסך
async function inspect(page, where) {
  const res = await page.evaluate(() => {
    const out = [];
    const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 2 && r.height > 2 && s.visibility !== 'hidden' && s.display !== 'none' && s.opacity !== '0'; };
    // 1. טקסט שלא נכנס
    document.querySelectorAll('.mcard.up .front, .choice .cap, .balloon .cap, .word-card .word, .build .word, .yn .cap, .rv-word, .speech, .tile, .syl, .letter-name').forEach((el) => {
      if (!vis(el)) return;
      if (el.scrollWidth > el.clientWidth + 2) out.push(['overflow', `${el.className}: "${el.textContent.trim().slice(0, 30)}" ${el.scrollWidth}>${el.clientWidth}`]);
    });
    // 2. חפיפה בין אלמנטים שנוגעים בהם (חוץ מבועות שזזות)
    const targets = [...document.querySelectorAll('.choice, .tile, .hide-spot, .mcard, .balloon, .syl, .btn.go, .yn .btn, .node')].filter(vis);
    for (let i = 0; i < targets.length; i++) for (let j = i + 1; j < targets.length; j++) {
      const a = targets[i].getBoundingClientRect(); const b = targets[j].getBoundingClientRect();
      const w = Math.min(a.right, b.right) - Math.max(a.left, b.left); const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (w > 6 && h > 6) out.push(['overlap', `${targets[i].className} / ${targets[j].className} (${Math.round(w)}x${Math.round(h)})`]);
    }
    // 3. כפתורים מחוץ למסך
    const W = innerWidth; const H = innerHeight;
    document.querySelectorAll('.choice, .tile, .hide-spot, .mcard, .balloon, .btn.go, .yn .btn, .giant-letter, canvas.trace').forEach((el) => {
      if (!vis(el) || el.closest('.map-screen')) return;
      const r = el.getBoundingClientRect();
      if (r.left < -4 || r.top < -4 || r.right > W + 4 || r.bottom > H + 4) out.push(['offscreen', `${el.className} [${Math.round(r.left)},${Math.round(r.top)},${Math.round(r.right)},${Math.round(r.bottom)}]`]);
    });
    // 4. בועת הדיבור חותכת או נחתכת
    document.querySelectorAll('.bubble-anchor .speech').forEach((el) => {
      if (getComputedStyle(el.closest('.bubble-anchor')).opacity === '0') return; // מוסתרת בכוונה בזמן הליכה
      const r = el.getBoundingClientRect();
      if (r.left < -4 || r.right > W + 4 || r.top < -4) out.push(['bubble-cut', `"${el.textContent.trim().slice(0, 30)}"`]);
    });
    return out;
  });
  const seen = new Set();
  for (const [k, d] of res) { const key = k + d; if (!seen.has(key)) { seen.add(key); note(where, k, d); } }
  if (res.length) await page.screenshot({ path: `${SHOTS}/${MODE}-${where.replace(/[^\w-]/g, '_')}.png` }).catch(() => {});
}

const click = (page, sel) => page.evaluate((s) => { const el = document.querySelector(s); if (el && !el.disabled) { el.click(); return true; } return false; }, sel);
const stage = (page) => page.evaluate(() => document.querySelector('.level-screen')?.dataset.stage || null);

// משחק שלב אחד עד שהוא מסתיים
async function playStage(page, key, where) {
  const t0 = Date.now();
  const target = await page.evaluate(() => document.querySelector('.letter-chip')?.textContent.trim());
  let inspected = false;
  while (Date.now() - t0 < 90000) {
    if ((await stage(page)) !== key) return true;
    if (!inspected) { await page.waitForTimeout(400); await inspect(page, where); inspected = true; }
    if (await page.$('.foot .btn.go')) { await click(page, '.foot .btn.go'); await page.waitForTimeout(250); continue; }
    if (key === 'letter') { await click(page, '.giant-letter'); }
    else if (key === 'trace') {
      const box = await (await page.$('canvas.trace'))?.boundingBox();
      if (box) {
        for (let y = box.y + 10; y < box.y + box.height; y += 18) {
          await page.mouse.move(box.x + 5, y); await page.mouse.down();
          await page.mouse.move(box.x + box.width - 5, y, { steps: 8 }); await page.mouse.up();
        }
      }
    } else if (key === 'bubbles') {
      await page.evaluate((t) => { for (const b of document.querySelectorAll('.bubble:not(.popped)')) { const r = b.getBoundingClientRect(); if (b.textContent === t && r.top > 60 && r.bottom < innerHeight) { b.click(); break; } } }, target);
    } else if (key === 'hidden') {
      await page.evaluate((t) => { for (const b of document.querySelectorAll('.hide-spot:not(.found)')) { if (b.querySelector('.hidden-letter').textContent === t) { b.click(); break; } } }, target);
    } else if (key === 'memory' || key === 'rvMatch') {
      await page.evaluate(async () => {
        const cards = [...document.querySelectorAll('.mcard:not(.match)')];
        if (!cards.length) return;
        const k = cards[0].dataset.k; const pair = cards.filter((c) => c.dataset.k === k);
        pair[0]?.click(); await new Promise((r) => setTimeout(r, 120)); pair[1]?.click();
      });
      await page.waitForTimeout(1400);
    } else if (key === 'party') {
      await click(page, '.balloon:not(.done)');
    } else {
      // בחירה: choice, tile, כן/לא
      if (!(await click(page, '[data-ok="1"]:not(.right)'))) { /* מחכים לקול או לאנימציה */ }
    }
    await page.waitForTimeout(350);
  }
  note(where, 'stuck', `stage ${key} did not finish in 90s`);
  await page.screenshot({ path: `${SHOTS}/${MODE}-stuck-${where.replace(/[^\w-]/g, '_')}.png` });
  return false;
}

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: VIEW });
  page.on('pageerror', (e) => note('page', 'js-error', e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) note('page', 'console', m.text()); });
  page.on('response', (r) => { if (r.status() >= 400 && !/fonts\.g/.test(r.url())) note('net', String(r.status()), r.url().replace(BASE, '')); });
  await page.goto(`${BASE}?qa=1`);
  await page.evaluate(() => localStorage.setItem('alefbet-quest-v1', JSON.stringify({ v: 2, done: {}, stats: {}, seenStory: true })));
  await page.goto(`${BASE}?qa=1`);
  await page.waitForTimeout(800);
  await inspect(page, 'home');

  let stations = 0;
  while (stations < LIMIT) {
    // מהבית: ממשיכים במסע
    if (await page.$('.home-screen')) await click(page, '.play');
    else if (await page.$('.map-screen')) await click(page, '.node.current') || (await click(page, '.home'));
    await page.waitForTimeout(600);
    if (await page.$('.travel-screen')) { await page.waitForTimeout(800); await inspect(page, `travel-${stations}`); await click(page, '.travel-screen .skip'); }
    await page.waitForSelector('.level-screen', { timeout: 15000 }).catch(() => {});
    if (!(await page.$('.level-screen'))) break;
    const chip = await page.evaluate(() => document.querySelector('.letter-chip').textContent.trim());
    const isReview = await page.evaluate(() => !!document.querySelector('.level-screen.is-review'));
    const name = isReview ? `review${stations}` : `letter-${chip}`;
    console.log(`▶ ${name}`);
    const t = Date.now();
    let guard = 40;
    while (guard-- > 0 && (await page.$('.level-screen'))) {
      const key = await stage(page);
      if (!key) break;
      const okStage = await playStage(page, key, `${name}/${key}`);
      if (!okStage) { await click(page, '.level-head .home'); break; }
    }
    console.log(`  ${name} done in ${Math.round((Date.now() - t) / 1000)}s`);
    stations++;
    await page.waitForTimeout(1200);
    if (await page.$('.map-screen')) { await inspect(page, `map-after-${name}`); }
    const left = await page.evaluate(() => document.querySelector('.node.current') ? 1 : 0);
    if (!left) break;
  }

  // דוח הורים ואלבום
  await click(page, '.home'); await page.waitForTimeout(600);
  await inspect(page, 'home-end');
  await click(page, '.album'); await page.waitForTimeout(800); await inspect(page, 'album');
  const prog = await page.evaluate(() => JSON.parse(localStorage.getItem('alefbet-quest-v1')));
  fs.writeFileSync('qa-report.json', JSON.stringify({ mode: MODE, stations, letters: Object.keys(prog.done).length, reviews: Object.keys(prog.reviews || {}).length, issues }, null, 1));
  console.log(`\nstations ${stations}, letters done ${Object.keys(prog.done).length}, reviews ${Object.keys(prog.reviews || {}).length}, issues ${issues.length}`);
  await browser.close();
})();
