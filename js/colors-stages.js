// שלבי עולם הצבעים. כל צבע עובר: סיפור, ערבוב (לצבעים משניים), הכרות, דברים בצבע,
// "אותו דבר בהרבה צבעים", איפה הצבע, מיון, צביעת העולם, בועות וחגיגה.
import { COLORS, COLOR_BY_ID, parseThing } from './colors-data.js';
import { sfx } from './audio.js';
import { ok } from './qa.js';
import { continueBtn, good, bad, shuffle, pick, wait } from './stages.js';

const C = (id) => `C/${id}`;
const nameOf = (c) => `${C(c.id)}/name`;
const things = (c) => c.things.map((s, i) => ({ ...parseThing(s), c, i }));
const thingClip = (t) => `${C(t.c.id)}/t${t.i}`;
const others = (c, n, preferNear = false) => {
  const pool = COLORS.filter((x) => x.id !== c.id);
  const near = preferNear ? (c.near || []).map((id) => COLOR_BY_ID[id]) : [];
  const rest = shuffle(pool.filter((x) => !near.includes(x)));
  return [...near, ...rest].slice(0, n);
};

// ---------- ציורים ----------
export const splashSVG = (hex, cls = '') => `<svg class="splash ${cls}" viewBox="0 0 200 200" aria-hidden="true">
  <path d="M100 18c20 0 26 18 42 22s34-4 38 14-14 26-10 42 22 28 10 44-30 4-44 14-16 30-36 28-20-24-36-30-34 6-42-10 10-28 6-44-24-24-14-40 32-6 44-18 22-22 42-22z" fill="${hex}" stroke="rgba(0,0,0,.18)" stroke-width="3"/>
  <ellipse cx="72" cy="66" rx="16" ry="10" fill="rgba(255,255,255,.45)" transform="rotate(-30 72 66)"/></svg>`;

const SHAPES = {
  balloon: (h) => `<svg viewBox="0 0 100 150"><path d="M50 108 q-8 18 0 38" stroke="#777" fill="none" stroke-width="2"/><path d="M50 98 l-7 10 h14z" fill="${h}" stroke="rgba(0,0,0,.2)"/><ellipse cx="50" cy="52" rx="38" ry="47" fill="${h}" stroke="rgba(0,0,0,.2)" stroke-width="2"/><ellipse cx="36" cy="34" rx="9" ry="15" fill="rgba(255,255,255,.45)"/></svg>`,
  star: (h) => `<svg viewBox="0 0 100 100"><path d="M50 6l13 27 30 4-22 21 5 30-26-14-26 14 5-30L7 37l30-4z" fill="${h}" stroke="rgba(0,0,0,.2)" stroke-width="2" stroke-linejoin="round"/><ellipse cx="42" cy="34" rx="6" ry="9" fill="rgba(255,255,255,.4)"/></svg>`,
  heart: (h) => `<svg viewBox="0 0 100 92"><path d="M50 88S6 60 6 30C6 14 18 4 31 4c9 0 15 5 19 12 4-7 10-12 19-12 13 0 25 10 25 26 0 30-44 58-44 58z" fill="${h}" stroke="rgba(0,0,0,.2)" stroke-width="2"/><ellipse cx="28" cy="26" rx="7" ry="10" fill="rgba(255,255,255,.4)"/></svg>`,
  ball: (h) => `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="${h}" stroke="rgba(0,0,0,.2)" stroke-width="2"/><ellipse cx="34" cy="32" rx="10" ry="14" fill="rgba(255,255,255,.45)"/></svg>`,
};
const pot = (c, extra = '') => `<button class="pot" style="--c:${c.hex}" data-id="${c.id}"${extra} aria-label="${c.m}"><span class="pot-paint"></span><span class="pot-jar"></span></button>`;
const colorWord = (c, txt) => `<span class="cword" style="--c:${c.hex}">${txt}</span>`;
// מדגיש את מילת הצבע בצירוף (תַּפּוּחַ אָדֹם)
const thingHTML = (t) => {
  const parts = t.w.split(' ');
  const last = parts.pop();
  return `${parts.join(' ')} ${colorWord(t.c, last)}`;
};

