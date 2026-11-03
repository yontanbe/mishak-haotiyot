import { LETTERS, REGIONS, UI, letterLines } from './data.js';
import { STAGES } from './stages.js';
import { say, stop, sfx, settings, textOf, unlockAudio } from './audio.js';
import { lulaSVG } from './lula.js';

const app = document.getElementById('app');
const KEY = 'alefbet-quest-v1';
const DEV = new URLSearchParams(location.search).has('dev');

// ---------- התקדמות (נשמרת בדפדפן) ----------
const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
let prog = { done: {}, ...load() };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(prog)); } catch {} };
const firstUndone = () => { const i = LETTERS.findIndex((l) => !prog.done[l.id]); return i === -1 ? LETTERS.length - 1 : i; };
const unlockedIndex = () => (DEV || prog.all ? LETTERS.length - 1 : firstUndone());
const doneCount = () => Object.keys(prog.done).length;

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

function regionBG(r) {
  return `background-image:url(img/regions/${r.id}.jpg), linear-gradient(180deg, ${r.sky[0]}, ${r.sky[1]} 70%, ${r.ground})`;
}

// ---------- מסך פתיחה ----------
function title() {
  stop();
  app.innerHTML = `
  <section class="screen title-screen">
    <div class="cover" style="background-image:url(img/cover.jpg)"></div>
    <div class="title-card">
      <h1><span>מִשְׂחַק</span> <span>הָאוֹתִיּוֹת</span> <span class="ab">א-ב</span></h1>
      <p>מַסָּע קָסוּם עִם לוּלָה הַמְּגַלָּה</p>
      <button class="btn go pulse start">יוֹצְאִים לַדֶּרֶךְ! <span class="arrow">◀</span></button>
      ${doneCount() ? `<p class="small">כְּבָר מָצָאנוּ ${doneCount()} אוֹתִיּוֹת מִתּוֹךְ 27</p>` : ''}
    </div>
    <div class="title-lula">${lulaSVG('idle')}</div>
    <button class="btn round gear" aria-label="הורים">⚙️</button>
  </section>`;
  app.querySelector('.start').onclick = () => { unlockAudio(); sfx.pop(); doneCount() ? map() : storyIntro(); };
  app.querySelector('.gear').onclick = parents;
}

// ---------- סיפור הפתיחה ----------
async function storyIntro() {
  const slides = [
    { k: 'story1', cls: 'st1' },
    { k: 'story2', cls: 'st2' },
    { k: 'story3', cls: 'st3' },
    { k: 'story4', cls: 'st4' },
  ];
  app.innerHTML = `
  <section class="screen story-screen" style="${regionBG(REGIONS[0])}">
    <div class="story-stage">
      <div class="walker">${lulaSVG('idle')}</div>
      <div class="flying">${'אבגדהוזחטיכלמנסעפצקרשת'.split('').map((c, i) => `<span style="--i:${i};--a:${(i * 47) % 360}deg">${c}</span>`).join('')}</div>
    </div>
    <div class="caption"></div>
    <div class="foot"><button class="btn small skip">דַּלְּגוּ ⏭</button></div>
  </section>`;
  const scr = app.querySelector('.story-screen');
  const cap = app.querySelector('.caption');
  let skipped = false;
  app.querySelector('.skip').onclick = () => { skipped = true; stop(); map(); };
  for (const s of slides) {
    if (skipped) return;
    scr.dataset.slide = s.cls;
    cap.innerHTML = `<div class="speech lula">${UI[s.k]}</div>`;
    if (s.cls === 'st3') sfx.whoosh();
    await say(`ui/${s.k}`);
    await new Promise((r) => setTimeout(r, 500));
  }
  if (!skipped) { prog.seenStory = true; save(); map(); }
}

