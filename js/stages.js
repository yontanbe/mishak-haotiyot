// 19 השלבים של כל אות. כל שלב הוא פונקציה אסינכרונית שמסתיימת כשהילד סיים אותו.
import { LETTERS, REGIONS, letterLines, parseWord } from './data.js';
import { sfx, stop } from './audio.js';
import { ok, QA } from './qa.js';
import { IS_AR, clipPath } from './i18n.js';
import { AR_ALPHABET, AR_NON_JOINING } from './ar/letters.js';

const $ = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const shuffle = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (a, n) => shuffle(a).slice(0, n);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export const graphemes = (w) => w.match(/[א-ת][֑-ׇ]*|[\u0621-\u064A][\u064B-\u0652\u0670]*|./gu) || [];

const ALL_WORDS = LETTERS.flatMap((l) => l.words.map((s, i) => ({ ...parseWord(s), letter: l, i })));
const ANY_LETTERS = IS_AR ? AR_ALPHABET : 'אבגדהוזחטיכלמנסעפצקרשת'.split('');
// האות וצורותיה האחרות (באלף: أ ا إ آ), כדי שלא יופיעו כמסיחים
const sameLetter = (l, c) => c === l.ch || c === l.base || (l.alts || []).includes(c);

// מילה מוצגת עם האות הנלמדת צבועה (ראשונה, או אחרונה באות סופית)
export function wordHTML(l, w) {
  const g = graphemes(w);
  const idx = l.final ? g.length - 1 : 0;
  return g.map((x, i) => (i === idx ? `<span class="hl">${x}</span>` : x)).join('');
}

// מילים שאינן מתאימות לאות (מסיחים)
function distractors(l, n, avoidEmoji = []) {
  const ok = ALL_WORDS.filter((x) => {
    const c = l.final ? x.plain.at(-1) : x.plain[0];
    return !sameLetter(l, c) && x.letter.id !== l.id && !avoidEmoji.includes(x.e);
  });
  const res = []; const seen = new Set(avoidEmoji);
  for (const x of shuffle(ok)) { if (!seen.has(x.e)) { seen.add(x.e); res.push(x); } if (res.length === n) break; }
  return res;
}

const ownWords = (l) => l.words.map((s, i) => ({ ...parseWord(s), letter: l, i }));
const clip = (x) => `L/${x.letter.id}/w${x.i}`;

// ---------- כלים משותפים ----------
function continueBtn(ctx, label = 'מַמְשִׁיכִים') {
  return new Promise((res) => {
    const b = $(`<button class="btn go pulse">${label} <span class="arrow">◀</span></button>`);
    ctx.foot.replaceChildren(b);
    b.onclick = () => { sfx.pop(); stop(); ctx.foot.replaceChildren(); res(); };
  });
}

function bubbleText(ctx, text) {
  ctx.bubble(text);
}

async function good(ctx) {
  ctx.right?.();
  ctx.lulaReact('happy');
  sfx.ding();
  ctx.confettiSmall();
  await ctx.talk(`ui/praise${1 + Math.floor(Math.random() * 6)}`);
}
async function bad(ctx) {
  ctx.mistake();
  ctx.lulaReact('oops');
  sfx.boop();
  await ctx.talk(`ui/try${1 + Math.floor(Math.random() * 3)}`);
}

// ---------- 1. סיפור: פוגשים חבר ----------
async function story(ctx) {
  const { l, lines } = ctx;
  const region = REGIONS.find((r) => r.id === l.region);
  ctx.body.innerHTML = `
    <div class="story-scene">
      <div class="friend-wrap pop-in">${ctx.friendHTML('friend-big')}<div class="friend-bubble"></div></div>
      <div class="lost-letter">${l.ch}</div>
    </div>`;
  ctx.screen.querySelector('.side-hero').classList.add('walk-in');
  ctx.base('walk');
  bubbleText(ctx, region.arrive);
  await ctx.talk(`region/${region.id}`);
  ctx.base('wave');
  if (l.final && l.id === 'kaf-sofit') { bubbleText(ctx, ctx.textOf('ui/finalsIntro')); await ctx.talk('ui/finalsIntro'); }
  const fw = ctx.body.querySelector('.friend-wrap'); const fb = ctx.body.querySelector('.friend-bubble'); fw.classList.add('talking'); ctx.bubble('');
  fb.innerHTML = `<div class="speech friend">${lines.friend1}</div>`;
  await ctx.say(`L/${l.id}/friend1`);
  fb.innerHTML = `<div class="speech friend">${lines.friend2}</div>`;
  ctx.body.querySelector('.lost-letter').classList.add('show');
  sfx.whoosh();
  await ctx.say(`L/${l.id}/friend2`);
  fw.classList.remove('talking'); fb.innerHTML = '';
  bubbleText(ctx, ctx.textOf('ui/letsLearn'));
  ctx.talk('ui/letsLearn');
  await continueBtn(ctx, 'בּוֹאוּ נִלְמַד!');
}