// ---------- 1. סיפור: טיפת הצבע יוצאת מהענן האפור ----------
async function cStory(ctx) {
  const { color: c, clines } = ctx;
  ctx.body.innerHTML = `
    <div class="story-scene c-story">
      <img class="gray-cloud" src="img/colors/cloud.webp" alt="">
      <div class="friend-wrap pop-in">${ctx.friendHTML('friend-big')}<div class="friend-bubble"></div></div>
    </div>`;
  ctx.screen.querySelector('.side-hero').classList.add('walk-in');
  ctx.base('walk');
  await wait(1600);
  ctx.base('wave');
  const fw = ctx.body.querySelector('.friend-wrap'); const fb = ctx.body.querySelector('.friend-bubble');
  fw.classList.add('talking');
  ctx.body.querySelector('.gray-cloud').classList.add('fly-away');
  sfx.whoosh();
  fb.innerHTML = `<div class="speech friend">${clines.friend1}</div>`;
  await ctx.say(`${C(c.id)}/friend1`);
  fb.innerHTML = `<div class="speech friend">${clines.friend2}</div>`;
  await ctx.say(`${C(c.id)}/friend2`);
  fw.classList.remove('talking'); fb.innerHTML = '';
  await continueBtn(ctx, 'כֵּן! נַעֲזֹר לָךְ!');
}

// ---------- 2. מעבדת ערבוב: קודם מנחשים, אחר כך מערבבים ----------
async function cMix(ctx) {
  const { color: c, clines } = ctx;
  const [a, b] = c.mix.map((id) => COLOR_BY_ID[id]);
  const opts = shuffle([c, ...others(c, 8).filter((x) => x !== a && x !== b).slice(0, 2)]);
  ctx.body.innerHTML = `
    <div class="mix-lab">
      <div class="mix-row">${splashSVG(a.hex, 'mix-a')}<span class="mix-plus">+</span>${splashSVG(b.hex, 'mix-b')}<span class="mix-plus">=</span>
        <button class="bowl" aria-label="קערה"><span class="bowl-paint"></span><span class="bowl-q">?</span></button></div>
      <div class="guess-row">${opts.map((o) => pot(o, ok(o === c))).join('')}</div>
    </div>`;
  ctx.bubble(clines.mixQ);
  await ctx.talk(`${C(c.id)}/mixQ`);
  ctx.bubble(ctx.textOf('ui/cInsGuess'));
  await ctx.talk('ui/cInsGuess');
  // ניחוש: לא נכון ולא לא נכון, זו השערה. בודקים אותה בערבוב.
  await new Promise((res) => ctx.body.querySelectorAll('.guess-row .pot').forEach((p) => (p.onclick = () => {
    sfx.pop(); ctx.body.querySelectorAll('.guess-row .pot').forEach((x) => x.classList.toggle('picked', x === p));
    res();
  })));
  const bowl = ctx.body.querySelector('.bowl');
  bowl.classList.add('pulse');
  ctx.bubble(ctx.textOf('ui/cInsMix'));
  ctx.talk('ui/cInsMix');
  await new Promise((res) => (bowl.onclick = res));
  bowl.classList.remove('pulse');
  ctx.body.querySelector('.mix-lab').classList.add('mixing');
  sfx.whoosh();
  await wait(1200);
  bowl.style.setProperty('--c', c.hex);
  bowl.classList.add('filled');
  sfx.tada();
  ctx.confettiSmall();
  ctx.pose('jump', 1300);
  const picked = ctx.body.querySelector('.guess-row .pot.picked');
  ctx.body.querySelectorAll('.guess-row .pot').forEach((x) => x.classList.toggle('right', x.dataset.id === c.id));
  if (picked?.dataset.id === c.id) ctx.right();
  ctx.bubble(`${clines.mixA}`);
  await ctx.talk(`${C(c.id)}/mixA`);
  await continueBtn(ctx);
}

// ---------- 3. הכרות עם הצבע ----------
async function cMeet(ctx) {
  const { color: c, clines } = ctx;
  ctx.body.innerHTML = `<button class="big-splash shine" aria-label="${c.m}">${splashSVG(c.hex)}</button>
    <div class="letter-name">${colorWord(c, c.m)}</div>`;
  const b = ctx.body.querySelector('.big-splash');
  ctx.bubble(ctx.textOf('ui/cInsMeet'));
  await ctx.talk('ui/cInsMeet');
  let heard = false; let done; const p = new Promise((r) => (done = r));
  b.onclick = async () => {
    b.classList.remove('boing'); void b.offsetWidth; b.classList.add('boing'); sfx.pop();
    ctx.bubble(clines.intro);
    await ctx.talk(`${C(c.id)}/intro`);
    if (!heard) { heard = true; await continueBtn(ctx); done(); }
  };
  return p;
}