// ---------- מפת המסע ----------
function map(walkTo = null) {
  stop();
  const cur = unlockedIndex();
  const here = firstUndone();
  const nodes = LETTERS.map((l, i) => {
    const x = 50 + Math.sin(i * 0.9) * 30;
    const st = prog.done[l.id] ? 'done' : i <= cur ? 'open' : 'locked';
    const stars = prog.done[l.id] || 0;
    return { l, i, x, st, stars };
  });
  const byRegion = REGIONS.map((r) => ({ r, nodes: nodes.filter((n) => n.l.region === r.id) }));
  app.innerHTML = `
  <section class="screen map-screen">
    <header class="map-head">
      <button class="btn round home" aria-label="בית">🏠</button>
      <div class="bag-count">🎒 ${doneCount()}/27</div>
      <div class="stickers">${LETTERS.filter((l) => prog.done[l.id]).map((l) => `<span>${l.friend.e}</span>`).join('')}</div>
    </header>
    <div class="map-scroll">
      ${byRegion.map(({ r, nodes }) => `
        <div class="region" style="${regionBG(r)}">
          <h2 class="region-name">${r.name}</h2>
          <div class="deco">${r.deco.map((d, k) => `<span style="--k:${k}">${d}</span>`).join('')}</div>
          <div class="path">
            ${nodes.map((n) => `
              <button class="node ${n.st} ${n.i === here && !prog.done[n.l.id] ? 'current' : ''}" data-i="${n.i}" style="--x:${n.x}%">
                <span class="ch">${n.st === 'locked' ? '🔒' : n.l.ch}</span>
                ${n.st === 'done' ? `<span class="node-stars">${'⭐'.repeat(n.stars)}</span>` : ''}
                ${n.st !== 'locked' ? `<span class="node-friend">${n.l.friend.e}</span>` : ''}
              </button>`).join('')}
          </div>
        </div>`).join('')}
      <div class="map-end">🏰 ${prog.done['tsadi-sofit'] ? 'כָּל הָאוֹתִיּוֹת חָזְרוּ!' : 'הַסּוֹף שֶׁל הַמַּסָּע'}</div>
      <div class="map-lula">${lulaSVG('idle small')}</div>
    </div>
  </section>`;
  app.querySelector('.home').onclick = title;
  const scroller = app.querySelector('.map-scroll');
  const lulaBox = app.querySelector('.map-lula');
  const place = (i, smooth) => {
    const node = app.querySelector(`.node[data-i="${i}"]`);
    if (!node) return;
    const nr = node.getBoundingClientRect();
    const sr = scroller.getBoundingClientRect();
    lulaBox.style.transition = smooth ? 'left 1.1s ease-in-out, top 1.1s ease-in-out' : 'none';
    lulaBox.style.left = `${nr.left - sr.left + nr.width / 2}px`;
    lulaBox.style.top = `${nr.top - sr.top + scroller.scrollTop - 10}px`;
  };
  const start = walkTo != null ? Math.max(0, walkTo - 1) : here;
  requestAnimationFrame(() => {
    const node = app.querySelector(`.node[data-i="${start}"]`);
    node?.scrollIntoView({ block: 'center' });
    place(start, false);
    if (walkTo != null && walkTo !== start) {
      setTimeout(() => {
        lulaBox.querySelector('.lula').classList.add('walking');
        const steps = setInterval(sfx.step, 220);
        app.querySelector(`.node[data-i="${walkTo}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        setTimeout(() => place(walkTo, true), 300);
        setTimeout(() => { clearInterval(steps); lulaBox.querySelector('.lula')?.classList.remove('walking'); }, 1500);
      }, 500);
    }
  });
  if (doneCount() === LETTERS.length && walkTo === LETTERS.length - 1) { confetti(120); say('ui/theEnd'); }
  else say('ui/map');
  app.querySelectorAll('.node').forEach((b) => (b.onclick = () => {
    const i = +b.dataset.i;
    if (b.classList.contains('locked')) { sfx.boop(); b.classList.add('nope'); setTimeout(() => b.classList.remove('nope'), 400); return; }
    sfx.pop();
    stop();
    lulaBox.querySelector('.lula').classList.add('walking');
    place(i, true);
    setTimeout(() => level(LETTERS[i]), 1100);
  }));
}

// ---------- שלב של אות ----------
async function level(l) {
  stop();
  const region = REGIONS.find((r) => r.id === l.region);
  app.innerHTML = `
  <section class="screen level-screen" style="${regionBG(region)}">
    <header class="level-head">
      <button class="btn round home" aria-label="למפה">🗺️</button>
      <div class="letter-chip">${l.ch}</div>
      <div class="steps">${STAGES.map((s, i) => `<i data-i="${i}" title="${s.key}"></i>`).join('')}</div>
      ${DEV ? '<button class="btn round skip" aria-label="דלג">⏭</button>' : ''}
    </header>
    <div class="stage-title"></div>
    <main class="stage-body"></main>
    <div class="caption"></div>
    <div class="foot"></div>
    <div class="corner-lula">${lulaSVG('idle small')}</div>
  </section>`;
  const scr = app.querySelector('.level-screen');
  let mistakes = 0;
  let aborted = false;
  const lula = () => scr.querySelector('.corner-lula .lula');
  const ctx = {
    l,
    lines: letterLines(l),
    body: scr.querySelector('.stage-body'),
    caption: scr.querySelector('.caption'),
    foot: scr.querySelector('.foot'),
    textOf,
    setTitle: (t) => (scr.querySelector('.stage-title').textContent = t),
    lulaReact: (kind) => {
      const el = lula(); if (!el) return;
      el.classList.remove('happy', 'oops', 'dance'); void el.getBoundingClientRect(); el.classList.add(kind);
      if (kind !== 'dance') setTimeout(() => el.classList.remove(kind), 1200);
    },
    confettiSmall: () => confetti(24),
    confettiBig: () => confetti(140),
    mistake: () => mistakes++,
    stars: () => (mistakes <= 2 ? 3 : mistakes <= 6 ? 2 : 1),
    complete: (stars) => { prog.done[l.id] = Math.max(prog.done[l.id] || 0, stars); save(); },
  };
  scr.querySelector('.home').onclick = () => { aborted = true; stop(); map(); };
  let skip = null;
  if (DEV) scr.querySelector('.skip').onclick = () => skip && skip();
  for (let i = 0; i < STAGES.length; i++) {
    if (aborted) return;
    scr.querySelectorAll('.steps i').forEach((d, k) => { d.classList.toggle('on', k < i); d.classList.toggle('cur', k === i); });
    ctx.setTitle('');
    ctx.caption.innerHTML = '';
    ctx.foot.replaceChildren();
    ctx.body.className = `stage-body st-${STAGES[i].key}`;
    ctx.body.innerHTML = '';
    await Promise.race([STAGES[i].run(ctx), new Promise((r) => (skip = r))]);
    if (aborted || !document.body.contains(scr)) return;
    stop();
  }
  const idx = LETTERS.indexOf(l);
  map(Math.min(LETTERS.length - 1, idx + 1));
}

// ---------- פינת הורים ----------
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
    if (!ok) return;
    const p = document.createElement('dialog');
    p.className = 'parents';
    p.innerHTML = `<form method="dialog">
      <h3>פינת הורים</h3>
      <p>נמצאו ${doneCount()} אותיות מתוך 27.</p>
      <label class="check"><input type="checkbox" name="mute" ${settings.muted ? 'checked' : ''}> השתקת קול</label>
      <label class="check"><input type="checkbox" name="all" ${prog.all ? 'checked' : ''}> פתיחת כל האותיות</label>
      <div class="row"><button value="save" class="btn small">שמירה</button><button value="reset" class="btn small ghost">איפוס התקדמות</button></div>
    </form>`;
    document.body.append(p);
    p.showModal();
    p.onclose = () => {
      if (p.returnValue === 'reset') { prog = { done: {} }; }
      else if (p.returnValue === 'save') {
        settings.muted = p.querySelector('[name=mute]').checked;
        prog.all = p.querySelector('[name=all]').checked;
      }
      save(); p.remove(); title();
    };
  };
}

title();
