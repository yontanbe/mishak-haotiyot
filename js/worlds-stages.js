// ערכת משחקים משותפת וארבעת העולמות: גדול וקטן, איפה זה?, אנגלית ראשונה, מסע החיות.
import { SIZE, WHERE, ENGLISH, ANIMALS, ALL_ANIMALS } from './worlds-data.js';
import { sfx, settings } from './audio.js';
import { ok } from './qa.js';
import { continueBtn, good, bad, shuffle, pick, wait } from './stages.js';
import { splashSVG } from './colors-stages.js';

const UI = (k) => `ui/${k}`;
const pic = (src, cls = '') => `<span class="fpic ${cls}"><img src="${src}" alt="" draggable="false" onerror="this.parentNode.classList.add('noimg')"><span class="emo">⭐</span></span>`;
const PNINA = 'img/friends/pe.webp';
const OFRI = 'img/friends/ayin.webp';
const CAT = 'img/friends/het.webp';
const OWL = 'img/friends/yod.webp';
const dots = (n) => `<span class="round-dots">${[...Array(n)].map(() => '<i></i>').join('')}</span>`;
const dotsAt = (n, k) => `<div class="round-dots">${[...Array(n)].map((_, i) => `<i class="${i < k ? 'on' : ''}"></i>`).join('')}</div>`;

// =====================================================================
// ערכת שלבים
// =====================================================================
// פתיחה עם דמויות: כל שורה נאמרת בקול של מי שאומר אותה
function intro(key, { pics = [], lines }) {
  return { key, run: async (ctx) => {
    ctx.body.innerHTML = `<div class="kit-intro">${pics.map((p) => `<div class="friend-wrap pop-in">${p}<div class="friend-bubble"></div></div>`).join('')}</div>`;
    const wraps = [...ctx.body.querySelectorAll('.friend-wrap')];
    for (const ln of lines) {
      if (ln.who != null) {
        const w = wraps[ln.who];
        w.classList.add('talking'); w.querySelector('.friend-bubble').innerHTML = `<div class="speech friend">${ln.text}</div>`;
        ctx.bubble('');
        await ctx.say(ln.clip);
        w.classList.remove('talking'); w.querySelector('.friend-bubble').innerHTML = '';
      } else {
        ctx.bubble(ln.text);
        await ctx.talk(ln.clip);
      }
    }
    await continueBtn(ctx);
  } };
}

// כרטיסים להכרות: כל כרטיס עם קול, נגיעה משמיעה שוב
function cards(key, items, { first } = {}) {
  return { key, run: async (ctx) => {
    for (let i = 0; i < items.length; i++) {
      const it = typeof items[i] === 'function' ? items[i]() : items[i];
      ctx.body.innerHTML = `<button class="word-card kit-card flip-in">${it.html}${it.cap ? `<div class="word">${it.cap}</div>` : ''}</button>${dotsAt(items.length, i)}`;
      const card = ctx.body.querySelector('.kit-card');
      ctx.bubble(it.text);
      if (i === 0 && first) await ctx.talk(first);
      await ctx.talk(it.clips);
      card.onclick = () => { card.classList.remove('boing'); void card.offsetWidth; card.classList.add('boing'); ctx.talk(it.tap || it.clips); };
      await continueBtn(ctx);
    }
  } };
}

// בחירה: כמה סבבים, בכל סבב אפשרות אחת נכונה
function choose(key, makeRounds, { cls = '', icon } = {}) {
  return { key, icon, run: async (ctx) => {
    const rounds = makeRounds(ctx);
    for (let r = 0; r < rounds.length; r++) {
      const R = rounds[r];
      const opts = R.keepOrder ? R.options : shuffle(R.options);
      ctx.body.innerHTML = `${R.top || ''}<div class="choices kit-choices ${cls}">${opts.map((o, k) => `<button class="choice kit-opt" data-k="${k}"${ok(o.ok)}>${o.html}</button>`).join('')}</div>${dotsAt(rounds.length, r)}`;
      ctx.bubble(R.text);
      const ask = () => ctx.talk(R.clips);
      if (R.pre && r === 0) await ctx.talk(R.pre);
      ask();
      ctx.body.querySelector('.replay')?.addEventListener('click', ask);
      await new Promise((res) => ctx.body.querySelectorAll('.kit-opt').forEach((b) => (b.onclick = async () => {
        const o = opts[+b.dataset.k];
        if (o.ok) { b.classList.add('right'); if (o.after) await ctx.talk(o.after); await good(ctx); res(); }
        else { b.classList.add('wrong'); await bad(ctx); b.classList.remove('wrong'); ask(); }
      })));
    }
  } };
}