// ---------- 4. דברים בצבע (שם העצם ואחריו הצבע) ----------
function cThing(i) {
  return async (ctx) => {
    const t = things(ctx.color)[i];
    if (!t) return;
    ctx.body.innerHTML = `<button class="word-card flip-in"><div class="pic">${t.e}</div><div class="word">${thingHTML(t)}</div></button>`;
    const card = ctx.body.querySelector('.word-card');
    ctx.bubble(`<span class="big">${thingHTML(t)}</span>`);
    if (i === 0) await ctx.talk('ui/cInsThing');
    await ctx.talk(thingClip(t));
    card.onclick = () => { card.classList.remove('boing'); void card.offsetWidth; card.classList.add('boing'); ctx.talk(thingClip(t)); };
    await continueBtn(ctx);
  };
}

// ---------- 5. אותו דבר בהרבה צבעים: איזה מהם אדום? ----------
async function cSameThing(ctx) {
  const { color: c, clines } = ctx;
  const shapes = shuffle(Object.keys(SHAPES)).slice(0, 3);
  ctx.bubble(ctx.textOf('ui/cInsNotOnly'));
  await ctx.talk('ui/cInsNotOnly');
  for (let round = 0; round < 3; round++) {
    const opts = shuffle([c, ...others(c, 2, round > 0)]);
    const sh = SHAPES[shapes[round]];
    ctx.body.innerHTML = `<div class="choices shapes">${opts.map((o) => `<button class="choice shape" data-id="${o.id}"${ok(o === c)}>${sh(o.hex)}</button>`).join('')}</div>
      <div class="round-dots">${[0, 1, 2].map((k) => `<i class="${k < round ? 'on' : ''}"></i>`).join('')}</div>`;
    ctx.bubble(clines.which);
    ctx.talk(`${C(c.id)}/which`);
    await new Promise((res) => ctx.body.querySelectorAll('.choice').forEach((b) => (b.onclick = async () => {
      if (b.dataset.id === c.id) { b.classList.add('right'); await good(ctx); res(); }
      else { b.classList.add('wrong'); await bad(ctx); b.classList.remove('wrong'); ctx.talk(`${C(c.id)}/which`); }
    })));
  }
}

// ---------- 6. איפה הצבע? (מצבעים רחוקים לקרובים) ----------
async function cWhere(ctx) {
  const { color: c, clines } = ctx;
  for (let round = 0; round < 3; round++) {
    const opts = shuffle([c, ...others(c, round === 0 ? 2 : 3, round === 2)]);
    ctx.body.innerHTML = `<div class="pots">${opts.map((o) => pot(o, ok(o === c))).join('')}</div>
      <div class="round-dots">${[0, 1, 2].map((k) => `<i class="${k < round ? 'on' : ''}"></i>`).join('')}</div>`;
    ctx.bubble(clines.where);
    ctx.talk(`${C(c.id)}/where`);
    await new Promise((res) => ctx.body.querySelectorAll('.pot').forEach((b) => (b.onclick = async () => {
      if (b.dataset.id === c.id) { b.classList.add('right'); sfx.pop(); await good(ctx); res(); }
      else { b.classList.add('wrong'); await bad(ctx); b.classList.remove('wrong'); ctx.talk(`${C(c.id)}/where`); }
    })));
  }
}

// ---------- 7. מיון: גְּעוּ בְּכָל הַדְּבָרִים הָאֲדֻמִּים ----------
async function cPick(ctx) {
  const { color: c, clines } = ctx;
  const mine = pick(things(c), 3);
  const foreign = others(c, 3).map((o) => pick(things(o), 1)[0]);
  const items = shuffle([...mine, ...foreign]);
  ctx.body.innerHTML = `<div class="pick-grid">${items.map((t, k) => `<button class="pick-item" data-k="${k}"${ok(t.c === c)}>${t.e}</button>`).join('')}</div>
    <div class="basket" style="--c:${c.hex}"><span class="basket-fill"></span>🧺<b>0/3</b></div>`;
  ctx.bubble(clines.pick);
  ctx.talk(`${C(c.id)}/pick`);
  let got = 0;
  await new Promise((res) => ctx.body.querySelectorAll('.pick-item').forEach((b) => (b.onclick = async () => {
    if (b.classList.contains('done')) return;
    const t = items[+b.dataset.k];
    if (t.c === c) {
      b.classList.add('done'); sfx.ding(); ctx.talk(thingClip(t)); got++; ctx.right();
      ctx.body.querySelector('.basket b').textContent = `${got}/3`;
      if (got === 3) { await wait(900); await good(ctx); res(); }
    } else { b.classList.add('wrong'); ctx.mistake(); sfx.boop(); setTimeout(() => b.classList.remove('wrong'), 450); }
  })));
}