// ---------- 2. הכרות עם האות ----------
async function meetLetter(ctx) {
  const { l, lines } = ctx;
  ctx.body.innerHTML = `<button class="giant-letter shine" aria-label="${l.name}">${l.ch}</button>
    <div class="letter-name">${l.name}</div>`;
  const b = ctx.body.querySelector('.giant-letter');
  bubbleText(ctx, ctx.textOf('ui/insLetter'));
  await ctx.talk('ui/insLetter');
  let heard = false;
  const play = async () => {
    b.classList.remove('boing'); void b.offsetWidth; b.classList.add('boing');
    bubbleText(ctx, lines.intro);
    await ctx.talk(`L/${l.id}/name`, `L/${l.id}/intro`);
    if (!heard) { heard = true; await continueBtn(ctx); done(); }
  };
  let done; const p = new Promise((r) => (done = r));
  b.onclick = play;
  return p;
}

// ---------- 3. צלילים (הברות) ----------
async function syllables(ctx) {
  const { l } = ctx;
  ctx.body.innerHTML = `<div class="syl-row">${l.syl.map((s) => `<div class="syl">${s}</div>`).join('')}</div>
    <button class="btn round again" aria-label="שוב">🔊</button>`;
  const els = [...ctx.body.querySelectorAll('.syl')];
  bubbleText(ctx, ctx.textOf('ui/insSyl'));
  await ctx.talk('ui/insSyl');
  const run = async () => {
    const a = new Audio(`audio/${clipPath(`L/${l.id}/syl`)}.mp3`);
    if (QA) { a.playbackRate = 12; a.muted = true; }
    let dur = 0;
    a.onloadedmetadata = () => (dur = a.duration);
    const tick = () => {
      if (a.paused && a.currentTime > 0) { els.forEach((e) => e.classList.remove('on')); return; }
      const d = dur || els.length * 1.1;
      const i = Math.min(els.length - 1, Math.floor((a.currentTime / d) * els.length));
      els.forEach((e, k) => e.classList.toggle('on', k === i));
      requestAnimationFrame(tick);
    };
    a.onended = () => els.forEach((e) => e.classList.remove('on'));
    try { await a.play(); requestAnimationFrame(tick); } catch {
      for (const e of els) { e.classList.add('on'); await wait(700); e.classList.remove('on'); }
    }
    await new Promise((r) => { a.onended = () => { els.forEach((e) => e.classList.remove('on')); r(); }; a.onerror = r; setTimeout(r, 9000); });
  };
  ctx.body.querySelector('.again').onclick = run;
  els.forEach((e) => (e.onclick = () => { sfx.pop(); e.classList.add('boing'); setTimeout(() => e.classList.remove('boing'), 400); }));
  await run();
  await continueBtn(ctx);
}