// מיון לתאים: פריט אחד בכל פעם, בוחרים לאיזה תא הוא שייך
function sortBins(key, make) {
  return { key, run: async (ctx) => {
    const { bins, items, text, clips } = make(ctx);
    ctx.bubble(text);
    await ctx.talk(clips);
    for (let r = 0; r < items.length; r++) {
      const it = items[r];
      ctx.body.innerHTML = `<div class="sort-item pop-in">${it.html}</div>
        <div class="bins">${bins.map((b) => `<button class="bin" data-id="${b.id}"${ok(b.id === it.bin)}>${b.html}</button>`).join('')}</div>${dotsAt(items.length, r)}`;
      if (it.clips) ctx.talk(it.clips);
      await new Promise((res) => ctx.body.querySelectorAll('.bin').forEach((b) => (b.onclick = async () => {
        if (b.dataset.id === it.bin) { b.classList.add('right'); ctx.right(); sfx.ding(); ctx.pose('jump', 900); if (it.after) await ctx.talk(it.after); await wait(700); res(); }
        else { b.classList.add('wrong'); await bad(ctx); b.classList.remove('wrong'); }
      })));
    }
    await good(ctx);
  } };
}

// סידור לפי הסדר: נוגעים מהקטן לגדול
function order(key, makeRounds) {
  return { key, run: async (ctx) => {
    const rounds = makeRounds(ctx);
    for (let r = 0; r < rounds.length; r++) {
      const R = rounds[r];
      const items = shuffle(R.items.map((it, rank) => ({ ...it, rank })));
      ctx.body.innerHTML = `<div class="order-row">${items.map((it, k) => `<button class="order-item" data-k="${k}"${ok(it.rank === 0)}>${it.html}<b class="order-n"></b></button>`).join('')}</div>${dotsAt(rounds.length, r)}`;
      ctx.bubble(R.text);
      ctx.talk(R.clips);
      let next = 0;
      await new Promise((res) => ctx.body.querySelectorAll('.order-item').forEach((b) => (b.onclick = async () => {
        if (b.classList.contains('done')) return;
        const it = items[+b.dataset.k];
        if (it.rank === next) {
          b.classList.add('done'); b.removeAttribute('data-ok'); b.querySelector('.order-n').textContent = next + 1; sfx.pop(); next++;
          const nb = [...ctx.body.querySelectorAll('.order-item')].find((x) => items[+x.dataset.k].rank === next);
          if (nb && ok(true)) nb.setAttribute('data-ok', '1');
          if (next === items.length) { await good(ctx); res(); }
        } else { b.classList.add('wrong'); await bad(ctx); b.classList.remove('wrong'); }
      })));
    }
  } };
}

// נוגעים בכל אחד כדי לשמוע
function tapAll(key, make) {
  return { key, run: async (ctx) => {
    const { items, text, clips, cls = '' } = make(ctx);
    ctx.body.innerHTML = `<div class="tap-grid ${cls}">${items.map((it, k) => `<button class="tap-item tap-me" data-k="${k}">${it.html}${it.cap ? `<span class="cap">${it.cap}</span>` : ''}</button>`).join('')}</div>`;
    ctx.bubble(text);
    ctx.talk(clips);
    let left = items.length;
    await new Promise((res) => ctx.body.querySelectorAll('.tap-item').forEach((b) => (b.onclick = async () => {
      const it = items[+b.dataset.k];
      b.classList.remove('boing'); void b.offsetWidth; b.classList.add('boing'); sfx.pop();
      if (!b.classList.contains('done')) { b.classList.add('done'); left--; }
      await ctx.talk(it.clips);
      if (left === 0) res();
    })));
    await continueBtn(ctx);
  } };
}

// אומרים יחד בקול (אין בדיקה, רק עידוד לדבר)
function echo(key, words) {
  return { key, run: async (ctx) => {
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      ctx.body.innerHTML = `<div class="echo">${pic(OWL, 'echo-owl')}<div class="echo-pic">${w.html}</div></div>
        <button class="btn go said"${ok(true)}>🎤 אָמַרְתִּי!</button>${dotsAt(words.length, i)}`;
      ctx.bubble(ctx.textOf(UI('enEcho')));
      if (i === 0) await ctx.talk(UI('enEcho'));
      await ctx.say(['E/owlSay', w.clip]);
      await wait(400);
      await ctx.say(w.clip);
      await new Promise((res) => (ctx.body.querySelector('.said').onclick = async () => { sfx.ding(); ctx.pose('jump', 900); ctx.right(); await ctx.say('E/owlGreat'); res(); }));
    }
  } };
}