// ---------- 8. צובעים את העולם: תמונות אפורות מקבלות צבע ----------
async function cPaint(ctx) {
  const { color: c } = ctx;
  const ts = things(c).slice(0, 4);
  ctx.body.innerHTML = `<div class="paint-grid">${ts.map((t, k) => `<button class="paint-item tap-me" data-k="${k}"><span class="pic">${t.e}</span><span class="cap">${thingHTML(t)}</span></button>`).join('')}</div>`;
  ctx.bubble(ctx.textOf('ui/cInsPaint'));
  ctx.talk('ui/cInsPaint');
  let left = ts.length;
  await new Promise((res) => ctx.body.querySelectorAll('.paint-item').forEach((b) => (b.onclick = async () => {
    if (b.classList.contains('done')) return;
    b.classList.add('done'); b.style.setProperty('--c', c.hex); sfx.pop(); ctx.confettiSmall();
    ctx.talk(thingClip(ts[+b.dataset.k]));
    if (--left === 0) { await wait(1300); res(); }
  })));
  await continueBtn(ctx);
}

// ---------- 9. בועות בצבע ----------
async function cBubbles(ctx) {
  const { color: c, clines } = ctx;
  const need = 5; let got = 0;
  ctx.body.innerHTML = `<div class="bubble-field"></div><div class="counter">${'⚪'.repeat(need)}</div>`;
  const field = ctx.body.querySelector('.bubble-field');
  const counter = ctx.body.querySelector('.counter');
  ctx.bubble(clines.bubbles);
  ctx.talk(`${C(c.id)}/bubbles`);
  const pool = others(c, 4, true);
  let resolve; const out = new Promise((r) => (resolve = r));
  let alive = true; const LANES = 5; let last = [];
  const spawn = () => {
    if (!alive || !field.isConnected) return;
    const free = [...Array(LANES).keys()].filter((k) => !last.includes(k));
    const lane = free[Math.floor(Math.random() * free.length)]; last = [...last.slice(-2), lane];
    const isT = Math.random() < 0.45;
    const col = isT ? c : pool[Math.floor(Math.random() * pool.length)];
    const b = document.createElement('button');
    b.className = 'bubble cbubble';
    if (col === c) b.setAttribute('data-target', '1');
    if (ok(col === c)) b.setAttribute('data-ok', '1');
    b.style.cssText = `--x:${2 + lane * 21}%;--d:${6 + Math.random() * 3}s;--c:${col.hex}`;
    b.onclick = async () => {
      if (b.classList.contains('popped')) return;
      if (col === c) {
        b.classList.add('popped'); sfx.pop(); got++;
        counter.textContent = '🟣'.repeat(got) + '⚪'.repeat(need - got);
        if (got === need) { alive = false; await good(ctx); field.replaceChildren(); await continueBtn(ctx); resolve(); }
      } else { b.classList.add('nope'); ctx.mistake(); sfx.boop(); setTimeout(() => b.classList.remove('nope'), 400); }
    };
    b.addEventListener('animationend', () => b.remove());
    field.append(b);
    setTimeout(spawn, 900);
  };
  spawn();
  return out;
}

// ---------- 10. חגיגה: הצבע חוזר לעולם ----------
async function cCelebrate(ctx) {
  const { color: c, clines } = ctx;
  const stars = ctx.stars();
  ctx.complete(stars);
  ctx.body.innerHTML = `<div class="celebrate">
      <div class="c-return">${ctx.friendHTML('return-drop')}${splashSVG(c.hex, 'return-splash')}</div>
      ${ctx.scoreHTML ? ctx.scoreHTML() : ''}
      <div class="stars">${[1, 2, 3].map((s) => `<span class="${s <= stars ? 'on' : ''}" style="--i:${s}">⭐</span>`).join('')}</div>
    </div>`;
  ctx.base('jump');
  ctx.confettiBig();
  sfx.tada();
  ctx.bubble(clines.done);
  await ctx.talk(`${C(c.id)}/done`);
  await continueBtn(ctx, 'חוֹזְרִים לַמַּפָּה');
}

function interlude(key) {
  return async (ctx) => {
    ctx.base('talk');
    ctx.bubble(ctx.textOf(`ui/${key}`));
    await ctx.talk(`ui/${key}`);
    ctx.base('jump');
    await continueBtn(ctx, 'כֵּן! בּוֹאִי!');
  };
}

