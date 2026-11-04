import { LETTERS, REGIONS, UI, letterLines } from './data.js';
import { STAGES, REVIEW_STAGES } from './stages.js';
import { COLORS, COLOR_BY_ID, CUI, colorLines, COLOR_REVIEW_AFTER } from './colors-data.js';
import { colorStages, COLOR_REVIEW_STAGES, splashSVG } from './colors-stages.js';
import { WORLDS } from './worlds-stages.js';
import { HE_MORE, EN_WORLDS } from './more-stages.js';
import { EN_UI } from './more-data.js';
import { GUIDE, IS_AR, tr, observeDOM } from './i18n.js';
// השאלה במסך הבחירה תמיד מוצגת גם בעברית
const EN_UI_HE = { langPick: 'בְּמָה נְשַׂחֵק הַיּוֹם? בְּעִבְרִית, אוֹ בְּאַנְגְּלִית?' };
// עולמות בצד העברית (בלי פרק הניסיון באנגלית, שעבר לצד האנגלית) ובצד האנגלית
const HE_WORLDS = [...WORLDS.filter((W) => W.id !== 'english'), ...HE_MORE];
const ALL_WORLDS = [...WORLDS, ...HE_MORE, ...EN_WORLDS];
import { say, stop, sfx, settings, textOf, unlockAudio } from './audio.js';
import { heroHTML, pose, setBase, friendHTML } from './hero.js';
import * as P from './progress.js';
import { autoFit } from './fit.js';

const app = document.getElementById('app');
observeDOM(document.body);
const DEV = new URLSearchParams(location.search).has('dev');
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- התקדמות (נשמרת בדפדפן) ----------
let prog = P.loadProgress();
const save = () => P.saveProgress(prog);
const firstUndone = () => { const i = LETTERS.findIndex((l) => !prog.done[l.id]); return i === -1 ? LETTERS.length - 1 : i; };