// ---------- 4. ציור האות באצבע ----------
async function trace(ctx) {
  const { l } = ctx;
  ctx.body.innerHTML = `<div class="trace-wrap"><canvas class="trace" width="600" height="600"></canvas>
    <div class="trace-meter"><div></div></div></div>
    <button class="btn small clear">🧽 מוֹחֲקִים</button>`;
  const cv = ctx.body.querySelector('canvas');
  const g = cv.getContext('2d');
  const meter = ctx.body.querySelector('.trace-meter div');
  const font = IS_AR ? '700 400px "Noto Naskh Arabic", serif' : '700 470px "Noto Sans Hebrew", "Varela Round", sans-serif';
  try { await document.fonts.load(font, l.ch); } catch {}
  const mask = document.createElement('canvas'); mask.width = mask.height = 600;
  const m = mask.getContext('2d');
  const drawLetter = (c, style) => { c.font = font; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = style; c.fillText(l.ch, 300, l.final ? 280 : 320); };
  drawLetter(m, '#000');
  const md = m.getImageData(0, 0, 600, 600).data;
  const maskIdx = []; for (let i = 0; i < md.length; i += 4 * 9) if (md[i + 3] > 128) maskIdx.push(i);
  const paint = document.createElement('canvas'); paint.width = paint.height = 600;
  const p = paint.getContext('2d');

  const render = () => {
    g.clearRect(0, 0, 600, 600);
    drawLetter(g, 'rgba(143,92,240,.16)');
    g.save(); g.setLineDash([14, 12]); g.lineWidth = 4; g.strokeStyle = 'rgba(143,92,240,.55)';
    g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.strokeText(l.ch, 300, l.final ? 280 : 320); g.restore();
    g.drawImage(paint, 0, 0);
  };
  render();
  bubbleText(ctx, ctx.textOf('ui/insTrace'));
  ctx.talk('ui/insTrace');

  let drawing = false; let last = null; let finished = false;
  const pos = (e) => { const r = cv.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * 600, ((e.clientY - r.top) / r.height) * 600]; };
  const hue = () => (Date.now() / 8) % 360;
  const coverage = () => {
    const d = p.getImageData(0, 0, 600, 600).data;
    let hit = 0; for (const i of maskIdx) if (d[i + 3] > 0) hit++;
    return hit / maskIdx.length;
  };
  let resolve; const out = new Promise((r) => (resolve = r));
  const check = async () => {
    const c = coverage();
    meter.style.width = `${Math.min(100, (c / 0.6) * 100)}%`;
    if (c > 0.6 && !finished) {
      finished = true;
      cv.classList.add('glow');
      await good(ctx);
      await continueBtn(ctx);
      resolve();
    }
  };
  cv.onpointerdown = (e) => { drawing = true; last = pos(e); cv.setPointerCapture(e.pointerId); sfx.step(); };
  cv.onpointermove = (e) => {
    if (!drawing) return;
    const q = pos(e);
    p.strokeStyle = `hsl(${hue()},85%,58%)`; p.lineWidth = 46; p.lineCap = 'round'; p.lineJoin = 'round';
    p.beginPath(); p.moveTo(...last); p.lineTo(...q); p.stroke();
    last = q; render();
  };
  const up = () => { if (drawing) { drawing = false; check(); } };
  cv.onpointerup = up; cv.onpointercancel = up; cv.onpointerleave = up;
  ctx.body.querySelector('.clear').onclick = () => { p.clearRect(0, 0, 600, 600); render(); meter.style.width = '0'; };
  return out;
}

// ---------- 5 עד 10. מילה חדשה ----------
function wordCard(i) {
  return async (ctx) => {
    const { l } = ctx;
    const x = ownWords(l)[i];
    ctx.body.innerHTML = `<button class="word-card flip-in"><div class="pic">${x.e}</div><div class="word">${wordHTML(l, x.w)}</div></button>
      <div class="hint-small">מִלָּה ${i + 1} מִתּוֹךְ 6</div>`;
    const card = ctx.body.querySelector('.word-card');
    bubbleText(ctx, `<span class="big">${wordHTML(l, x.w)}</span>`);
    if (i === 0) await ctx.talk('ui/insWord');
    await ctx.talk(`L/${l.id}/s${i}`);
    card.onclick = () => { card.classList.remove('boing'); void card.offsetWidth; card.classList.add('boing'); ctx.talk(`L/${l.id}/w${i}`); };
    await continueBtn(ctx);
  };
}