// שיר: מילים על המסך, השורה הנוכחית מודגשת, ומנגינת רקע
let mctx;
function melody(on) {
  if (settings.muted) return () => {};
  try {
    mctx ||= new (window.AudioContext || window.webkitAudioContext)();
    mctx.resume();
    const notes = [261.6, 329.6, 392, 329.6, 293.7, 349.2, 440, 349.2, 329.6, 392, 523.3, 392, 293.7, 392, 493.9, 392];
    let i = 0; let stop = false;
    const tick = () => {
      if (stop) return;
      const t = mctx.currentTime; const o = mctx.createOscillator(); const g = mctx.createGain();
      o.type = 'triangle'; o.frequency.value = notes[i++ % notes.length] / (i % 4 === 1 ? 2 : 1);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.05, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(g).connect(mctx.destination); o.start(t); o.stop(t + 0.35);
      setTimeout(tick, 280);
    };
    if (on) tick();
    return () => { stop = true; };
  } catch { return () => {}; }
}
function song(key, make) {
  return { key, run: async (ctx) => {
    const { verses, pre } = make(ctx); // verses: [{text, clip}]
    ctx.body.innerHTML = `<div class="karaoke">${verses.map((v, k) => `<p class="kline" data-k="${k}">🎵 ${v.text}</p>`).join('')}</div>`;
    ctx.base('jump');
    if (pre) { ctx.bubble(ctx.textOf(pre)); await ctx.talk(pre); }
    ctx.bubble('');
    const stopMel = melody(true);
    for (let k = 0; k < verses.length; k++) {
      ctx.body.querySelectorAll('.kline').forEach((p, j) => p.classList.toggle('on', j === k));
      ctx.body.querySelector(`.kline[data-k="${k}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      await ctx.say(verses[k].clip);
    }
    stopMel();
    ctx.body.querySelectorAll('.kline').forEach((p) => p.classList.remove('on'));
    ctx.base('wave');
    await continueBtn(ctx, 'עוֹד פַּעַם? לֹא, מַמְשִׁיכִים!');
  } };
}

function celebrate(key, { html = '', text, clip, sayClip }) {
  return { key, pose: 'jump', run: async (ctx) => {
    const stars = ctx.stars();
    ctx.complete(stars);
    ctx.body.innerHTML = `<div class="celebrate">${html}
      <div class="stars">${[1, 2, 3].map((s) => `<span class="${s <= stars ? 'on' : ''}" style="--i:${s}">⭐</span>`).join('')}</div></div>`;
    ctx.base('jump'); ctx.confettiBig(); sfx.tada();
    if (sayClip) await ctx.say(sayClip);
    ctx.bubble(text);
    await ctx.talk(clip);
    await continueBtn(ctx, 'חוֹזְרִים לַמַּפָּה');
  } };
}

// =====================================================================
// גדול וקטן
// =====================================================================
const sized = (e, s) => `<span class="sz" style="--s:${s}">${e}</span>`;
const tower = (n, hue = 200) => `<span class="tower">${[...Array(n)].map((_, i) => `<i style="--h:${(hue + i * 37) % 360}"></i>`).join('')}</span>`;
const snake = (len) => `<svg class="snake" viewBox="0 0 ${len * 60 + 40} 60" style="--len:${len}"><path d="M10 30 ${[...Array(len)].map((_, i) => `q15 ${i % 2 ? 18 : -18} 30 0 t30 0`).join(' ')}" fill="none" stroke="#43a047" stroke-width="14" stroke-linecap="round"/><circle cx="${len * 60 + 16}" cy="30" r="11" fill="#2e7d32"/><circle cx="${len * 60 + 19}" cy="26" r="3" fill="#fff"/></svg>`;
const obj = (id) => SIZE.objects.find((o) => o.id === id);
const randObj = () => SIZE.objects[Math.floor(Math.random() * SIZE.objects.length)];

function bigSmallRounds(n, hard = false) {
  return () => [...Array(n)].map((_, r) => {
    const o = randObj(); const wantBig = r % 2 === 0;
    const [b, s] = hard || r >= 3 ? [2.1, 1.25] : [2.6, 0.9];
    return { text: ctx_t(wantBig ? 'szWhereBig' : 'szWhereSmall'), clips: UI(wantBig ? 'szWhereBig' : 'szWhereSmall'), keepOrder: false,
      options: [{ html: sized(o.e, b), ok: wantBig, after: wantBig ? UI(`szo_${o.id}_big`) : null }, { html: sized(o.e, s), ok: !wantBig, after: !wantBig ? UI(`szo_${o.id}_small`) : null }] };
  });
}
const ctx_t = (k) => SIZE.ui[k] || WHERE.ui[k] || ENGLISH.ui[k] || ANIMALS.ui[k] || '';

function threeRounds(n) {
  return () => [...Array(n)].map((_, r) => {
    const o = randObj(); const q = ['szBiggest', 'szSmallest', 'szMedium'][r % 3];
    const scales = [0.9, 1.6, 2.5];
    return { text: ctx_t(q), clips: UI(q), options: scales.map((s, k) => ({ html: sized(o.e, s), ok: (q === 'szBiggest' && k === 2) || (q === 'szSmallest' && k === 0) || (q === 'szMedium' && k === 1) })) };
  });
}

const SIZE_STATIONS = [
  { id: 's1', chip: '🐘', title: 'גָּדוֹל וְקָטָן', stages: () => [
    intro('szIntro', { pics: [pic(PNINA, 'friend-big kit-pnina'), pic(OFRI, 'friend-big kit-ofri')], lines: [
      { who: 0, clip: 'W/size/pnina', text: SIZE.ui.szPnina }, { who: 1, clip: 'W/size/ofri', text: SIZE.ui.szOfri }] }),
    cards('szCards', ['ball', 'house'].flatMap((id) => [
      { html: sized(obj(id).e, 2.6), text: `${obj(id).w} <b>גָּדוֹל</b>`, clips: UI(`szo_${id}_big`) },
      { html: sized(obj(id).e, 0.9), text: `${obj(id).w} <b>קָטָן</b>`, clips: UI(`szo_${id}_small`) }])),
    choose('szChoose', bigSmallRounds(6)),
    sortBins('szSort', () => ({ text: SIZE.ui.szSortBig, clips: UI('szSortBig'),
      bins: [{ id: 'big', html: `<span class="bin-box big">📦</span><b>גָּדוֹל</b>` }, { id: 'small', html: `<span class="bin-box small">📦</span><b>קָטָן</b>` }],
      items: shuffle([...Array(6)].map((_, k) => { const o = randObj(); const big = k % 2 === 0; return { html: sized(o.e, big ? 2.4 : 0.9), bin: big ? 'big' : 'small', after: UI(`szo_${o.id}_${big ? 'big' : 'small'}`) }; })) })),
    celebrate('szDone', { html: `<div class="kit-pair">${pic(PNINA, 'sticker-pic')}${pic(OFRI, 'sticker-pic')}</div>`, text: SIZE.ui.szDone, clip: UI('szDone') }),
  ] },
  { id: 's2', chip: '🧸', title: 'גָּדוֹל, בֵּינוֹנִי, קָטָן', stages: () => [
    cards('szBears', [{ html: `<div class="kit-row">${sized('🧸', 0.9)}${sized('🧸', 1.6)}${sized('🧸', 2.5)}</div>`, text: SIZE.ui.szBears, clips: UI('szBears') }]),
    choose('szThree', threeRounds(6)),
    order('szOrder', () => [3, 4, 4].map((n) => { const o = randObj(); return { text: SIZE.ui.szOrder, clips: UI('szOrder'), items: [0.8, 1.3, 1.9, 2.5].slice(0, n).map((s) => ({ html: sized(o.e, s) })) }; })),
    celebrate('szDone', { html: `<div class="kit-row">${sized('🧸', 0.9)}${sized('🧸', 1.6)}${sized('🧸', 2.5)}</div>`, text: SIZE.ui.szDone, clip: UI('szDone') }),
  ] },
  { id: 'r1', chip: '🔁', review: true, title: 'חֲזָרָה', stages: () => [
    choose('szR1', () => [...bigSmallRounds(3, true)(), ...threeRounds(3)()]),
    celebrate('szDone', { text: SIZE.ui.szDone, clip: UI('szDone') }),
  ] },
  { id: 's3', chip: '🦒', title: 'גָּבוֹהַּ וְנָמוּךְ', stages: () => [
    cards('szTall', [{ html: `<div class="kit-row bottom">${tower(6)}${tower(2, 20)}</div>`, text: SIZE.ui.szTallIntro, clips: UI('szTallIntro') }]),
    choose('szTallQ', () => [...Array(6)].map((_, r) => { const tall = r % 2 === 0; const [a, b] = r < 3 ? [6, 2] : [5, 3];
      return { text: ctx_t(tall ? 'szWhereTall' : 'szWhereLow'), clips: UI(tall ? 'szWhereTall' : 'szWhereLow'), options: [{ html: tower(a, r * 40), ok: tall }, { html: tower(b, r * 40 + 90), ok: !tall }] }; }), { cls: 'bottom' }),
    order('szTallO', () => [3, 4, 4].map(() => ({ text: SIZE.ui.szOrderTall, clips: UI('szOrderTall'), items: [1, 2, 4, 6].slice(0, 4).map((n, k) => ({ html: tower(n, k * 60) })) })).map((R, i) => (i === 0 ? { ...R, items: R.items.filter((_, k) => k !== 2) } : R))),
    celebrate('szDone', { html: `<div class="kit-row bottom">${tower(2)}${tower(4, 60)}${tower(6, 120)}</div>`, text: SIZE.ui.szDone, clip: UI('szDone') }),
  ] },
  { id: 's4', chip: '🐍', title: 'אָרֹךְ וְקָצָר', stages: () => [
    cards('szLong', [{ html: `<div class="kit-col">${snake(6)}${snake(2)}</div>`, text: SIZE.ui.szLongIntro, clips: UI('szLongIntro') }]),
    choose('szLongQ', () => [...Array(6)].map((_, r) => { const long = r % 2 === 0; const [a, b] = r < 3 ? [6, 2] : [5, 3];
      return { text: ctx_t(long ? 'szWhereLong' : 'szWhereShort'), clips: UI(long ? 'szWhereLong' : 'szWhereShort'), options: [{ html: snake(a), ok: long }, { html: snake(b), ok: !long }] }; }), { cls: 'col' }),
    order('szLongO', () => [3, 4].map((n) => ({ text: SIZE.ui.szOrderLong, clips: UI('szOrderLong'), items: [1, 2, 4, 6].slice(4 - n).map((len) => ({ html: snake(len) })) }))),
    celebrate('szDone', { html: `<div class="kit-col">${snake(2)}${snake(4)}${snake(6)}</div>`, text: SIZE.ui.szDone, clip: UI('szDone') }),
  ] },
  { id: 'r2', chip: '🔁', review: true, title: 'חֲזָרָה', stages: () => [
    choose('szR2', () => shuffle([
      ...bigSmallRounds(2, true)(),
      { text: SIZE.ui.szWhereTall, clips: UI('szWhereTall'), options: [{ html: tower(5), ok: true }, { html: tower(3, 90), ok: false }] },
      { text: SIZE.ui.szWhereLow, clips: UI('szWhereLow'), options: [{ html: tower(6), ok: false }, { html: tower(2, 90), ok: true }] },
      { text: SIZE.ui.szWhereLong, clips: UI('szWhereLong'), options: [{ html: snake(5), ok: true }, { html: snake(2), ok: false }] },
      { text: SIZE.ui.szWhereShort, clips: UI('szWhereShort'), options: [{ html: snake(6), ok: false }, { html: snake(3), ok: true }] },
    ])),
    celebrate('szDone', { text: SIZE.ui.szDone, clip: UI('szDone') }),
  ] },
  { id: 's5', chip: '🤔', title: 'זֶה תָּלוּי', stages: () => [
    cards('szRel', [{ html: `<div class="kit-col"><div class="kit-row bottom">${sized('🐭', 0.8)}${sized('🐶', 2)}</div><div class="kit-row bottom">${sized('🐶', 1.1)}${sized('🐘', 3)}</div></div>`, text: SIZE.ui.szRelIntro, clips: UI('szRelIntro') }]),
    choose('szRelQ', () => shuffle([['🐶', '🐭', true], ['🐶', '🐘', false], ['🐶', '🐁', true], ['🐶', '🐄', false]]).map(([a, b, big]) => ({
      top: `<div class="kit-row bottom rel-scene">${big ? sized(b, 0.8) + sized(a, 2) : sized(a, 1.1) + sized(b, 3)}</div>`,
      text: SIZE.ui.szRelQ, clips: UI('szRelQ'), keepOrder: true,
      options: [{ html: '<span class="dotsz big"></span><b>גָּדוֹל</b>', ok: big, after: UI('szBig') }, { html: '<span class="dotsz small"></span><b>קָטָן</b>', ok: !big, after: UI('szSmall') }] }))),
    celebrate('szEnd', { html: `<div class="kit-pair">${pic(PNINA, 'sticker-pic')}${pic(OFRI, 'sticker-pic')}</div>`, text: SIZE.ui.szEnd, clip: UI('szEnd') }),
  ] },
];

// =====================================================================
// איפה זה?
// =====================================================================
const posW = (id) => WHERE.positions.find((p) => p.id === id).w;
const objFor = (id) => WHERE.positions.find((p) => p.id === id).obj;
function scene(pos, { zones = null, small = false, obj = null } = {}) {
  const o = obj || objFor(pos);
  const things = o === 'table'
    ? '<div class="w-table"><div class="w-top"></div><div class="w-leg l"></div><div class="w-leg r"></div></div>'
    : o === 'boxes'
      ? '<div class="w-box b1"><div class="w-back"></div><div class="w-front"></div></div><div class="w-box b2"><div class="w-back"></div><div class="w-front"></div></div>'
      : '<div class="w-box"><div class="w-back"></div><div class="w-front"></div></div>';
  return `<div class="w-scene ${small ? 'small' : ''} obj-${o}">${things}<img class="w-cat at-${pos}" src="${CAT}" alt="" draggable="false">${zones || ''}</div>`;
}
function whereStation(id, chip, title, P, { last = false } = {}) {
  return { id, chip, title, stages: () => [
    intro('whIntro', { pics: [pic(CAT, 'friend-big')], lines: [{ who: 0, clip: 'W/where/cat', text: WHERE.ui.whCat }] }),
    tapAll('whDemo', () => ({ cls: 'scenes', text: WHERE.ui.whDemo, clips: UI('whDemo'), items: P.map((p) => ({ html: scene(p, { small: true }), cap: posW(p), clips: UI(`wh_${p}_say`) })) })),
    choose('whFind', () => [...Array(P.length > 2 ? 5 : 4)].map((_, r) => {
      const t = P[r % P.length];
      const opts = shuffle(P).slice(0, Math.min(3, P.length));
      if (!opts.includes(t)) opts[0] = t;
      return { text: ctx_t(`wh_${t}_find`), clips: UI(`wh_${t}_find`), options: opts.map((p) => ({ html: scene(p, { small: true }), ok: p === t, after: p === t ? UI(`wh_${p}_say`) : null })) };
    }), { cls: 'scenes' }),
    // שמים את חמי: נוגעים במקום הנכון בתמונה
    { key: 'whPut', run: async (ctx) => {
      const order = shuffle(P).concat(shuffle(P)).slice(0, Math.max(3, P.length));
      for (let r = 0; r < order.length; r++) {
        const t = order[r];
        const same = P.filter((p) => objFor(p) === objFor(t));
        const zones = same.map((p) => `<button class="w-zone z-${p}" data-p="${p}"${ok(p === t)} aria-label="${posW(p)}"></button>`).join('');
        ctx.body.innerHTML = `<div class="put-wrap">${scene('waiting', { zones, obj: objFor(t) })}</div>${dotsAt(order.length, r)}`;
        ctx.bubble(ctx_t(`wh_${t}_put`));
        ctx.talk(UI(`wh_${t}_put`));
        await new Promise((res) => ctx.body.querySelectorAll('.w-zone').forEach((z) => (z.onclick = async () => {
          const cat = ctx.body.querySelector('.w-cat');
          cat.className = `w-cat at-${z.dataset.p}`;
          if (z.dataset.p === t) { sfx.pop(); await ctx.talk(UI(`wh_${t}_say`)); await good(ctx); res(); }
          else { await bad(ctx); cat.className = 'w-cat at-waiting'; ctx.talk(UI(`wh_${t}_put`)); }
        })));
      }
    } },
    celebrate(last ? 'whEnd' : 'whDone', { html: pic(CAT, 'sticker-pic big-sticker'), text: last ? WHERE.ui.whEnd : WHERE.ui.whDone, clip: UI(last ? 'whEnd' : 'whDone') }),
  ] };
}
// בתחנת חזרה ובמחבואים: רק מציאת תמונות
function whereReview(id, P, last = false) {
  return { id, chip: last ? '🔍' : '🔁', review: !last, title: last ? 'מַחֲבוֹאִים' : 'חֲזָרָה', stages: () => [
    choose('whFindR', () => [...Array(last ? 7 : 5)].map((_, r) => {
      const t = P[Math.floor(Math.random() * P.length)];
      const others = shuffle(P.filter((p) => p !== t)).slice(0, 2);
      return { text: ctx_t(`wh_${t}_find`), clips: UI(`wh_${t}_find`), options: [t, ...others].map((p) => ({ html: scene(p, { small: true }), ok: p === t, after: p === t ? UI(`wh_${p}_say`) : null })) };
    }), { cls: 'scenes' }),
    celebrate(last ? 'whEnd' : 'whDone', { html: pic(CAT, 'sticker-pic big-sticker'), text: last ? WHERE.ui.whEnd : WHERE.ui.whDone, clip: UI(last ? 'whEnd' : 'whDone') }),
  ] };
}
const WHERE_STATIONS = [
  whereStation('w1', '📦', 'בְּתוֹךְ וּמִחוּץ', ['in', 'out']),
  whereStation('w2', '🪑', 'עַל וּמִתַּחַת', ['on', 'under']),
  whereReview('r1', ['in', 'out', 'on', 'under']),
  whereStation('w3', '↔️', 'לְיַד', ['next', 'in']),
  whereStation('w4', '🙈', 'לִפְנֵי וּמֵאֲחוֹרֵי', ['front', 'behind']),
  whereReview('r2', ['next', 'front', 'behind', 'in', 'on']),
  whereStation('w5', '🧱', 'בֵּין', ['between', 'next']),
  whereReview('w6', ['in', 'out', 'on', 'under', 'next', 'front', 'behind', 'between'], true),
];

// =====================================================================
// אנגלית ראשונה
// =====================================================================
const enKey = (w) => w.en.toLowerCase().replace(/[^a-z]/g, '');
const enHTML = (w) => (w.hex ? `<span class="en-splash">${splashSVG(w.hex)}</span>` : w.n ? `<span class="en-count">${'🍎'.repeat(w.n)}<b>${w.n}</b></span>` : `<span class="en-emoji">${w.e}</span>`);
const enCap = (w) => `<span class="en-cap"><bdi dir="ltr">${w.en}</bdi> <small>${w.he}</small></span>`;
function englishStation(set, i) {
  const words = set.words;
  const listen = (n) => () => [...Array(n)].map((_, r) => {
    const t = words[(r * 3 + i) % words.length];
    const o = shuffle(words.filter((w) => w !== t)).slice(0, 2).concat([t]);
    return { pre: UI('enListen'), text: '🔊', clips: `E/w/${enKey(t)}`, top: '<button class="btn round replay listen" aria-label="שוב">🔊</button>',
      options: o.map((w) => ({ html: enHTML(w), ok: w === t, after: w === t ? `E/w/${enKey(w)}` : null })) };
  });
  return { id: set.id, chip: set.id === 'colors' ? '🎨' : set.id === 'numbers' ? '🔢' : set.id === 'animals' ? '🐶' : '👋', title: set.title, stages: () => [
    intro('enIntro', { pics: [pic(OWL, 'friend-big')], lines: [{ who: 0, clip: 'E/owlHello', text: '<bdi dir="ltr">Hello! I am Yogi the owl.</bdi>' }] }),
    cards('enCards', words.map((w) => ({ html: enHTML(w), cap: enCap(w), text: `${w.he} = <bdi dir="ltr"><b>${w.en}</b></bdi>`, clips: [UI(`en_gloss_${enKey(w)}`), `E/w/${enKey(w)}`], tap: `E/w/${enKey(w)}` })), { first: UI('enMeet') }),
    choose('enListen', listen(4)),
    echo('enEcho', words.map((w) => ({ html: enHTML(w), clip: `E/w/${enKey(w)}` }))),
    choose('enListen2', listen(4)),
    celebrate('enDone', { html: pic(OWL, 'sticker-pic big-sticker'), text: ENGLISH.ui.enDone, clip: UI('enDone'), sayClip: 'E/owlGreat' }),
  ] };
}
const ALL_EN = ENGLISH.sets.flatMap((s) => s.words);
const ENGLISH_STATIONS = [
  ...ENGLISH.sets.map(englishStation),
  { id: 'enr', chip: '🔁', title: 'Review', stages: () => [
    choose('enR', () => shuffle(ALL_EN).slice(0, 8).map((t) => {
      const o = shuffle(ALL_EN.filter((w) => w !== t)).slice(0, 2).concat([t]);
      return { pre: UI('enListen'), text: '🔊', clips: `E/w/${enKey(t)}`, top: '<button class="btn round replay listen" aria-label="שוב">🔊</button>', options: o.map((w) => ({ html: enHTML(w), ok: w === t, after: w === t ? `E/w/${enKey(w)}` : null })) };
    })),
    celebrate('enEnd', { html: pic(OWL, 'sticker-pic big-sticker'), text: ENGLISH.ui.enEnd, clip: UI('enEnd'), sayClip: 'E/owlBye' }),
  ] },
];

// =====================================================================
// מסע החיות
// =====================================================================
const aHTML = (a, cls = '') => `<span class="an-emoji ${cls}">${a.e}</span>`;
function habitatStation(h) {
  const others = ALL_ANIMALS.filter((a) => a.h !== h);
  const sounders = h.animals.filter((a) => a.s);
  return { id: h.id, chip: h.icon, title: h.name, bg: h.bg, stages: () => [
    { key: 'anArrive', pose: 'talk', interlude: true, run: async (ctx) => { ctx.base('talk'); ctx.bubble(h.arrive); await ctx.talk(UI(`an_${h.id}_arrive`)); await continueBtn(ctx, 'בּוֹאוּ!'); } },
    song('anSong', () => ({ pre: 'ui/anSing', verses: [{ text: ANIMALS.chorus, clip: 'A/song/chorus' }, { text: h.song, clip: `A/song/${h.id}` }] })),
    tapAll('anMeet', () => ({ cls: 'animals', text: ANIMALS.ui.anMeet, clips: UI('anMeet'), items: h.animals.map((a) => ({ html: aHTML(a), cap: a.w, clips: [`A/${a.id}/name`, ...(a.s ? [`A/${a.id}/sound`] : [])] })) })),
    ...(sounders.length ? [choose('anWhoSays', () => shuffle(sounders).map((t) => {
      const o = shuffle(ALL_ANIMALS.filter((a) => a.id !== t.id && a.e !== t.e)).slice(0, 2).concat([t]);
      return { pre: UI('anWhoSays'), text: ANIMALS.ui.anWhoSays, clips: `A/${t.id}/sound`, top: '<button class="btn round replay listen" aria-label="שוב">🔊</button>', options: o.map((a) => ({ html: aHTML(a), ok: a === t, after: a === t ? `A/${a.id}/name` : null })) };
    }))] : []),
    choose('anLives', () => shuffle(h.animals).slice(0, 3).map((t) => {
      const o = shuffle(others).slice(0, 2).concat([t]);
      return { text: ctx_t(`an_${h.id}_who`), clips: UI(`an_${h.id}_who`), options: o.map((a) => ({ html: aHTML(a), ok: a === t, after: a === t ? `A/${a.id}/name` : null })) };
    })),
    choose('anOdd', () => [0, 1].map(() => {
      const odd = shuffle(others)[0];
      const o = shuffle(h.animals).slice(0, 3).concat([odd]);
      return { text: ctx_t(`an_${h.id}_odd`), clips: UI(`an_${h.id}_odd`), options: o.map((a) => ({ html: aHTML(a), ok: a === odd, after: a === odd ? `A/${a.id}/name` : null })) };
    })),
    celebrate('anDone', { html: `<div class="kit-row">${h.animals.map((a) => aHTML(a, 'small')).join('')}</div>`, text: ANIMALS.ui.anDone, clip: UI('anDone') }),
  ] };
}
const ANIMAL_STATIONS = [
  ...ANIMALS.habitats.slice(0, 3).map(habitatStation),
  { id: 'ar1', chip: '🔁', review: true, title: 'מִי גָּר אֵיפֹה?', bg: 'jungle', stages: () => [
    sortBins('anSort', () => {
      const hs = ANIMALS.habitats.slice(0, 3);
      return { text: ANIMALS.ui.anWhere, clips: UI('anWhere'), bins: hs.map((h) => ({ id: h.id, html: `<span class="bin-ico">${h.icon}</span><b>${h.name}</b>` })),
        items: shuffle(hs.flatMap((h) => h.animals.map((a) => ({ html: aHTML(a), bin: h.id, clips: `A/${a.id}/name` })))).slice(0, 6) };
    }),
    celebrate('anDone', { text: ANIMALS.ui.anDone, clip: UI('anDone') }),
  ] },
  ...ANIMALS.habitats.slice(3).map(habitatStation),
  { id: 'ar2', chip: '🔁', review: true, title: 'מִי גָּר אֵיפֹה?', bg: 'jungle', stages: () => [
    sortBins('anSort', () => ({ text: ANIMALS.ui.anWhere, clips: UI('anWhere'), bins: ANIMALS.habitats.map((h) => ({ id: h.id, html: `<span class="bin-ico">${h.icon}</span><b>${h.name}</b>` })),
      items: shuffle(ALL_ANIMALS).slice(0, 8).map((a) => ({ html: aHTML(a), bin: a.h.id, clips: `A/${a.id}/name` })) })),
    celebrate('anDone', { text: ANIMALS.ui.anDone, clip: UI('anDone') }),
  ] },
  { id: 'afinal', chip: '🎵', title: 'שִׁיר הַחַיּוֹת', bg: 'jungle', stages: () => [
    song('anFull', () => ({ pre: 'ui/anEnd', verses: [{ text: ANIMALS.chorus, clip: 'A/song/chorus' }, ...ANIMALS.habitats.map((h) => ({ text: h.song, clip: `A/song/${h.id}` })), { text: ANIMALS.chorus, clip: 'A/song/chorus' }] })),
    celebrate('anEnd', { html: `<div class="kit-row wrap">${ALL_ANIMALS.map((a) => aHTML(a, 'tiny')).join('')}</div>`, text: ANIMALS.ui.anDone, clip: UI('anDone') }),
  ] },
];

// =====================================================================
// רישום העולמות
// =====================================================================
export const WORLDS = [
  { id: 'size', title: 'גָּדוֹל וְקָטָן', icon: '🐘', bg: 'size', friend: PNINA, sub: 'גָּדוֹל, קָטָן, גָּבוֹהַּ, אָרֹךְ',
    story: [{ clip: UI('szStory1'), text: SIZE.ui.szStory1, pose: 'wave' }, { clip: UI('szStory2'), text: SIZE.ui.szStory2, pose: 'jump' }], stations: SIZE_STATIONS },
  { id: 'where', title: 'אֵיפֹה זֶה?', icon: '📦', bg: 'where', friend: CAT, sub: 'בְּתוֹךְ, עַל, מִתַּחַת, לִפְנֵי, מֵאֲחוֹרֵי',
    story: [{ clip: UI('whStory1'), text: WHERE.ui.whStory1, pose: 'talk' }, { clip: UI('whStory2'), text: WHERE.ui.whStory2, pose: 'jump' }], stations: WHERE_STATIONS },
  { id: 'english', title: 'אַנְגְּלִית רִאשׁוֹנָה', icon: '🦉', bg: 'english', friend: OWL, sub: 'Hello! פֶּרֶק נִסָּיוֹן',
    story: [{ clip: UI('enStory1'), text: ENGLISH.ui.enStory1, pose: 'talk' }, { clip: UI('enStory2'), text: ENGLISH.ui.enStory2, pose: 'jump' }], stations: ENGLISH_STATIONS },
  { id: 'animals', title: 'מַסַּע הַחַיּוֹת', icon: '🦁', bg: 'jungle', friend: 'img/friends/alef.webp', sub: 'חַיּוֹת, בָּתִּים וְשִׁיר',
    story: [{ clip: UI('anStory1'), text: ANIMALS.ui.anStory1, pose: 'talk' }, { clip: UI('anStory2'), text: ANIMALS.ui.anStory2, pose: 'jump' }], stations: ANIMAL_STATIONS },
];

// ערכת המשחקים, לשימוש עולמות נוספים
export const K = { intro, cards, choose, sortBins, order, tapAll, echo, song, celebrate, pic, dotsAt, englishStation, enHTML, OWL, CAT };