// מסלול המסע: 27 אותיות, ואחרי כל שתי אותיות תחנת חזרה על האותיות האחרונות
const PATH = [];
LETTERS.forEach((l, i) => {
  PATH.push({ type: 'letter', id: l.id, l });
  if ((i + 1) % 2 === 0 || i === LETTERS.length - 1) {
    PATH.push({ type: 'review', id: `review-${l.id}`, l, letters: LETTERS.slice(Math.max(0, i - 3), i + 1) });
  }
});
const isDone = (it) => (it.type === 'letter' ? !!prog.done[it.id] : !!(prog.reviews || {})[it.id]);
const nextIndex = () => { const i = PATH.findIndex((it) => !isDone(it)); return i === -1 ? PATH.length - 1 : i; };
const unlockedIndex = () => (DEV || prog.all ? PATH.length - 1 : nextIndex());
const go = (it) => (it.type === 'review' ? level(it.l, it) : travelTo(it.l));
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
// ---------- בחירת שפה: עברית (לימוד עברית) או English (אנגלית לדוברי עברית) ----------
// ארבעה מסלולים: עברית, אנגלית לדוברי עברית, ערבית, אנגלית לדוברי ערבית.
// שפת המדריכה (עברית או ערבית) קובעת קול, טקסטים והתקדמות נפרדת, ולכן החלפה שלה טוענת את הדף מחדש.
const TRACKS = [
  { id: 'he', guide: 'he', lang: 'he', bg: 'home', friend: 'img/friends/alef.webp', fl: ['א', 'ב', 'ג', 'ד'], flc: 'he', label: 'עִבְרִית', sub: 'אוֹתִיּוֹת, מִסְפָּרִים, סִפּוּרִים', aria: 'עברית' },
  { id: 'he-en', guide: 'he', lang: 'en', bg: 'english', friend: 'img/friends/yod.webp', fl: ['A', 'א', 'B', 'ב'], flc: 'en mix', label: 'English', ltr: true, sub: 'אַנְגְּלִית לְדוֹבְרֵי עִבְרִית', aria: 'English לדוברי עברית' },
  { id: 'ar', guide: 'ar', lang: 'he', bg: 'desert', friend: 'img/friends/gimel.webp', fl: ['أ', 'ب', 'ت', 'ث'], flc: 'ar', label: 'الْعَرَبِيَّة', sub: 'حُرُوفٌ، أَرْقَامٌ، قِصَصٌ', aria: 'العربية' },
  { id: 'ar-en', guide: 'ar', lang: 'en', bg: 'english', friend: 'img/friends/yod.webp', fl: ['A', 'أ', 'B', 'ب'], flc: 'en mix', label: 'English', ltr: true, sub: 'الْإِنْجِلِيزِيَّةُ لِلنَّاطِقِينَ بِالْعَرَبِيَّةِ', aria: 'English للناطقين بالعربية' },
];
const LANG_ASK_AR = 'بِمَاذَا نَلْعَبُ الْيَوْمَ؟';
function langSelect() {
  stop();
  const floaters = (chars, cls) => chars.map((c, i) => `<span class="lg-float ${cls} p${i}" style="--i:${i}">${c}</span>`).join('');
  const gate = (t) => `<button class="lang-gate ${t.flc} t-${t.id}" data-track="${t.id}" aria-label="${t.aria}">
        <span class="lg-arch" style="background-image:url(img/regions/${t.bg}.webp)"></span>
        <span class="lg-glow"></span>
        ${floaters(t.fl, t.flc)}
        <img class="lg-friend" src="${t.friend}" alt="">
        <span class="lg-label ${t.guide === 'ar' ? 'ar' : ''}"><b${t.ltr ? ' dir="ltr"' : ''}>${t.label}</b><small>${t.sub}</small></span>
      </button>`;
  app.innerHTML = `
  <section class="screen lang-screen four" data-keep>
    <div class="lg-sky"><i class="cl c1"></i><i class="cl c2"></i><i class="cl c3"></i></div>
    <div class="lg-ask">בְּמָה נְשַׂחֵק הַיּוֹם? <span class="ar">${LANG_ASK_AR}</span></div>
    <div class="lg-stage">
      <div class="lg-pair">${gate(TRACKS[0])}${gate(TRACKS[1])}</div>
      <div class="lang-hero">${heroHTML('wave', 'xl')}<div class="bubble-anchor"></div></div>
      <div class="lg-pair">${gate(TRACKS[2])}${gate(TRACKS[3])}</div>
    </div>
  </section>`;
  const hero = app.querySelector('.hero');
  setBase(hero, 'wave');
  const askHTML = `${EN_UI_HE.langPick}<br><span class="ar">${LANG_ASK_AR}</span>`;
  showBubble(app.querySelector('.bubble-anchor'), askHTML);
  app.querySelector('.lang-screen').addEventListener('pointerdown', () => { unlockAudio(); }, { once: true });
  setTimeout(() => { if (navigator.userActivation?.hasBeenActive) talk(hero, null, ['!ui/langPick', '!ar/ui/langPick']); }, 400);
  app.querySelectorAll('.lang-gate').forEach((b) => (b.onclick = () => {
    unlockAudio(); sfx.pop(); stop();
    const t = TRACKS.find((x) => x.id === b.dataset.track);
    app.querySelector('.lang-screen').classList.add('picked');
    b.classList.add('chosen');
    if (t.guide !== GUIDE) {
      // מעבר בין עברית לערבית: שומרים את הבחירה בהתקדמות של השפה השנייה וטוענים מחדש
      try {
        const key = P.PROGRESS_KEYS[t.guide];
        const other = JSON.parse(localStorage.getItem(key) || 'null') || { v: 2, done: {}, stats: {}, created: Date.now() };
        other.lang = t.lang;
        localStorage.setItem(key, JSON.stringify(other));
        localStorage.setItem('lula-guide', t.guide);
      } catch {}
      setTimeout(() => location.reload(), 650);
      return;
    }
    prog.lang = t.lang; save();
    setTimeout(home, 650);
  }));
}

