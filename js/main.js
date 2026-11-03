import { LETTERS, REGIONS, UI, letterLines } from './data.js';
import { STAGES } from './stages.js';
import { say, stop, sfx, settings, textOf, unlockAudio } from './audio.js';
import { heroHTML, pose, setBase, friendHTML } from './hero.js';
import * as P from './progress.js';

const app = document.getElementById('app');
const DEV = new URLSearchParams(location.search).has('dev');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- התקדמות (נשמרת בדפדפן) ----------
let prog = P.loadProgress();
const save = () => P.saveProgress(prog);
const firstUndone = () => { const i = LETTERS.findIndex((l) => !prog.done[l.id]); return i === -1 ? LETTERS.length - 1 : i; };
const unlockedIndex = () => (DEV || prog.all ? LETTERS.length - 1 : firstUndone());
const doneCount = () => Object.keys(prog.done).length;

// ---------- לולה מדברת ----------
// כשלולה מדברת: תנוחת דיבור, הגוף מקפץ בקצב, ובועת דיבור גדולה ליד הראש.
async function talk(hero, bubble, ids, text) {
  if (bubble && text != null) showBubble(bubble, text);
  hero?.classList.add('speaking');
  if (hero && !['jump', 'walk', 'oops'].includes(hero.dataset.pose)) pose(hero, 'talk');
  await say(ids);
  hero?.classList.remove('speaking');
  if (hero && hero.dataset.pose === 'talk') pose(hero, hero.dataset.base || 'wave');
}
function showBubble(bubble, html) {
  if (bubble) bubble.innerHTML = html ? `<div class="speech">${html}</div>` : '';
}

// ---------- קונפטי ----------
function confetti(n = 60) {
  const box = document.createElement('div');
  box.className = 'confetti';
  for (let i = 0; i < n; i++) {
    const s = document.createElement('i');
    s.style.cssText = `--x:${Math.random() * 100}vw;--h:${Math.floor(Math.random() * 360)};--d:${1.4 + Math.random() * 1.4}s;--r:${Math.random() * 720}deg;--delay:${Math.random() * 0.3}s`;
    box.append(s);
  }
  document.body.append(box);
  setTimeout(() => box.remove(), 3500);
}

const regionBG = (id, sky = ['#bfe9ff', '#fff6e0']) => `background-image:url(img/regions/${id}.webp), linear-gradient(180deg, ${sky[0]}, ${sky[1]})`;
const regionOf = (l) => REGIONS.find((r) => r.id === l.region);

// ---------- מסך הבית ----------
function home() {
  stop();
  const next = LETTERS[firstUndone()];
  const started = doneCount() > 0;
  app.innerHTML = `
  <section class="screen home-screen" style="${regionBG('home')}">
    <div class="home-logo">
      <h1><span>מִשְׂחַק</span> <span>הָאוֹתִיּוֹת</span> <span class="ab">א-ב</span></h1>
      <p>מַסָּע קָסוּם עִם לוּלָה הַמְּגַלָּה</p>
    </div>
    ${scorePanel()}
    <div class="home-stage">
      <div class="home-hero">${heroHTML('wave', 'xl tappable')}</div>
      <nav class="home-menu">
        <div class="bubble-anchor home-bubble"></div>
        <button class="mega play">
          <span class="mega-ico">▶</span>
          <span class="mega-txt">${started ? 'מַמְשִׁיכִים בַּמַּסָּע' : 'יוֹצְאִים לַמַּסָּע'}<small>${started ? `הַתַּחֲנָה הַבָּאָה: הָאוֹת ${next.ch}` : 'לוּלָה מְחַכָּה לָכֶם'}</small></span>
        </button>
        <div class="home-row">
          <button class="mega small map"><span class="mega-ico">🗺️</span><span class="mega-txt">הַמַּפָּה</span></button>
          <button class="mega small album"><span class="mega-ico">🎒</span><span class="mega-txt">הַחֲבֵרִים<small>${doneCount()}/27</small></span></button>
        </div>
      </nav>
    </div>
    <button class="btn round gear" aria-label="הורים">⚙️</button>
  </section>`;
  const hero = app.querySelector('.hero');
  const bubble = app.querySelector('.bubble-anchor');
  setBase(hero, 'wave');
  showBubble(bubble, UI.homeHello);
  // הדפדפן מאפשר קול רק אחרי נגיעה, אז לולה מברכת בנגיעה הראשונה
  let greeted = false;
  const greet = () => { if (greeted) return; greeted = true; unlockAudio(); talk(hero, bubble, ['ui/homeHello'], UI.homeHello); };
  setTimeout(() => { if (navigator.userActivation?.hasBeenActive) greet(); }, 500);
  let tapN = 0;
  hero.onclick = () => {
    unlockAudio(); sfx.pop(); pose(hero, 'jump', 1100);
    if (!greeted) return greet();
    const k = `tapLula${1 + (tapN++ % 3)}`;
    talk(hero, bubble, [`ui/${k}`], UI[k]);
  };
  app.querySelector('.play').onclick = () => {
    unlockAudio(); sfx.pop();
    if (!prog.seenStory) storyIntro(); else travelTo(LETTERS[firstUndone()]);
  };
  app.querySelector('.map').onclick = () => { unlockAudio(); sfx.pop(); map(); };
  app.querySelector('.album').onclick = () => { unlockAudio(); sfx.pop(); album(); };
  app.querySelector('.gear').onclick = parents;
}