export function colorStages(c) {
  const n = Math.min(4, c.things.length);
  return [
    { key: 'cStory', icon: '📖', run: cStory },
    ...(c.mix ? [{ key: 'cMix', icon: '🧪', pose: 'think', run: cMix }] : []),
    { key: 'cMeet', icon: '🎨', run: cMeet },
    ...[...Array(n).keys()].map((i) => ({ key: `cThing${i}`, icon: '🖼️', run: cThing(i) })),
    { key: 'talkColor', interlude: true, pose: 'talk', run: interlude('cTalkPlay') },
    { key: 'cSame', icon: '🎈', run: cSameThing },
    { key: 'cWhere', icon: '🫙', run: cWhere },
    { key: 'cPick', icon: '🧺', run: cPick },
    { key: 'cPaint', icon: '🖌️', run: cPaint },
    { key: 'cBubbles', icon: '🫧', run: cBubbles },
    { key: 'cDone', icon: '🏆', pose: 'jump', run: cCelebrate },
  ];
}

// =====================================================================
// תחנת חזרה על צבעים
// =====================================================================
async function crIntro(ctx) {
  ctx.base('talk');
  ctx.bubble(ctx.textOf('ui/cReviewIntro'));
  await ctx.talk('ui/cReviewIntro');
  await continueBtn(ctx, 'בּוֹאוּ!');
}

async function crWhere(ctx) {
  const set = ctx.colors;
  const order = shuffle([...set, ...set]).slice(0, 4);
  for (let round = 0; round < order.length; round++) {
    const c = order[round];
    ctx.body.innerHTML = `<div class="pots">${shuffle(set).map((o) => pot(o, ok(o === c))).join('')}</div>
      <div class="round-dots">${order.map((_, k) => `<i class="${k < round ? 'on' : ''}"></i>`).join('')}</div>`;
    ctx.bubble(`אֵיפֹה הַצֶּבַע ${c.def}?`);
    ctx.talk(`${C(c.id)}/where`);
    await new Promise((res) => ctx.body.querySelectorAll('.pot').forEach((b) => (b.onclick = async () => {
      if (b.dataset.id === c.id) { b.classList.add('right'); await good(ctx); res(); }
      else { b.classList.add('wrong'); await bad(ctx); b.classList.remove('wrong'); ctx.talk(`${C(c.id)}/where`); }
    })));
  }
}

// מיון לסלים: מתאימים חפץ לסל בצבע שלו (התאמה, בלי לשמוע את התשובה)
async function crSort(ctx) {
  const set = ctx.colors;
  const items = shuffle(set.flatMap((c) => pick(things(c), 2))).slice(0, 6);
  ctx.bubble(ctx.textOf('ui/cInsSort'));
  await ctx.talk('ui/cInsSort');
  for (let round = 0; round < items.length; round++) {
    const t = items[round];
    ctx.body.innerHTML = `<div class="sort-item pop-in">${t.e}</div>
      <div class="baskets">${set.map((c) => `<button class="basket-btn" style="--c:${c.hex}" data-id="${c.id}"${ok(c === t.c)}>🧺</button>`).join('')}</div>
      <div class="round-dots">${items.map((_, k) => `<i class="${k < round ? 'on' : ''}"></i>`).join('')}</div>`;
    await new Promise((res) => ctx.body.querySelectorAll('.basket-btn').forEach((b) => (b.onclick = async () => {
      if (b.dataset.id === t.c.id) { b.classList.add('right'); ctx.talk(thingClip(t)); ctx.right(); sfx.ding(); ctx.pose('jump', 900); await wait(1100); res(); }
      else { b.classList.add('wrong'); await bad(ctx); b.classList.remove('wrong'); }
    })));
  }
}

async function crDone(ctx) {
  const stars = ctx.stars();
  ctx.complete(stars);
  ctx.body.innerHTML = `<div class="celebrate"><div class="review-banner">${ctx.colors.map((c, k) => `<span style="--k:${k};background:${c.hex}"></span>`).join('')}</div>
    <div class="stars">${[1, 2, 3].map((s) => `<span class="${s <= stars ? 'on' : ''}" style="--i:${s}">⭐</span>`).join('')}</div></div>`;
  ctx.base('jump'); ctx.confettiBig(); sfx.tada();
  ctx.bubble(ctx.textOf('ui/cReviewDone'));
  await ctx.talk('ui/cReviewDone');
  await continueBtn(ctx, 'חוֹזְרִים לַמַּפָּה');
}

export const COLOR_REVIEW_STAGES = [
  { key: 'talkCReview', interlude: true, pose: 'talk', run: crIntro },
  { key: 'crWhere', icon: '🫙', run: crWhere },
  { key: 'crSort', icon: '🧺', run: crSort },
  { key: 'crDone', icon: '🏆', pose: 'jump', run: crDone },
];