function home() {
  stop();
  if (!prog.lang) return langSelect();
  const en = prog.lang === 'en';
  const next = PATH[nextIndex()];
  const started = doneCount() > 0;
  const nextLabel = next.type === 'review' ? 'הַתַּחֲנָה הַבָּאָה: חֲזָרָה 🔁' : `הַתַּחֲנָה הַבָּאָה: הָאוֹת ${next.l.ch}`;
  const card = (W) => `<button class="world-card play-world world-${W.id}" data-w="${W.id}"><span class="wc-ico">${W.icon}</span><span class="wc-t">${W.title}</span><small>${wCount(W)}/${W.stations.length}</small></button>`;
  app.innerHTML = `
  <section class="screen home-screen ${en ? 'home-en' : ''}" style="${regionBG(en ? 'english' : 'home')}">
    <div class="home-logo">
      ${en ? '<h1><span dir="ltr">English</span> <span>עִם</span> <span class="ab">לוּלָה</span></h1><p>לוֹמְדִים אַנְגְּלִית עִם יוֹגִי הַיַּנְשׁוּף</p>'
        : '<h1><span>מִשְׂחַק</span> <span>הָאוֹתִיּוֹת</span> <span class="ab">א-ב</span></h1><p>מַסָּע קָסוּם עִם לוּלָה הַמְּגַלָּה</p>'}
    </div>
    ${en ? '' : scorePanel()}
    <div class="home-stage">
      <div class="home-hero">${heroHTML('wave', 'xl tappable')}</div>
      <nav class="home-menu">
        <div class="bubble-anchor home-bubble"></div>
        <div class="worlds-grid ${en ? 'en' : ''}">
          ${en ? EN_WORLDS.map(card).join('') : `
          <button class="world-card play world-letters"><span class="wc-ico">א</span><span class="wc-t">אוֹתִיּוֹת</span><small>${started ? nextLabel.replace('הַתַּחֲנָה הַבָּאָה: ', '') : '27 אוֹתִיּוֹת'}</small></button>
          <button class="world-card play-colors world-colors"><span class="wc-ico">🎨</span><span class="wc-t">צְבָעִים</span><small>${colorsDone()}/${COLORS.length}</small></button>
          ${HE_WORLDS.map(card).join('')}`}
        </div>
        <div class="home-row">
          ${en ? '' : '<button class="mega small map"><span class="mega-ico">🗺️</span><span class="mega-txt">מַפַּת הָאוֹתִיּוֹת</span></button>'}
          ${IS_AR ? '' : '<button class="mega small album"><span class="mega-ico">🎒</span><span class="mega-txt">הַחֲבֵרִים<small>' + doneCount() + '/27</small></span></button>'}
          <button class="mega small lang-switch"><span class="mega-ico">🌐</span><span class="mega-txt">${tr('שָׂפָה')}</span></button>
        </div>
      </nav>
    </div>
    <button class="btn round gear" aria-label="הורים">⚙️</button>
  </section>`;
  const hero = app.querySelector('.hero');
  const bubble = app.querySelector('.bubble-anchor');
  setBase(hero, 'wave');
  const helloKey = en ? 'enHome' : 'homeHello';
  const helloText = en ? EN_UI.enHome : UI.homeHello;
  showBubble(bubble, helloText);
  // הדפדפן מאפשר קול רק אחרי נגיעה, אז לולה מברכת בנגיעה הראשונה
  let greeted = false;
  const greet = () => { if (greeted) return; greeted = true; unlockAudio(); talk(hero, bubble, [`ui/${helloKey}`], helloText); };
  setTimeout(() => { if (navigator.userActivation?.hasBeenActive) greet(); }, 500);
  let tapN = 0;
  hero.onclick = () => {
    unlockAudio(); sfx.pop(); pose(hero, 'jump', 1100);
    if (!greeted) return greet();
    const k = `tapLula${1 + (tapN++ % 3)}`;
    talk(hero, bubble, [`ui/${k}`], UI[k]);
  };
  app.querySelector('.play')?.addEventListener('click', () => {
    unlockAudio(); sfx.pop();
    if (!prog.seenStory) storyIntro(); else go(PATH[nextIndex()]);
  });
  app.querySelector('.map')?.addEventListener('click', () => { unlockAudio(); sfx.pop(); map(); });
  app.querySelector('.play-colors')?.addEventListener('click', () => { unlockAudio(); sfx.pop(); colorsMap(); });
  app.querySelectorAll('.play-world').forEach((b) => (b.onclick = () => { unlockAudio(); sfx.pop(); worldMap(ALL_WORLDS.find((W) => W.id === b.dataset.w)); }));
  const albumBtn = app.querySelector('.album'); if (albumBtn) albumBtn.onclick = () => { unlockAudio(); sfx.pop(); album(); };
  app.querySelector('.lang-switch').onclick = () => { sfx.pop(); langSelect(); };
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
  app.querySelector('.skip').onclick = () => { skipped = true; stop(); prog.seenStory = true; save(); go(PATH[nextIndex()]); };
  const slides = [['story1', 'wave'], ['story2', 'think'], ['story3', 'oops'], ['story4', 'jump']];
  for (const [k, p] of slides) {
    if (skipped) return;
    scr.dataset.slide = k;
    setBase(hero, p);
    if (k === 'story3') sfx.whoosh();
    await talk(hero, bubble, [`ui/${k}`], UI[k]);
    await wait(400);
  }
  if (!skipped) { prog.seenStory = true; save(); go(PATH[nextIndex()]); }
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
  const here = nextIndex();
  let li = 0;
  const nodes = PATH.map((it, i) => {
    const x = it.type === 'review' ? 50 : 50 + Math.sin(li++ * 0.9) * 26;
    const st = isDone(it) ? 'done' : i <= cur ? 'open' : 'locked';
    const stars = it.type === 'letter' ? prog.done[it.id] || 0 : (prog.reviews || {})[it.id] || 0;
    return { it, i, x, st, stars };
  });
  const nodeHTML = (n) => n.it.type === 'review' ? `
              <button class="node review ${n.st} ${n.i === here && n.st !== 'done' ? 'current' : ''}" data-i="${n.i}" style="--x:${n.x}%" aria-label="חזרה">
                <span class="ch">${n.st === 'locked' ? '🔒' : '🔁'}</span>
                <span class="review-letters">${n.it.letters.map((l) => l.ch).join(' ')}</span>
                ${n.st === 'done' ? `<span class="node-stars">${'⭐'.repeat(n.stars)}</span>` : ''}
              </button>` : `
              <button class="node ${n.st} ${n.i === here && n.st !== 'done' ? 'current' : ''}" data-i="${n.i}" style="--x:${n.x}%">
                <span class="ch">${n.st === 'locked' ? '🔒' : n.it.l.ch}</span>
                ${n.st === 'done' ? `<span class="node-stars">${'⭐'.repeat(n.stars)}</span>` : ''}
                ${n.st !== 'locked' ? friendHTML(n.it.l, 'node-friend') : ''}
              </button>`;
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
          <div class="path">${nodes.filter((n) => n.it.l.region === r.id).map(nodeHTML).join('')}</div>
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
  if (doneCount() === LETTERS.length && walkTo === PATH.length - 1) { confetti(120); say('ui/theEnd'); }
  else say('ui/map');
  app.querySelectorAll('.node').forEach((b) => (b.onclick = () => {
    const i = +b.dataset.i;
    if (b.classList.contains('locked')) { sfx.boop(); b.classList.add('nope'); setTimeout(() => b.classList.remove('nope'), 400); return; }
    sfx.pop(); stop();
    pose(hero, 'walk');
    place(i, true);
    setTimeout(() => go(PATH[i]), 1000);
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
      <h3 class="album-title">חַבְרֵי הָאוֹתִיּוֹת</h3>
      ${LETTERS.map((l) => `
        <button class="album-card ${prog.done[l.id] ? 'got' : 'missing'}" data-id="${l.id}">
          ${friendHTML(l, 'album-pic')}
          <span class="album-letter">${l.ch}</span>
          <span class="album-name">${prog.done[l.id] ? l.friend.name : '?'}</span>
        </button>`).join('')}
      <h3 class="album-title">טִפּוֹת הַצֶּבַע</h3>
      ${COLORS.map((c) => `
        <button class="album-card ${cprog().done[c.id] ? 'got' : 'missing'}" data-cid="${c.id}">
          ${dropHTML(c, 'album-pic')}
          <span class="album-letter" style="color:${c.hex === '#ffffff' ? '#999' : c.hex}">●</span>
          <span class="album-name">${cprog().done[c.id] ? `טִפָּה ${c.f}` : '?'}</span>
        </button>`).join('')}
    </div>
  </section>`;
  autoFit(app.querySelector('.album-grid'));
  app.querySelector('.home').onclick = home;
  say('ui/album');
  app.querySelectorAll('.album-card').forEach((b) => (b.onclick = () => {
    if (b.dataset.cid) {
      if (!cprog().done[b.dataset.cid]) { sfx.boop(); return; }
      sfx.pop(); b.classList.remove('boing'); void b.offsetWidth; b.classList.add('boing');
      say(`C/${b.dataset.cid}/friend1`); return;
    }
    const l = LETTERS.find((x) => x.id === b.dataset.id);
    if (!prog.done[l.id]) { sfx.boop(); return; }
    sfx.pop(); b.classList.remove('boing'); void b.offsetWidth; b.classList.add('boing');
    say(`L/${l.id}/friend1`);
  }));
}

// ---------- שלב של אות ----------
// ---------- מנוע השלבים: משותף לאותיות ולצבעים ----------
async function runStages(o) {
  stop();
  const stages = o.stages;
  const visible = stages.filter((s) => !s.interlude);
  app.innerHTML = `
  <section class="screen level-screen ${o.cls || ''}" style="${o.bg}">
    <header class="level-head">
      <button class="btn round home" aria-label="למפה">🗺️</button>
      <div class="letter-chip">${o.chip}</div>
      <button class="btn round back" aria-label="לשלב הקודם">➡️</button>
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
  const backBtn = scr.querySelector('.back');
  autoFit(scr.querySelector('.stage-body'));
  setBase(hero, 'wave');
  let mistakes = 0;
  let aborted = false;
  let curStage = 'story';
  const ctx = {
    ...o.extra,
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
    mistake: () => { mistakes++; P.recordWrong(prog, o.statId, curStage); save(); },
    right: () => { P.recordRight(prog, o.statId); save(); },
    stars: () => (mistakes <= 2 ? 3 : mistakes <= 6 ? 2 : 1),
    complete: (stars) => { o.complete(stars); save(); },
  };
  scr.querySelector('.home').onclick = () => { aborted = true; stop(); o.exit(); };
  let skip = null;
  let back = null;
  if (DEV) scr.querySelector('.skip').onclick = () => skip && skip();
  backBtn.onclick = () => { sfx.pop(); back && back(); };
  let i = 0;
  while (i < stages.length) {
    if (aborted) return;
    const st = stages[i];
    const vi = stages.slice(0, i).filter((x) => !x.interlude).length;
    scr.querySelectorAll('.steps i').forEach((d, k) => { d.classList.toggle('on', k < vi); d.classList.toggle('cur', k === vi); });
    backBtn.disabled = i === 0;
    showBubble(bubble, '');
    ctx.foot.replaceChildren();
    scr.dataset.stage = st.key;
    curStage = st.key.startsWith('word') ? 'word' : st.key.startsWith('cThing') ? 'cThing' : st.key;
    ctx.body.className = `stage-body st-${st.key}`;
    ctx.body.innerHTML = '';
    setBase(hero, st.pose || 'wave');
    const nav = await Promise.race([
      st.run(ctx).then(() => 'next'),
      new Promise((r) => { skip = () => r('next'); back = () => r('back'); }),
    ]);
    if (aborted || !document.body.contains(scr)) return;
    stop();
    if (nav === 'back') { let j = i - 1; while (j > 0 && stages[j].interlude) j--; i = Math.max(0, j); }
    else i++;
  }
  o.finish();
}

// ---------- שלב של אות ----------
function level(l, review = null) {
  const region = regionOf(l);
  const pathIndex = PATH.findIndex((it) => it.id === (review ? review.id : l.id));
  const since = review ? Date.now() : P.startLetter(prog, l.id);
  save();
  const starsBefore = P.totalStars(prog);
  return runStages({
    bg: regionBG(region.id, region.sky),
    chip: review ? '🔁' : l.ch,
    cls: review ? 'is-review' : '',
    stages: review ? REVIEW_STAGES : STAGES,
    statId: review ? review.id : l.id,
    extra: {
      l,
      letters: review ? review.letters : [l],
      lines: letterLines(l),
      scoreHTML: () => celebrateScore(starsBefore),
      friendHTML: (cls) => friendHTML(l, cls),
    },
    complete: (stars) => {
      if (review) { prog.reviews ||= {}; prog.reviews[review.id] = Math.max(prog.reviews[review.id] || 0, stars); }
      else { P.completeLetter(prog, l.id, stars); P.recordTime(prog, l.id, since); }
    },
    exit: () => { if (!review) P.recordTime(prog, l.id, since); save(); map(); },
    finish: () => map(Math.min(PATH.length - 1, pathIndex + 1)),
  });
}

// =====================================================================
// עולמות נוספים (גדול וקטן, איפה זה?, אנגלית, חיות): מפה, סיפור ותחנות
// =====================================================================
const wprog = (W) => { prog.worlds ||= {}; return (prog.worlds[W.id] ||= { done: {} }); };
const wDone = (W, st) => !!wprog(W).done[st.id];
const wNext = (W) => { const i = W.stations.findIndex((st) => !wDone(W, st)); return i === -1 ? W.stations.length - 1 : i; };
const wCount = (W) => W.stations.filter((st) => wDone(W, st)).length;
const wPic = (src, cls = '') => `<span class="fpic ${cls}"><img src="${src}" alt="" draggable="false" onerror="this.parentNode.classList.add('noimg')"><span class="emo">⭐</span></span>`;

async function worldStory(W) {
  app.innerHTML = `
  <section class="screen story-screen world-story" style="${regionBG(W.bg)}">
    <div class="story-stage">
      <div class="story-friend">${wPic(W.friend, 'friend-big')}</div>
      <div class="story-hero">${heroHTML('wave', 'xl')}<div class="bubble-anchor"></div></div>
    </div>
    <button class="btn small skip">דַּלְּגוּ ⏭</button>
  </section>`;
  const hero = app.querySelector('.hero');
  const bubble = app.querySelector('.bubble-anchor');
  let skipped = false;
  const end = () => { wprog(W).seen = true; save(); worldMap(W); };
  app.querySelector('.skip').onclick = () => { skipped = true; stop(); end(); };
  for (const sl of W.story) {
    if (skipped) return;
    setBase(hero, sl.pose);
    await talk(hero, bubble, [sl.clip], sl.text);
    await wait(400);
  }
  if (!skipped) end();
}

function worldMap(W, walkTo = null) {
  stop();
  if (!wprog(W).seen && walkTo == null) return worldStory(W);
  const here = wNext(W);
  const unlocked = DEV || prog.all ? W.stations.length - 1 : here;
  app.innerHTML = `
  <section class="screen map-screen world-map" style="${regionBG(W.bg)}">
    <header class="map-head">
      <button class="btn round home" aria-label="בית">🏠</button>
      <div class="bag-count">${W.icon} ${wCount(W)}/${W.stations.length}</div>
      <h2 class="wm-title">${W.title}</h2>
    </header>
    <div class="map-scroll">
      <div class="path wpath">
        ${W.stations.map((st, i) => {
          const s0 = wDone(W, st) ? 'done' : i <= unlocked ? 'open' : 'locked';
          const x = st.review ? 50 : 50 + Math.sin(i * 0.9) * 24;
          const stars = wprog(W).done[st.id] || 0;
          return `<button class="node wnode ${st.review ? 'review' : ''} ${s0} ${i === here && s0 !== 'done' ? 'current' : ''}" data-i="${i}" style="--x:${x}%">
            <span class="ch">${s0 === 'locked' ? '🔒' : st.chip}</span>
            <span class="review-letters">${st.title}</span>
            ${s0 === 'done' ? `<span class="node-stars">${'⭐'.repeat(stars)}</span>` : ''}</button>`;
        }).join('')}
      </div>
      <div class="map-end">${wCount(W) === W.stations.length ? `${wPic(W.friend, 'end-drop')} כָּל הַכָּבוֹד!` : '🏁'}</div>
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
    const nr = node.getBoundingClientRect(); const sr = scroller.getBoundingClientRect();
    const side = nr.left - sr.left > sr.width / 2 ? -1 : 1;
    lulaBox.style.transition = smooth ? 'left 1.1s ease-in-out, top 1.1s ease-in-out' : 'none';
    lulaBox.style.left = `${nr.left - sr.left + nr.width / 2 + side * (nr.width * 1.1)}px`;
    lulaBox.style.top = `${nr.top - sr.top + scroller.scrollTop + nr.height}px`;
  };
  const start = walkTo != null ? Math.max(0, walkTo - 1) : here;
  requestAnimationFrame(() => {
    app.querySelector(`.node[data-i="${start}"]`)?.scrollIntoView({ block: 'center' });
    place(start, false);
    if (walkTo != null && walkTo !== start) setTimeout(() => { pose(hero, 'walk'); place(walkTo, true); setTimeout(() => pose(hero, 'wave'), 1300); }, 500);
  });
  if (wCount(W) === W.stations.length && walkTo === W.stations.length - 1) confetti(150);
  app.querySelectorAll('.node').forEach((b) => (b.onclick = () => {
    if (b.classList.contains('locked')) { sfx.boop(); b.classList.add('nope'); setTimeout(() => b.classList.remove('nope'), 400); return; }
    sfx.pop(); stop(); const i = +b.dataset.i;
    pose(hero, 'walk'); place(i, true);
    setTimeout(() => worldLevel(W, i), 900);
  }));
}

function worldLevel(W, idx) {
  const st = W.stations[idx];
  return runStages({
    bg: regionBG(st.bg || W.bg),
    chip: st.chip,
    cls: `world-${W.id} ${st.review ? 'is-review' : ''}`,
    stages: st.stages(),
    statId: `${W.id}-${st.id}`,
    extra: { worldId: W.id },
    complete: (stars) => { const p = wprog(W); p.done[st.id] = Math.max(p.done[st.id] || 0, stars); },
    exit: () => { save(); worldMap(W); },
    finish: () => worldMap(W, Math.min(W.stations.length - 1, idx + 1)),
  });
}

// =====================================================================
// עולם הצבעים
// =====================================================================
const CPATH = [];
COLORS.forEach((c, i) => {
  CPATH.push({ type: 'color', id: `c-${c.id}`, c });
  if (COLOR_REVIEW_AFTER.includes(c.id)) {
    const done = COLORS.slice(0, i + 1);
    CPATH.push({ type: 'review', id: `c-review-${c.id}`, c, colors: done.slice(-4) });
  }
});
const cprog = () => (prog.colors ||= { done: {}, reviews: {} });
const cIsDone = (it) => (it.type === 'color' ? !!cprog().done[it.c.id] : !!cprog().reviews[it.id]);
const cNext = () => { const i = CPATH.findIndex((it) => !cIsDone(it)); return i === -1 ? CPATH.length - 1 : i; };
const colorsDone = () => Object.keys(cprog().done).length;
const colorStars = () => Object.values(cprog().done).reduce((a, b) => a + b, 0);
const dropHTML = (c, cls = '') => `<span class="fpic ${cls}"><img src="img/colors/${c.id}.webp" alt="" draggable="false" onerror="this.parentNode.classList.add('noimg')"><span class="emo">🎨</span></span>`;
// העולם אפור בהתחלה, ומקבל צבע עם כל צבע שחוזר
const worldBG = () => `background-image:url(img/regions/colors.webp), linear-gradient(180deg,#d9c8ff,#fbefff);filter:grayscale(${Math.max(0, 1 - colorsDone() / COLORS.length).toFixed(2)})`;

function colorLevel(it) {
  const c = it.c;
  const review = it.type === 'review';
  const idx = CPATH.indexOf(it);
  return runStages({
    bg: 'background-image:url(img/regions/colors.webp), linear-gradient(180deg,#d9c8ff,#fbefff)',
    chip: review ? '🔁' : `<span class="chip-dot" style="background:${c.hex}"></span>`,
    cls: `colors-level ${review ? 'is-review' : ''}`,
    stages: review ? COLOR_REVIEW_STAGES : colorStages(c),
    statId: it.id,
    extra: {
      color: c,
      colors: review ? it.colors : [c],
      clines: colorLines(c),
      friendHTML: (cls) => dropHTML(c, cls),
      scoreHTML: () => `<div class="cele-score"><span>🎨 ${colorsDone() + (cprog().done[c.id] ? 0 : 1)}/${COLORS.length}</span></div>`,
    },
    complete: (stars) => {
      const p = cprog();
      if (review) p.reviews[it.id] = Math.max(p.reviews[it.id] || 0, stars);
      else p.done[c.id] = Math.max(p.done[c.id] || 0, stars);
    },
    exit: () => { save(); colorsMap(); },
    finish: () => colorsMap(Math.min(CPATH.length - 1, idx + 1)),
  });
}

async function colorsStory() {
  app.innerHTML = `
  <section class="screen story-screen colors-story">
    <div class="cworld" style="${worldBG().replace(/filter:[^;]*$/, 'filter:grayscale(0)')}"></div>
    <img class="story-cloud" src="img/colors/cloud.webp" alt="">
    <div class="story-stage">
      <div class="story-hero">${heroHTML('wave', 'xl')}<div class="bubble-anchor"></div></div>
    </div>
    <button class="btn small skip">דַּלְּגוּ ⏭</button>
  </section>`;
  const scr = app.querySelector('.colors-story');
  const hero = app.querySelector('.hero');
  const bubble = app.querySelector('.bubble-anchor');
  let skipped = false;
  const end = () => { cprog().seenStory = true; save(); colorsMap(); };
  app.querySelector('.skip').onclick = () => { skipped = true; stop(); end(); };
  const slides = [['cStory1', 'wave'], ['cStory2', 'oops'], ['cStory3', 'think'], ['cStory4', 'jump']];
  for (const [k, p] of slides) {
    if (skipped) return;
    scr.dataset.slide = k;
    setBase(hero, p);
    if (k === 'cStory2') sfx.whoosh();
    await talk(hero, bubble, [`ui/${k}`], CUI[k]);
    await wait(400);
  }
  if (!skipped) end();
}

function colorsMap(walkTo = null) {
  stop();
  if (!cprog().seenStory && walkTo == null) return colorsStory();
  const here = cNext();
  const unlocked = DEV || prog.all ? CPATH.length - 1 : here;
  app.innerHTML = `
  <section class="screen map-screen colors-map">
    <header class="map-head">
      <button class="btn round home" aria-label="בית">🏠</button>
      <div class="bag-count">🎨 ${colorsDone()}/${COLORS.length}</div>
      <div class="rainbow-meter">${COLORS.map((c) => `<i style="background:${cprog().done[c.id] ? c.hex : '#ccc'}"></i>`).join('')}</div>
    </header>
    <div class="map-scroll">
      <div class="cworld-bg" style="${worldBG()}"></div>
      <div class="path cpath">
        ${CPATH.map((it, i) => {
          const st = cIsDone(it) ? 'done' : i <= unlocked ? 'open' : 'locked';
          const x = it.type === 'review' ? 50 : 50 + Math.sin(i * 0.9) * 24;
          const stars = it.type === 'color' ? cprog().done[it.c.id] || 0 : cprog().reviews[it.id] || 0;
          if (it.type === 'review') return `<button class="node review ${st} ${i === here && st !== 'done' ? 'current' : ''}" data-i="${i}" style="--x:${x}%"><span class="ch">${st === 'locked' ? '🔒' : '🔁'}</span><span class="review-letters">${it.colors.map((c) => `<b style="background:${c.hex}"></b>`).join('')}</span>${st === 'done' ? `<span class="node-stars">${'⭐'.repeat(stars)}</span>` : ''}</button>`;
          return `<button class="node cnode ${st} ${i === here && st !== 'done' ? 'current' : ''}" data-i="${i}" style="--x:${x}%;--c:${st === 'locked' ? '#bbb' : it.c.hex}">
            <span class="ch">${st === 'locked' ? '🔒' : ''}</span>
            ${st === 'done' ? `<span class="node-stars">${'⭐'.repeat(stars)}</span>` : ''}
            ${st !== 'locked' ? dropHTML(it.c, 'node-friend') : ''}</button>`;
        }).join('')}
      </div>
      <div class="map-end">${colorsDone() === COLORS.length ? `${dropHTML({ id: 'rainbow' }, 'end-drop')} הַקֶּשֶׁת חָזְרָה!` : '🌈 הַקֶּשֶׁת מְחַכָּה'}</div>
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
    const nr = node.getBoundingClientRect(); const sr = scroller.getBoundingClientRect();
    const side = nr.left - sr.left > sr.width / 2 ? -1 : 1;
    lulaBox.style.transition = smooth ? 'left 1.1s ease-in-out, top 1.1s ease-in-out' : 'none';
    lulaBox.style.left = `${nr.left - sr.left + nr.width / 2 + side * (nr.width * 0.9)}px`;
    lulaBox.style.top = `${nr.top - sr.top + scroller.scrollTop + nr.height}px`;
  };
  const start = walkTo != null ? Math.max(0, walkTo - 1) : here;
  requestAnimationFrame(() => {
    app.querySelector(`.node[data-i="${start}"]`)?.scrollIntoView({ block: 'center' });
    place(start, false);
    if (walkTo != null && walkTo !== start) setTimeout(() => { pose(hero, 'walk'); place(walkTo, true); setTimeout(() => pose(hero, 'wave'), 1300); }, 500);
  });
  if (colorsDone() === COLORS.length && walkTo === CPATH.length - 1) { confetti(150); say('ui/cTheEnd'); }
  else say(walkTo == null ? 'ui/cWelcome' : 'ui/cMap');
  app.querySelectorAll('.node').forEach((b) => (b.onclick = () => {
    if (b.classList.contains('locked')) { sfx.boop(); b.classList.add('nope'); setTimeout(() => b.classList.remove('nope'), 400); return; }
    sfx.pop(); stop(); const i = +b.dataset.i;
    pose(hero, 'walk'); place(i, true);
    setTimeout(() => colorLevel(CPATH[i]), 900);
  }));
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
        <div class="rep-card"><small>תחנות חזרה</small><b>🔁 ${Object.keys(prog.reviews || {}).length}/${PATH.filter((x) => x.type === 'review').length}</b><span>חזרה על האותיות האחרונות</span></div>
        <div class="rep-card"><small>זמן משחק</small><b>${o.minutes} דק׳</b><span>${prog.lastPlayed ? 'שוחק לאחרונה ' + fmtDate(prog.lastPlayed) : 'עוד לא שוחק'}</span></div>
      </div>

      <h3>כל האותיות</h3>
      <div class="rep-legend"><span class="great">מצוין</span><span class="ok">טוב</span><span class="weak">כדאי לחזור</span><span class="started">התחיל</span><span class="none">עוד לא</span></div>
      <div class="rep-grid">${LETTERS.map(cell).join('')}</div>

      <h3>עולם הצבעים</h3>
      <div class="rep-grid">${COLORS.map((c) => { const st = cprog().done[c.id] || 0; const s = prog.stats[`c-${c.id}`]; const acc = P.accuracy(s);
        return `<div class="rep-cell ${!st ? (s ? 'started' : 'none') : st === 3 ? 'great' : st === 2 ? 'ok' : 'weak'}"><b><i class="rep-dot" style="background:${c.hex}"></i></b><span>${c.m}</span><span class="rep-stars">${st ? '⭐'.repeat(st) : ''}</span>${acc != null ? `<span class="rep-acc">${acc}%</span>` : ''}</div>`; }).join('')}</div>
      <p>צבעים שהוחזרו: ${colorsDone()}/${COLORS.length}, כוכבים בצבעים: ${colorStars()}/${COLORS.length * 3}.</p>

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
    try { await navigator.clipboard.writeText(t.value); msg(tr('הקוד הועתק')); } catch { t.select(); document.execCommand('copy'); msg(tr('הקוד הועתק')); }
  };
  $('.load').onclick = () => {
    try {
      const p = P.importCode($('.rep-import').value);
      if (!confirm(tr('לטעון את ההתקדמות מהקוד? ההתקדמות הנוכחית בדפדפן הזה תוחלף.'))) return;
      prog = p; save(); report();
    } catch { msg(tr('הקוד לא תקין')); }
  };
  $('.reset').onclick = () => {
    if (!confirm(tr('למחוק את כל ההתקדמות? אי אפשר לבטל את זה.'))) return;
    prog = P.resetProgress(); save(); report();
  };
}

home();