// ---------- 11. בועות ----------
async function bubbles(ctx) {
  const { l } = ctx;
  const need = 5; let got = 0;
  ctx.body.innerHTML = `<div class="bubble-field"></div><div class="counter">${'⚪'.repeat(need)}</div>`;
  const field = ctx.body.querySelector('.bubble-field');
  const counter = ctx.body.querySelector('.counter');
  bubbleText(ctx, `${ctx.textOf('ui/insBubbles')} <b class="hl">${l.ch}</b>`);
  ctx.talk('ui/insBubbles', `L/${l.id}/name`);
  const others = ANY_LETTERS.filter((c) => !sameLetter(l, c));
  let resolve; const out = new Promise((r) => (resolve = r));
  let alive = true;
  // נתיבים קבועים כדי שבועות לא יעלו אחת על השנייה
  const LANES = 5; let lastLanes = [];
  const spawn = () => {
    if (!alive || !field.isConnected) return;
    const free = [...Array(LANES).keys()].filter((k) => !lastLanes.includes(k));
    const lane = free[Math.floor(Math.random() * free.length)];
    lastLanes = [...lastLanes.slice(-2), lane];
    const isT = Math.random() < 0.42;
    const ch = isT ? l.ch : others[Math.floor(Math.random() * others.length)];
    const b = $(`<button class="bubble" style="--x:${2 + lane * (88 / (LANES - 1)) * 0.92}%;--d:${6 + Math.random() * 3}s;--h:${Math.floor(Math.random() * 360)}">${ch}</button>`);
    b.onclick = async () => {
      if (b.classList.contains('popped')) return;
      if (ch === l.ch) {
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

// ---------- 12. איזו תמונה מתחילה באות ----------
async function whichStarts(ctx) {
  const { l } = ctx;
  const mine = pick(ownWords(l), 3);
  for (let round = 0; round < 3; round++) {
    const t = mine[round];
    const opts = shuffle([t, ...distractors(l, 2, [t.e])]);
    ctx.body.innerHTML = `<div class="choices">${opts.map((o, k) => `<button class="choice" data-k="${k}"${ok(o === t)}><div class="pic">${o.e}</div><div class="cap">${o.w}</div></button>`).join('')}</div>
      <div class="round-dots">${[0, 1, 2].map((k) => `<i class="${k < round ? 'on' : ''}"></i>`).join('')}</div>`;
    const ins = l.final ? 'ui/insWhichEnd' : 'ui/insWhich';
    bubbleText(ctx, `${ctx.textOf(ins)} <b class="hl">${l.ch}</b>?`);
    ctx.talk(ins, `L/${l.id}/name`);
    await new Promise((res) => {
      ctx.body.querySelectorAll('.choice').forEach((b) => (b.onclick = async () => {
        const o = opts[+b.dataset.k];
        ctx.talk(clip(o));
        if (o === t) { b.classList.add('right'); await wait(700); await good(ctx); res(); }
        else { b.classList.add('wrong'); await wait(700); await bad(ctx); b.classList.remove('wrong'); }
      }));
    });
  }
}

// ---------- 13. שומעים ובוחרים ----------
async function listenChoose(ctx) {
  const { l } = ctx;
  const mine = pick(ownWords(l), 3);
  for (let round = 0; round < 3; round++) {
    const t = mine[round];
    const opts = shuffle([t, ...distractors(l, 2, [t.e])]);
    ctx.body.innerHTML = `<button class="btn round listen pulse" aria-label="שמיעה">🔊</button>
      <div class="choices">${opts.map((o, k) => `<button class="choice" data-k="${k}"${ok(o === t)}><div class="pic">${o.e}</div></button>`).join('')}</div>
      <div class="round-dots">${[0, 1, 2].map((k) => `<i class="${k < round ? 'on' : ''}"></i>`).join('')}</div>`;
    bubbleText(ctx, ctx.textOf('ui/insListen'));
    if (round === 0) await ctx.talk('ui/insListen');
    ctx.talk(clip(t));
    ctx.body.querySelector('.listen').onclick = () => ctx.talk(clip(t));
    await new Promise((res) => {
      ctx.body.querySelectorAll('.choice').forEach((b) => (b.onclick = async () => {
        const o = opts[+b.dataset.k];
        if (o === t) { b.classList.add('right'); b.insertAdjacentHTML('beforeend', `<div class="cap">${wordHTML(l, o.w)}</div>`); await good(ctx); res(); }
        else { b.classList.add('wrong'); await bad(ctx); b.classList.remove('wrong'); ctx.talk(clip(t)); }
      }));
    });
  }
}

// ---------- 14. מחפשים את האותיות שהתחבאו ----------
async function hidden(ctx) {
  const { l } = ctx;
  const region = REGIONS.find((r) => r.id === l.region);
  const total = 12; const targets = 4;
  const others = ANY_LETTERS.filter((c) => !sameLetter(l, c));
  const cells = shuffle([...Array(total)].map((_, i) => (i < targets ? l.ch : others[Math.floor(Math.random() * others.length)])));
  ctx.body.innerHTML = `<div class="hide-field">${cells.map((c, i) => `
      <button class="hide-spot" style="--r:${Math.floor(Math.random() * 16) - 8}deg">
        <span class="hidden-letter">${c}</span><span class="cover">${region.deco[i % region.deco.length]}</span>
      </button>`).join('')}</div>
    <div class="counter">${'🔍'.repeat(targets)}</div>`;
  const counter = ctx.body.querySelector('.counter');
  bubbleText(ctx, `${ctx.textOf('ui/insHidden')} <b class="hl">${l.ch}</b>`);
  ctx.talk('ui/insHidden', `L/${l.id}/name`);
  let found = 0;
  await new Promise((res) => {
    ctx.body.querySelectorAll('.hide-spot').forEach((b, i) => (b.onclick = async () => {
      if (b.classList.contains('open')) return;
      b.classList.add('open'); sfx.flip();
      if (cells[i] === l.ch) {
        found++; b.classList.add('found'); sfx.ding();
        counter.textContent = '⭐'.repeat(found) + '🔍'.repeat(targets - found);
        if (found === targets) { await wait(400); await good(ctx); res(); }
      } else { setTimeout(() => b.classList.remove('open'), 900); }
    }));
  });
  await continueBtn(ctx);
}

// ---------- 15. זיכרון: תמונה ומילה ----------
async function memory(ctx) {
  const { l } = ctx;
  const ws = pick(ownWords(l), 3);
  const cards = shuffle(ws.flatMap((x, k) => [{ k, kind: 'pic', x }, { k, kind: 'word', x }]));
  ctx.body.innerHTML = `<div class="memory">${cards.map((c, i) => `
    <button class="mcard" data-i="${i}" data-k="${c.k}"><span class="back">❓</span><span class="front ${c.kind}">${c.kind === 'pic' ? c.x.e : wordHTML(l, c.x.w)}</span></button>`).join('')}</div>`;
  bubbleText(ctx, ctx.textOf('ui/insMemory'));
  ctx.talk('ui/insMemory');
  let open = []; let matched = 0; let lock = false;
  await new Promise((res) => {
    ctx.body.querySelectorAll('.mcard').forEach((b) => (b.onclick = async () => {
      if (lock || b.classList.contains('up')) return;
      const c = cards[+b.dataset.i];
      b.classList.add('up'); sfx.flip();
      if (c.kind === 'pic') ctx.talk(clip(c.x));
      open.push([b, c]);
      if (open.length === 2) {
        lock = true;
        const [[b1, c1], [b2, c2]] = open; open = [];
        if (c1.k === c2.k) {
          b1.classList.add('match'); b2.classList.add('match'); matched++;
          await wait(300); ctx.talk(clip(c1.x)); sfx.ding(); await wait(900);
          if (matched === 3) { await good(ctx); res(); }
        } else { await wait(1000); b1.classList.remove('up'); b2.classList.remove('up'); }
        lock = false;
      }
    }));
  });
  await continueBtn(ctx);
}

// ---------- 16. איזו אות חסרה ----------
async function build(ctx) {
  const { l } = ctx;
  const ws = pick(ownWords(l).filter((x) => graphemes(x.w).length > 1), 3);
  const others = ANY_LETTERS.filter((c) => !sameLetter(l, c));
  for (let round = 0; round < ws.length; round++) {
    const x = ws[round];
    const g = graphemes(x.w);
    const idx = l.final ? g.length - 1 : 0;
    const shown = g.map((s, i) => (i === idx ? '<span class="slot">?</span>' : s)).join('');
    const tiles = shuffle([l.ch, ...pick(others, 2)]);
    ctx.body.innerHTML = `<div class="build"><div class="pic big">${x.e}</div><div class="word">${shown}</div>
      <div class="tiles">${tiles.map((t) => `<button class="tile"${ok(t === l.ch)}>${t}</button>`).join('')}</div></div>
      <div class="round-dots">${ws.map((_, k) => `<i class="${k < round ? 'on' : ''}"></i>`).join('')}</div>`;
    bubbleText(ctx, ctx.textOf('ui/insBuild'));
    if (round === 0) await ctx.talk('ui/insBuild');
    ctx.talk(clip(x));
    await new Promise((res) => {
      ctx.body.querySelectorAll('.tile').forEach((b) => (b.onclick = async () => {
        if (b.textContent === l.ch) {
          b.classList.add('right');
          const slot = ctx.body.querySelector('.slot');
          slot.textContent = g[idx]; slot.classList.add('filled');
          ctx.talk(clip(x)); await wait(900); await good(ctx); res();
        } else { b.classList.add('wrong'); await bad(ctx); b.classList.remove('wrong'); }
      }));
    });
  }
}

// ---------- 17. כן או לא ----------
async function yesNo(ctx) {
  const { l } = ctx;
  const items = shuffle([...pick(ownWords(l), 2).map((x) => ({ x, yes: true })), ...distractors(l, 2).map((x) => ({ x, yes: false }))]);
  bubbleText(ctx, ctx.textOf(`L/${l.id}/yesno`));
  for (let round = 0; round < items.length; round++) {
    const it = items[round];
    ctx.body.innerHTML = `<div class="yn"><button class="pic big hear">${it.x.e}</button><div class="cap">${it.x.w}</div>
      <div class="yn-btns"><button class="btn yes"${ok(it.yes)}>👍 כֵּן</button><button class="btn no"${ok(!it.yes)}>👎 לֹא</button></div></div>
      <div class="round-dots">${items.map((_, k) => `<i class="${k < round ? 'on' : ''}"></i>`).join('')}</div>`;
    if (round === 0) await ctx.talk(`L/${l.id}/yesno`);
    ctx.talk(clip(it.x));
    ctx.body.querySelector('.hear').onclick = () => ctx.talk(clip(it.x));
    await new Promise((res) => {
      const answer = async (v) => {
        if (v === it.yes) { await good(ctx); res(); } else await bad(ctx);
      };
      ctx.body.querySelector('.yes').onclick = () => answer(true);
      ctx.body.querySelector('.no').onclick = () => answer(false);
    });
  }
}

// ---------- 18. מסיבת מילים ----------
async function party(ctx) {
  const { l } = ctx;
  const ws = ownWords(l);
  ctx.body.innerHTML = `<div class="party">${ws.map((x, k) => `
    <button class="balloon" style="--h:${(k * 53) % 360};--t:${(k % 3) * 0.4}s"><span class="pic">${x.e}</span><span class="cap">${wordHTML(l, x.w)}</span></button>`).join('')}</div>`;
  bubbleText(ctx, ctx.textOf('ui/insParty'));
  ctx.talk('ui/insParty');
  ctx.lulaReact('dance');
  let left = ws.length;
  await new Promise((res) => {
    ctx.body.querySelectorAll('.balloon').forEach((b, k) => (b.onclick = async () => {
      if (b.classList.contains('done')) return;
      b.classList.add('done'); sfx.pop(); ctx.talk(clip(ws[k])); ctx.confettiSmall();
      if (--left === 0) { await wait(1200); res(); }
    }));
  });
  await continueBtn(ctx);
}

// ---------- 19. חגיגה: האות חוזרת לתיק ----------
async function celebrate(ctx) {
  const { l, lines } = ctx;
  const stars = ctx.stars();
  ctx.body.innerHTML = `<div class="celebrate">
      <div class="fly-letter">${l.ch}</div>
      <div class="stars">${[1, 2, 3].map((s) => `<span class="${s <= stars ? 'on' : ''}" style="--i:${s}">⭐</span>`).join('')}</div>
      <div class="sticker">${ctx.friendHTML('sticker-pic')}<span>${l.friend.name} הִצְטָרֵף לָאַלְבּוֹם!</span></div>
    </div>`;
  ctx.complete(stars);
  ctx.body.querySelector('.celebrate .stars').insertAdjacentHTML('beforebegin', ctx.scoreHTML?.() || '');
  ctx.base('jump');
  ctx.confettiBig();
  sfx.tada();
  bubbleText(ctx, lines.done);
  await ctx.talk(`L/${l.id}/done`);
  await continueBtn(ctx, 'חוֹזְרִים לַמַּפָּה');
}

// ---------- ערבית בלבד: צורות האות בתחילת מילה, באמצע, בסוף, ולבד ----------
const T = '\u0640'; // תַּטְוִיל: הקו המחבר
async function forms(ctx) {
  const { l } = ctx;
  const joins = !AR_NON_JOINING.has(l.ch);
  const list = joins
    ? [[`${l.ch}${T}`, 'فِي أَوَّلِ الْكَلِمَةِ'], [`${T}${l.ch}${T}`, 'فِي وَسَطِ الْكَلِمَةِ'], [`${T}${l.ch}`, 'فِي آخِرِ الْكَلِمَةِ'], [l.ch, 'وَحْدَهُ']]
    : [[l.ch, 'وَحْدَهُ'], [`${T}${l.ch}`, 'فِي آخِرِ الْكَلِمَةِ']];
  ctx.body.innerHTML = `<div class="forms-row">${list.map(([f, cap]) => `<button class="form-card tap-me"><span class="form-ch">${f}</span><small>${cap}</small></button>`).join('')}</div>`;
  const key = joins ? 'ui/insForms' : 'ui/insForms2';
  bubbleText(ctx, ctx.textOf(key));
  ctx.talk(key);
  let left = list.length;
  await new Promise((res) => ctx.body.querySelectorAll('.form-card').forEach((b) => (b.onclick = async () => {
    b.classList.remove('boing'); void b.offsetWidth; b.classList.add('boing'); sfx.pop();
    if (!b.classList.contains('done')) { b.classList.add('done'); b.classList.remove('tap-me'); left--; }
    await ctx.talk(`L/${l.id}/name`);
    if (left === 0) res();
  })));
  await continueBtn(ctx);
}

// ---------- הפסקה: לולה מדברת ישירות אל הילד ----------
function interlude(key) {
  return async (ctx) => {
    ctx.base('talk');
    ctx.bubble(ctx.textOf(`ui/${key}`));
    await ctx.talk(`ui/${key}`);
    ctx.base('jump');
    await continueBtn(ctx, 'כֵּן! בּוֹאִי!');
  };
}

export const STAGES = [
  { key: 'story', icon: '📖', run: story },
  { key: 'letter', icon: '🔤', run: meetLetter },
  { key: 'syl', icon: '🎵', run: syllables },
  { key: 'trace', icon: '✏️', pose: 'think', run: trace },
  ...(IS_AR ? [{ key: 'forms', icon: '🔠', run: forms }] : []),
  ...[0, 1, 2, 3, 4, 5].map((i) => ({ key: `word${i}`, icon: '🖼️', run: wordCard(i) })),
  { key: 'talkPlay', interlude: true, pose: 'talk', run: interlude('talkPlay') },
  { key: 'bubbles', icon: '🫧', run: bubbles },
  { key: 'which', icon: '🤔', run: whichStarts },
  { key: 'listen', icon: '👂', run: listenChoose },
  { key: 'talkHelp', interlude: true, pose: 'talk', run: interlude('talkHelp') },
  { key: 'hidden', icon: '🔍', run: hidden },
  { key: 'memory', icon: '🃏', run: memory },
  { key: 'build', icon: '🧩', run: build },
  { key: 'yesno', icon: '👍', run: yesNo },
  { key: 'talkFast', interlude: true, pose: 'talk', run: interlude('talkFast') },
  { key: 'party', icon: '🎈', run: party },
  { key: 'celebrate', icon: '🏆', pose: 'jump', run: celebrate },
];

// =====================================================================
// תחנת חזרה: משחקים על כמה אותיות אחרונות ביחד
// =====================================================================
const rvWord = (l) => { const ws = ownWords(l); return ws[Math.floor(Math.random() * ws.length)]; };
const tilesHTML = (letters, t) => `<div class="tiles big-tiles">${letters.map((x) => `<button class="tile" data-id="${x.id}"${ok(x === t)}>${x.ch}</button>`).join('')}</div>`;

async function reviewIntro(ctx) {
  ctx.base('talk');
  ctx.body.innerHTML = `<div class="review-banner">${ctx.letters.map((x, k) => `<span style="--k:${k}">${x.ch}</span>`).join('')}</div>`;
  ctx.bubble(ctx.textOf('ui/reviewIntro'));
  await ctx.talk('ui/reviewIntro');
  await continueBtn(ctx, 'בּוֹאוּ!');
}

// שומעים שם של אות ומוצאים אותה
async function rvFindLetter(ctx) {
  const set = ctx.letters;
  const order = shuffle([...set, ...set]).slice(0, 4);
  for (let round = 0; round < order.length; round++) {
    const t = order[round];
    ctx.body.innerHTML = `${tilesHTML(shuffle(set), t)}<div class="round-dots">${order.map((_, k) => `<i class="${k < round ? 'on' : ''}"></i>`).join('')}</div>`;
    ctx.bubble(`${ctx.textOf('ui/insFindLetter')} <b class="hl">${t.name}</b>?`);
    ctx.talk('ui/insFindLetter', `L/${t.id}/name`);
    await new Promise((res) => {
      ctx.body.querySelectorAll('.tile').forEach((b) => (b.onclick = async () => {
        if (b.dataset.id === t.id) { b.classList.add('right'); await good(ctx); res(); }
        else { b.classList.add('wrong'); await bad(ctx); b.classList.remove('wrong'); ctx.talk(`L/${t.id}/name`); }
      }));
    });
  }
}

// שומעים מילה ובוחרים באיזו אות היא מתחילה (או נגמרת)
async function rvWhichLetter(ctx) {
  const set = ctx.letters;
  const order = shuffle([...set, ...set]).slice(0, 4);
  for (let round = 0; round < order.length; round++) {
    const t = order[round];
    const x = rvWord(t);
    const ins = t.final ? 'ui/insLastLetter' : 'ui/insFirstLetter';
    ctx.body.innerHTML = `<button class="pic big hear">${x.e}</button>${tilesHTML(shuffle(set), t)}
      <div class="round-dots">${order.map((_, k) => `<i class="${k < round ? 'on' : ''}"></i>`).join('')}</div>`;
    ctx.bubble(ctx.textOf(ins));
    await ctx.talk(ins);
    ctx.talk(clip(x));
    ctx.body.querySelector('.hear').onclick = () => ctx.talk(clip(x));
    await new Promise((res) => {
      ctx.body.querySelectorAll('.tile').forEach((b) => (b.onclick = async () => {
        if (b.dataset.id === t.id) {
          b.classList.add('right');
          ctx.body.querySelector('.hear').insertAdjacentHTML('afterend', `<div class="rv-word">${wordHTML(t, x.w)}</div>`);
          await good(ctx); res();
        } else { b.classList.add('wrong'); await bad(ctx); b.classList.remove('wrong'); ctx.talk(clip(x)); }
      }));
    });
  }
}

// זיכרון: אות ותמונה שמתאימה לה
async function rvMatch(ctx) {
  const set = pick(ctx.letters, Math.min(4, ctx.letters.length));
  const pairs = set.map((t, k) => ({ k, t, x: rvWord(t) }));
  const cards = shuffle(pairs.flatMap((p) => [{ ...p, kind: 'letter' }, { ...p, kind: 'pic' }]));
  ctx.body.innerHTML = `<div class="memory ${cards.length > 6 ? 'm8' : ''}">${cards.map((c, i) => `
    <button class="mcard" data-i="${i}" data-k="${c.k}"><span class="back">❓</span><span class="front ${c.kind === 'letter' ? 'letter' : 'pic'}">${c.kind === 'letter' ? c.t.ch : c.x.e}</span></button>`).join('')}</div>`;
  ctx.bubble(ctx.textOf('ui/insMatchLetters'));
  ctx.talk('ui/insMatchLetters');
  let open = []; let matched = 0; let lock = false;
  await new Promise((res) => {
    ctx.body.querySelectorAll('.mcard').forEach((b) => (b.onclick = async () => {
      if (lock || b.classList.contains('up')) return;
      const c = cards[+b.dataset.i];
      b.classList.add('up'); sfx.flip();
      ctx.talk(c.kind === 'pic' ? clip(c.x) : `L/${c.t.id}/name`);
      open.push([b, c]);
      if (open.length === 2) {
        lock = true;
        const [[b1, c1], [b2, c2]] = open; open = [];
        if (c1.k === c2.k && c1.kind !== c2.kind) {
          b1.classList.add('match'); b2.classList.add('match'); matched++;
          sfx.ding(); ctx.right?.(); await wait(900);
          if (matched === pairs.length) { await good(ctx); res(); }
        } else { await wait(1100); b1.classList.remove('up'); b2.classList.remove('up'); if (c1.kind !== c2.kind) ctx.mistake(); }
        lock = false;
      }
    }));
  });
  await continueBtn(ctx);
}

async function rvCelebrate(ctx) {
  const stars = ctx.stars();
  ctx.complete(stars);
  ctx.body.innerHTML = `<div class="celebrate">
      <div class="review-banner">${ctx.letters.map((x, k) => `<span style="--k:${k}">${x.ch}</span>`).join('')}</div>
      <div class="stars">${[1, 2, 3].map((s) => `<span class="${s <= stars ? 'on' : ''}" style="--i:${s}">⭐</span>`).join('')}</div>
    </div>`;
  ctx.base('jump');
  ctx.confettiBig();
  sfx.tada();
  ctx.bubble(ctx.textOf('ui/reviewDone'));
  await ctx.talk('ui/reviewDone');
  await continueBtn(ctx, 'חוֹזְרִים לַמַּפָּה');
}

export const REVIEW_STAGES = [
  { key: 'talkReview', interlude: true, pose: 'talk', run: reviewIntro },
  { key: 'rvFind', icon: '🔤', run: rvFindLetter },
  { key: 'rvWhich', icon: '👂', run: rvWhichLetter },
  { key: 'rvMatch', icon: '🃏', run: rvMatch },
  { key: 'rvDone', icon: '🏆', pose: 'jump', run: rvCelebrate },
];
export { letterLines };
export { continueBtn, good, bad, shuffle, pick, wait };