// ---------- סיפור הפתיחה ----------
async function storyIntro() {
  app.innerHTML = `
  <section class="screen story-screen" style="${regionBG('forest')}">
    <div class="story-stage">
      <div class="story-hero">${heroHTML('wave', 'xl')}<div class="bubble-anchor"></div></div>
      <div class="flying">${'אבגדהוזחטיכלמנסעפצקרשת'.split('').map((c, i) => `<span style="--i:${i};--a:${(i * 47) % 360}deg">${c}</span>`).join('')}</div>
    </div>
    <button class="btn small skip">דַּלְּגוּ ⏭</button>
  </section>`;
  const scr = app.querySelector('.story-screen');
  const hero = app.querySelector('.hero');
  const bubble = app.querySelector('.bubble-anchor');
  let skipped = false;
  app.querySelector('.skip').onclick = () => { skipped = true; stop(); prog.seenStory = true; save(); travelTo(LETTERS[firstUndone()]); };
  const slides = [['story1', 'wave'], ['story2', 'think'], ['story3', 'oops'], ['story4', 'jump']];
  for (const [k, p] of slides) {
    if (skipped) return;
    scr.dataset.slide = k;
    setBase(hero, p);
    if (k === 'story3') sfx.whoosh();
    await talk(hero, bubble, [`ui/${k}`], UI[k]);
    await wait(400);
  }
  if (!skipped) { prog.seenStory = true; save(); travelTo(LETTERS[firstUndone()]); }
}

// ---------- קטע מעבר: לולה הולכת לתחנה הבאה ----------
async function travelTo(l) {
  stop();
  const r = regionOf(l);
  const idx = LETTERS.indexOf(l);
  const prev = LETTERS[idx - 1];
  const newRegion = !prev || prev.region !== l.region;
  const deco = [...r.deco, ...r.deco, ...r.deco];
  app.innerHTML = `
  <section class="screen travel-screen">
    <div class="pan" style="${regionBG(r.id, r.sky)}"></div>
    <div class="parallax far">${deco.map((d, k) => `<span style="--k:${k}">${d}</span>`).join('')}</div>
    <div class="travel-hero">${heroHTML('walk', 'xl')}<div class="bubble-anchor"></div></div>
    <div class="parallax near">${deco.map((d, k) => `<span style="--k:${k}">${d}</span>`).join('')}</div>
    <div class="travel-sign"><span>${r.name}</span><b>${l.ch}</b></div>
    <button class="btn small skip">⏭</button>
  </section>`;
  const hero = app.querySelector('.hero');
  const bubble = app.querySelector('.bubble-anchor');
  setBase(hero, 'walk');
  let skipped = false;
  app.querySelector('.skip').onclick = () => { skipped = true; stop(); level(l); };
  const steps = setInterval(sfx.step, 260);
  const k = `travel${1 + (idx % 3)}`;
  await Promise.all([newRegion ? talk(hero, bubble, [`region/${r.id}`], r.arrive) : talk(hero, bubble, [`ui/${k}`], UI[k]), wait(3400)]);
  clearInterval(steps);
  if (skipped) return;
  app.querySelector('.travel-screen').classList.add('arrive');
  setBase(hero, 'wave');
  await wait(800);
  if (!skipped && document.body.contains(hero)) level(l);
}

// ---------- מפת המסע ----------
function map(walkTo = null) {
  stop();
  const cur = unlockedIndex();
  const here = firstUndone();
  const nodes = LETTERS.map((l, i) => {
    const x = 50 + Math.sin(i * 0.9) * 26;
    const st = prog.done[l.id] ? 'done' : i <= cur ? 'open' : 'locked';
    return { l, i, x, st, stars: prog.done[l.id] || 0 };
  });
  app.innerHTML = `
  <section class="screen map-screen">
    <header class="map-head">
      <button class="btn round home" aria-label="בית">🏠</button>
      <div class="bag-count">🎒 ${doneCount()}/27</div>
    </header>
    <div class="map-scroll">
      ${REGIONS.map((r) => `
        <div class="region" style="${regionBG(r.id, r.sky)}">
          <h2 class="region-name">${r.name}</h2>
          <div class="path">
            ${nodes.filter((n) => n.l.region === r.id).map((n) => `
              <button class="node ${n.st} ${n.i === here && !prog.done[n.l.id] ? 'current' : ''}" data-i="${n.i}" style="--x:${n.x}%">
                <span class="ch">${n.st === 'locked' ? '🔒' : n.l.ch}</span>
                ${n.st === 'done' ? `<span class="node-stars">${'⭐'.repeat(n.stars)}</span>` : ''}
                ${n.st !== 'locked' ? friendHTML(n.l, 'node-friend') : ''}
              </button>`).join('')}
          </div>
        </div>`).join('')}
      <div class="map-end">🏰 ${doneCount() === LETTERS.length ? 'כָּל הָאוֹתִיּוֹת חָזְרוּ!' : 'הַסּוֹף שֶׁל הַמַּסָּע'}</div>
      <div class="map-lula">${heroHTML('wave', 'sm')}</div>
    </div>
  </section>`;
  app.querySelector('.home').onclick = home;
  const scroller = app.querySelector('.map-scroll');
  const lulaBox = app.querySelector('.map-lula');
  const hero = lulaBox.querySelector('.hero');
  const place = (i, smooth) => {
    const node = app.querySelector(`.node[data-i="${i}"]`);
    if (!node) return;
    const nr = node.getBoundingClientRect();
    const sr = scroller.getBoundingClientRect();
    const side = nr.left - sr.left > sr.width / 2 ? -1 : 1;
    lulaBox.style.transition = smooth ? 'left 1.1s ease-in-out, top 1.1s ease-in-out' : 'none';
    lulaBox.style.left = `${nr.left - sr.left + nr.width / 2 + side * (nr.width * 0.9)}px`;
    lulaBox.style.top = `${nr.top - sr.top + scroller.scrollTop + nr.height}px`;
  };
  const start = walkTo != null ? Math.max(0, walkTo - 1) : here;
  requestAnimationFrame(() => {
    app.querySelector(`.node[data-i="${start}"]`)?.scrollIntoView({ block: 'center' });
    place(start, false);
    if (walkTo != null && walkTo !== start) {
      setTimeout(() => {
        pose(hero, 'walk');
        app.querySelector(`.node[data-i="${walkTo}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        setTimeout(() => place(walkTo, true), 300);
        setTimeout(() => pose(hero, 'wave'), 1500);
      }, 500);
    }
  });
  if (doneCount() === LETTERS.length && walkTo === LETTERS.length - 1) { confetti(120); say('ui/theEnd'); }
  else say('ui/map');
  app.querySelectorAll('.node').forEach((b) => (b.onclick = () => {
    const i = +b.dataset.i;
    if (b.classList.contains('locked')) { sfx.boop(); b.classList.add('nope'); setTimeout(() => b.classList.remove('nope'), 400); return; }
    sfx.pop(); stop();
    pose(hero, 'walk');
    place(i, true);
    setTimeout(() => travelTo(LETTERS[i]), 1000);
  }));
}

// ---------- אלבום החברים ----------
function album() {
  stop();
  app.innerHTML = `
  <section class="screen album-screen" style="${regionBG('home')}">
    <header class="map-head">
      <button class="btn round home" aria-label="בית">🏠</button>
      <div class="bag-count">🎒 ${doneCount()}/27</div>
    </header>
    <div class="album-grid">
      ${LETTERS.map((l) => `
        <button class="album-card ${prog.done[l.id] ? 'got' : 'missing'}" data-id="${l.id}">
          ${friendHTML(l, 'album-pic')}
          <span class="album-letter">${l.ch}</span>
          <span class="album-name">${prog.done[l.id] ? l.friend.name : '?'}</span>
        </button>`).join('')}
    </div>
  </section>`;
  app.querySelector('.home').onclick = home;
  say('ui/album');
  app.querySelectorAll('.album-card').forEach((b) => (b.onclick = () => {
    const l = LETTERS.find((x) => x.id === b.dataset.id);
    if (!prog.done[l.id]) { sfx.boop(); return; }
    sfx.pop(); b.classList.remove('boing'); void b.offsetWidth; b.classList.add('boing');
    say(`L/${l.id}/friend1`);
  }));
}

// ---------- שלב של אות ----------
async function level(l) {
  stop();
  const region = regionOf(l);
  const visible = STAGES.filter((s) => !s.interlude);
  app.innerHTML = `
  <section class="screen level-screen" style="${regionBG(region.id, region.sky)}">
    <header class="level-head">
      <button class="btn round home" aria-label="למפה">🗺️</button>
      <div class="letter-chip">${l.ch}</div>
      <div class="steps">${visible.map((s, i) => `<i data-i="${i}"></i>`).join('')}</div>
      ${DEV ? '<button class="btn round skip" aria-label="דלג">⏭</button>' : ''}
    </header>
    <div class="level-main">
      <aside class="side-hero">${heroHTML('wave', 'lg')}<div class="bubble-anchor"></div></aside>
      <main class="stage-body"></main>
    </div>
    <div class="foot"></div>
  </section>`;
  const scr = app.querySelector('.level-screen');
  const hero = scr.querySelector('.hero');
  const bubble = scr.querySelector('.bubble-anchor');
  setBase(hero, 'wave');
  let mistakes = 0;
  let aborted = false;
  let curStage = 'story';
  const since = P.startLetter(prog, l.id);
  save();
  const starsBefore = P.totalStars(prog);
  const ctx = {
    l,
    lines: letterLines(l),
    screen: scr,
    hero,
    body: scr.querySelector('.stage-body'),
    caption: bubble,
    foot: scr.querySelector('.foot'),
    textOf,
    talk: (...ids) => talk(hero, null, ids.flat()),
    say: (...ids) => say(ids.flat()),
    bubble: (html) => showBubble(bubble, html),
    pose: (p, ms) => pose(hero, p, ms),
    base: (p) => setBase(hero, p),
    lulaReact: (kind) => (kind === 'dance' ? setBase(hero, 'jump') : pose(hero, kind === 'happy' ? 'jump' : kind, 1300)),
    confettiSmall: () => confetti(24),
    confettiBig: () => confetti(140),
    mistake: () => { mistakes++; P.recordWrong(prog, l.id, curStage); save(); },
    right: () => { P.recordRight(prog, l.id); save(); },
    stars: () => (mistakes <= 2 ? 3 : mistakes <= 6 ? 2 : 1),
    complete: (stars) => { P.completeLetter(prog, l.id, stars); P.recordTime(prog, l.id, since); save(); },
    scoreHTML: () => celebrateScore(starsBefore),
    friendHTML: (cls) => friendHTML(l, cls),
  };
  scr.querySelector('.home').onclick = () => { aborted = true; stop(); P.recordTime(prog, l.id, since); save(); map(); };
  let skip = null;
  if (DEV) scr.querySelector('.skip').onclick = () => skip && skip();
  let vi = 0;
  for (const st of STAGES) {
    if (aborted) return;
    scr.querySelectorAll('.steps i').forEach((d, k) => { d.classList.toggle('on', k < vi); d.classList.toggle('cur', k === vi); });
    showBubble(bubble, '');
    ctx.foot.replaceChildren();
    scr.dataset.stage = st.key;
    curStage = st.key.startsWith('word') ? 'word' : st.key;
    ctx.body.className = `stage-body st-${st.key}`;
    ctx.body.innerHTML = '';
    setBase(hero, st.pose || 'wave');
    await Promise.race([st.run(ctx), new Promise((r) => (skip = r))]);
    if (aborted || !document.body.contains(scr)) return;
    stop();
    if (!st.interlude) vi++;
  }
  const idx = LETTERS.indexOf(l);
  map(Math.min(LETTERS.length - 1, idx + 1));
}

// ---------- ציון לילד ----------
function scorePanel() {
  const stars = P.totalStars(prog);
  const r = P.rankOf(stars);
  const pct = Math.round((P.lettersDone(prog) / LETTERS.length) * 100);
  return `
    <div class="score-panel">
      <div class="rank"><span class="rank-ico">${r.icon}</span><span class="rank-name">${r.name}</span></div>
      <div class="score-stars">⭐ <b>${stars}</b><small>/${P.maxStars}</small></div>
      <div class="score-bar" title="${pct}%"><i style="width:${pct}%"></i><span>${P.lettersDone(prog)}/${LETTERS.length} אוֹתִיּוֹת</span></div>
      ${r.next ? `<div class="score-next">עוֹד ${r.toNext} ⭐ לְ${r.next.icon}</div>` : ''}
    </div>`;
}

function celebrateScore(before) {
  const now = P.totalStars(prog);
  const r0 = P.rankOf(before);
  const r1 = P.rankOf(now);
  const up = r1.name !== r0.name;
  return `<div class="cele-score ${up ? 'rank-up' : ''}">
    <span>⭐ ${now}/${P.maxStars}</span>
    <span class="rank-chip">${r1.icon} ${r1.name}${up ? ' 🎉' : ''}</span>
  </div>`;
}

// ---------- פינת הורים: שער חשבון ואז דוח התקדמות ----------
function parents() {
  const a = Math.floor(2 + Math.random() * 7); const b = Math.floor(2 + Math.random() * 7);
  const d = document.createElement('dialog');
  d.className = 'parents';
  d.innerHTML = `<form method="dialog">
    <h3>פינת הורים</h3>
    <label>כמה זה ${a} × ${b}? <input name="q" inputmode="numeric" autocomplete="off"></label>
    <div class="row"><button value="ok" class="btn small">כניסה</button><button value="no" class="btn small ghost">סגירה</button></div>
  </form>`;
  document.body.append(d);
  d.showModal();
  d.onclose = () => {
    const ok = d.returnValue === 'ok' && +d.querySelector('input').value === a * b;
    d.remove();
    if (ok) report();
  };
}

const STAGE_NAMES = {
  story: 'סיפור', letter: 'הכרות עם האות', syl: 'הברות', trace: 'ציור האות', word: 'מילים חדשות',
  bubbles: 'זיהוי האות בבועות', which: 'צליל פותח (איזו תמונה מתחילה באות)', listen: 'הבנת מילה שומעים',
  hidden: 'חיפוש האות', memory: 'התאמת תמונה ומילה', build: 'השלמת אות חסרה', yesno: 'האם המילה מתחילה באות',
  party: 'מסיבת מילים', celebrate: 'חגיגה',
};
const fmtDate = (t) => (t ? new Date(t).toLocaleDateString('he-IL', { day: 'numeric', month: 'numeric', year: '2-digit' }) : '');

function report() {
  stop();
  const o = P.overall(prog);
  const r = P.rankOf(o.stars);
  const practice = P.needsPractice(prog);
  const weak = P.weakStages(prog).slice(0, 3);
  const cell = (l) => {
    const s = prog.stats[l.id];
    const st = prog.done[l.id] || 0;
    const acc = P.accuracy(s);
    const cls = !st ? (s ? 'started' : 'none') : st === 3 && (acc == null || acc >= 80) ? 'great' : st >= 2 && (acc == null || acc >= 65) ? 'ok' : 'weak';
    return `<div class="rep-cell ${cls}">
      <b>${l.ch}</b>
      <span class="rep-stars">${st ? '⭐'.repeat(st) : s ? 'התחיל' : ''}</span>
      ${acc != null ? `<span class="rep-acc">${acc}%</span>` : ''}
      ${s && s.secs ? `<span class="rep-time">${Math.max(1, Math.round(s.secs / 60))} ד׳</span>` : ''}
    </div>`;
  };
  app.innerHTML = `
  <section class="screen report-screen">
    <header class="map-head">
      <button class="btn round home" aria-label="בית">🏠</button>
      <h2>דוח התקדמות</h2>
    </header>
    <div class="report-body">
      <div class="rep-cards">
        <div class="rep-card"><small>אותיות שהושלמו</small><b>${o.letters}/${LETTERS.length}</b><div class="score-bar"><i style="width:${o.percent}%"></i></div></div>
        <div class="rep-card"><small>כוכבים</small><b>⭐ ${o.stars}/${P.maxStars}</b><span>${r.icon} ${r.name}</span></div>
        <div class="rep-card"><small>דיוק בתשובות</small><b>${o.accuracy == null ? '–' : o.accuracy + '%'}</b><span>תשובות נכונות מכלל הניסיונות</span></div>
        <div class="rep-card"><small>זמן משחק</small><b>${o.minutes} דק׳</b><span>${prog.lastPlayed ? 'שוחק לאחרונה ' + fmtDate(prog.lastPlayed) : 'עוד לא שוחק'}</span></div>
      </div>

      <h3>כל האותיות</h3>
      <div class="rep-legend"><span class="great">מצוין</span><span class="ok">טוב</span><span class="weak">כדאי לחזור</span><span class="started">התחיל</span><span class="none">עוד לא</span></div>
      <div class="rep-grid">${LETTERS.map(cell).join('')}</div>

      <h3>מה כדאי לתרגל</h3>
      ${practice.length ? `<p>האותיות: <b class="rep-letters">${practice.map((l) => l.ch).join(' ')}</b>. אפשר לחזור אליהן מהמפה, כל אות פתוחה לשחק שוב, והכוכבים נשמרים לפי התוצאה הטובה ביותר.</p>` : '<p>אין כרגע אותיות שדורשות חזרה. כל הכבוד!</p>'}
      ${weak.length ? `<p>סוגי המשחקים עם הכי הרבה טעויות: ${weak.map(([k, n]) => `${STAGE_NAMES[k] || k} (${n})`).join(', ')}.</p>` : ''}
      <p class="rep-note">איך מחושב הציון: בכל אות 3 כוכבים עד 2 טעויות, 2 כוכבים עד 6 טעויות, וכוכב אחד מעבר לזה. הדיוק הוא אחוז התשובות הנכונות מכל הניסיונות במשחקי הבחירה.</p>

      <h3>גיבוי והעברה למכשיר אחר</h3>
      <p>ההתקדמות נשמרת בדפדפן הזה. כדי להמשיך במכשיר אחר, מעתיקים את הקוד ומדביקים אותו שם בפינת ההורים.</p>
      <textarea class="rep-code" readonly>${P.exportCode(prog)}</textarea>
      <div class="row"><button class="btn small copy">העתקת קוד</button></div>
      <textarea class="rep-import" placeholder="הדביקו כאן קוד גיבוי"></textarea>
      <div class="row"><button class="btn small ghost load">טעינת קוד</button><span class="rep-msg"></span></div>

      <h3>הגדרות</h3>
      <label class="check"><input type="checkbox" class="mute" ${settings.muted ? 'checked' : ''}> השתקת קול</label>
      <label class="check"><input type="checkbox" class="all" ${prog.all ? 'checked' : ''}> פתיחת כל האותיות (לבחירה חופשית)</label>
      <div class="row"><button class="btn small ghost reset">איפוס כל ההתקדמות</button></div>
    </div>
  </section>`;
  const $ = (s) => app.querySelector(s);
  const msg = (t) => ($('.rep-msg').textContent = t);
  $('.home').onclick = home;
  $('.mute').onchange = (e) => { settings.muted = e.target.checked; };
  $('.all').onchange = (e) => { prog.all = e.target.checked; save(); };
  $('.copy').onclick = async () => {
    const t = $('.rep-code');
    try { await navigator.clipboard.writeText(t.value); msg('הקוד הועתק'); } catch { t.select(); document.execCommand('copy'); msg('הקוד הועתק'); }
  };
  $('.load').onclick = () => {
    try {
      const p = P.importCode($('.rep-import').value);
      if (!confirm('לטעון את ההתקדמות מהקוד? ההתקדמות הנוכחית בדפדפן הזה תוחלף.')) return;
      prog = p; save(); report();
    } catch { msg('הקוד לא תקין'); }
  };
  $('.reset').onclick = () => {
    if (!confirm('למחוק את כל ההתקדמות? אי אפשר לבטל את זה.')) return;
    prog = P.resetProgress(); save(); report();
  };
}

home();
