// העולמות החדשים: מספרים, חיבור וחיסור, פינת הסיפורים, מה זה שיר (עברית),
// וצד האנגלית: 9 נושאים ו-ABC.
import { IS_AR } from './i18n.js';
import { NUMW, NUM_UI, MATH_UI, STORIES, STORY_UI, RHYME_WORDS, SYL_WORDS, SONGS, SONG_UI, EN_THEMES, ABC, EN_UI, enWordKey } from './more-data.js';
import { ENGLISH } from './worlds-data.js';
import { K } from './worlds-stages.js';
import { continueBtn, good, bad, shuffle, pick, wait } from './stages.js';
import { ok } from './qa.js';
import { sfx } from './audio.js';

const { intro, cards, choose, song, celebrate, echo, pic, dotsAt, englishStation, enHTML, OWL } = K;
const UI = (k) => `ui/${k}`;
const N = (n) => `N/${n}`;
const rint = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const EMO = ['⭐', '🍎', '🐟', '🎈', '🌸', '🍓', '🐞', '⚽'];
const remo = () => EMO[Math.floor(Math.random() * EMO.length)];

// =====================================================================
// מספרים
// =====================================================================
const numeral = (n) => `<b class="numeral">${n}</b>`;
const objs = (n, e = remo()) => `<span class="objs n${n}">${[...Array(n)].map(() => `<i>${e}</i>`).join('')}</span>`;
const frame = (n, size = 10) => `<span class="tenframe s${size}">${[...Array(size)].map((_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`;
const numOpts = (ans, lo = 0, hi = 10) => {
  const set = new Set([ans]);
  while (set.size < 3) { const d = ans + rint(-2, 2); if (d >= lo && d <= hi) set.add(d); }
  return [...set].map((n) => ({ html: numeral(n), ok: n === ans }));
};

function count(key, ns) {
  return { key, run: async (ctx) => {
    for (const n of ns) {
      const e = remo();
      ctx.body.innerHTML = `<div class="count-field">${[...Array(n)].map((_, i) => `<button class="count-item tap-me" data-i="${i}"><span>${e}</span><b class="count-n"></b></button>`).join('')}</div>`;
      ctx.bubble(NUM_UI.nmCount);
      ctx.talk(UI('nmCount'));
      let k = 0;
      await new Promise((res) => ctx.body.querySelectorAll('.count-item').forEach((b) => (b.onclick = async () => {
        if (b.classList.contains('done')) return;
        k++; b.classList.add('done'); b.querySelector('.count-n').textContent = k; sfx.pop();
        ctx.say(N(k));
        if (k === n) {
          await wait(800);
          ctx.bubble(`${NUM_UI.nmThereAre} <b>${NUMW[n]}</b>!`);
          await ctx.talk([UI('nmThereAre'), N(n)]);
          ctx.right(); res();
        }
      })));
    }
    await continueBtn(ctx);
  } };
}
const howMany = (lo, hi, n = 4, quick = false) => () => [...Array(n)].map(() => {
  const k = rint(lo, hi);
  return { pre: UI(quick ? 'nmQuick' : 'nmHowMany'), text: quick ? NUM_UI.nmQuick : NUM_UI.nmHowMany, clips: UI(quick ? 'nmQuick' : 'nmHowMany'),
    top: `<div class="count-show ${quick ? 'flash' : ''}">${quick ? frame(k, hi > 5 ? 10 : 5) : objs(k)}</div>`, options: numOpts(k, Math.max(0, lo - 1), Math.min(10, hi + 2)), keepOrder: false };
});
const findSet = (lo, hi, n = 3) => () => [...Array(n)].map(() => {
  const k = rint(lo, hi); const e = remo();
  const others = shuffle([...Array(hi - lo + 3).keys()].map((x) => x + Math.max(1, lo - 1)).filter((x) => x !== k && x <= 10)).slice(0, 2);
  return { text: `${NUM_UI.nmFind} <b>${NUMW[k]}</b>?`, clips: [UI('nmFind'), N(k)], options: [k, ...others].map((x) => ({ html: objs(x, e), ok: x === k })) };
});
const moreLess = (n = 6) => () => [...Array(n)].map((_, r) => {
  const more = r % 2 === 0; let a = rint(1, 9); let b = rint(1, 9); while (b === a) b = rint(1, 9);
  const e = remo();
  return { text: NUM_UI[more ? 'nmMore' : 'nmLess'], clips: UI(more ? 'nmMore' : 'nmLess'), options: [a, b].map((x) => ({ html: objs(x, e), ok: more ? x === Math.max(a, b) : x === Math.min(a, b) })) };
});
const afterRounds = (n = 5) => () => [...Array(n)].map(() => {
  const k = rint(1, 9);
  return { text: `${NUM_UI.nmAfter} <b>${NUMW[k]}</b>?`, clips: [UI('nmAfter'), N(k)], options: numOpts(k + 1, 1, 10) };
});
const meetCards = (ns) => cards('nmCards', ns.map((n) => ({ html: `<div class="kit-col">${numeral(n)}${objs(n)}</div>`, text: `${NUM_UI.nmMeet} <b>${NUMW[n]}</b>`, clips: [UI('nmMeet'), N(n)], tap: N(n) })));
const nmDone = (last = false) => celebrate(last ? 'nmEnd' : 'nmDone', { html: `<div class="kit-row">${frame(10, 10)}</div>`, text: last ? NUM_UI.nmEnd : NUM_UI.nmDone, clip: UI(last ? 'nmEnd' : 'nmDone') });

const NUMBER_STATIONS = [
  { id: 'n1', chip: '1️⃣', title: '1, 2, 3', stages: () => [meetCards([1, 2, 3]), count('nmCount', [2, 3]), choose('nmHow', howMany(1, 3)), choose('nmFind', findSet(1, 3)), nmDone()] },
  { id: 'n2', chip: '4️⃣', title: '4, 5', stages: () => [meetCards([4, 5]), count('nmCount', [4, 5]), choose('nmHow', howMany(1, 5)), choose('nmQuick', howMany(1, 5, 4, true)), nmDone()] },
  { id: 'r1', chip: '🔁', review: true, title: 'חֲזָרָה 1-5', stages: () => [choose('nmR', () => shuffle([...howMany(1, 5, 3)(), ...findSet(1, 5, 3)()])), nmDone()] },
  { id: 'n3', chip: '6️⃣', title: '6, 7, 8', stages: () => [meetCards([6, 7, 8]), count('nmCount', [6, 7]), choose('nmHow', howMany(5, 8)), choose('nmQuick', howMany(5, 8, 3, true)), nmDone()] },
  { id: 'n4', chip: '🔟', title: '9, 10', stages: () => [meetCards([9, 10]), count('nmCount', [9, 10]), choose('nmHow', howMany(6, 10)), choose('nmFind', findSet(6, 10)), nmDone()] },
  { id: 'n5', chip: '⚖️', title: 'יוֹתֵר וּפָחוֹת', stages: () => [choose('nmMoreLess', moreLess(6)), nmDone()] },
  { id: 'n6', chip: '➡️', title: 'מָה בָּא אַחֲרֵי?', stages: () => [choose('nmAfter', afterRounds(5)),
    K.order('nmOrder', () => [4, 5, 6].map((n) => { const start = rint(0, 10 - n); return { text: NUM_UI.nmOrder, clips: UI('nmOrder'), items: [...Array(n)].map((_, i) => ({ html: numeral(start + i + 1) })) }; })), nmDone(true)] },
];

// =====================================================================
// חיבור וחיסור
// =====================================================================
const BIRD = '🐦';
const eq = (txt) => `<div class="equation" dir="ltr">${txt}</div>`;
function joinR(max, n = 5) {
  return () => [...Array(n)].map(() => {
    const a = rint(1, max - 1); const b = rint(1, max - a); const s = a + b;
    return { text: `${MATH_UI.mtHave} ${NUMW[a]}. ${b === 1 ? MATH_UI.mtComeOne : MATH_UI.mtComeMany} ${NUMW[b]}. ${MATH_UI.mtHowNow}`,
      clips: [UI('mtHave'), N(a), UI(b === 1 ? 'mtComeOne' : 'mtComeMany'), N(b), UI('mtHowNow')],
      top: `<div class="branch"><span class="birds">${BIRD.repeat(a)}</span><span class="birds arrive">${BIRD.repeat(b)}</span></div>${eq(`${a} + ${b} = ?`)}`,
      options: numOpts(s, 0, max + 1) };
  });
}
function sepR(max, n = 5) {
  return () => [...Array(n)].map(() => {
    const a = rint(2, max); const b = rint(1, a - 1);
    return { text: `${MATH_UI.mtHave} ${NUMW[a]}. ${b === 1 ? MATH_UI.mtFlyOne : MATH_UI.mtFlyMany} ${NUMW[b]}. ${MATH_UI.mtLeft}`,
      clips: [UI('mtHave'), N(a), UI(b === 1 ? 'mtFlyOne' : 'mtFlyMany'), N(b), UI('mtLeft')],
      top: `<div class="branch"><span class="birds">${BIRD.repeat(a - b)}</span><span class="birds leave">${BIRD.repeat(b)}</span></div>${eq(`${a} − ${b} = ?`)}`,
      options: numOpts(a - b, 0, max) };
  });
}
function bondR(total, n = 4) {
  return () => [...Array(n)].map(() => {
    const out = rint(0, total - 1); const hid = total - out;
    return { text: total === 5 ? MATH_UI.mtHouse : MATH_UI.mtHouse10, clips: UI(total === 5 ? 'mtHouse' : 'mtHouse10'),
      top: `<div class="bond"><span class="house">🏠<b>?</b></span><span class="birds">${BIRD.repeat(out)}</span></div>${eq(`${total} = ${out} + ?`)}`,
      options: numOpts(hid, 0, total) };
  });
}
const mtDone = (last = false) => celebrate(last ? 'mtEnd' : 'mtDone', { html: `<div class="branch big"><span class="birds">${BIRD.repeat(5)}</span></div>`, text: last ? MATH_UI.mtEnd : MATH_UI.mtDone, clip: UI(last ? 'mtEnd' : 'mtDone') });
const MATH_STATIONS = [
  { id: 'm1', chip: '➕', title: 'מַגִּיעוֹת עוֹד (עַד 5)', stages: () => [choose('mtJoin', joinR(5)), mtDone()] },
  { id: 'm2', chip: '➖', title: 'עָפוֹת (עַד 5)', stages: () => [choose('mtSep', sepR(5)), mtDone()] },
  { id: 'r1', chip: '🔁', review: true, title: 'חֲזָרָה', stages: () => [choose('mtR1', () => shuffle([...joinR(5, 3)(), ...sepR(5, 3)()])), mtDone()] },
  { id: 'm3', chip: '🏠', title: 'הַבַּיִת שֶׁל 5', stages: () => [choose('mtBond5', bondR(5)), mtDone()] },
  { id: 'm4', chip: '➕', title: 'חִבּוּר עַד 10', stages: () => [choose('mtJoin10', () => joinR(10)().map((R, i) => (i === 0 ? { ...R, pre: UI('mtCountOn') } : R))), mtDone()] },
  { id: 'm5', chip: '➖', title: 'חִסּוּר עַד 10', stages: () => [choose('mtSep10', sepR(10)), mtDone()] },
  { id: 'm6', chip: '🏆', title: 'הַבַּיִת שֶׁל 10', stages: () => [choose('mtBond10', () => shuffle([...bondR(10, 3)(), ...joinR(10, 2)(), ...sepR(10, 2)()])), mtDone(true)] },
];

// =====================================================================
// פינת הסיפורים
// =====================================================================
function storyStation(s) {
  const img = (i) => `img/stories/${s.id}/${i + 1}.webp`;
  return { id: s.id, chip: s.icon, title: s.title, stages: () => [
    { key: 'stRead', pose: 'talk', run: async (ctx) => {
      for (let i = 0; i < s.pages.length; i++) {
        ctx.body.innerHTML = `<div class="story-page"><button class="story-img"><img src="${img(i)}" alt=""></button><p class="story-text">${s.pages[i]}</p>${dotsAt(s.pages.length, i)}</div>`;
        ctx.bubble('');
        if (i === 0) { ctx.bubble(`<b>${s.title}</b>`); await ctx.talk(`S/${s.id}/title`); ctx.bubble(''); }
        const play = () => ctx.talk(`S/${s.id}/p${i}`);
        ctx.body.querySelector('.story-img').onclick = play;
        await play();
        await continueBtn(ctx, i < s.pages.length - 1 ? 'הַדַּף הַבָּא' : 'סִיַּמְנוּ!');
      }
    } },
    ...s.questions.map((q, qi) => choose(`stQ${qi}`, () => [{ text: q.q, clips: `S/${s.id}/q${qi}`, top: `<img class="story-thumb" src="${img(qi === 0 ? 2 : 4)}" alt="">`,
      options: q.options.map((o) => ({ html: `<span class="an-emoji small">${o.e}</span><b>${o.t}</b>`, ok: !!o.ok })) }])),
    { key: 'stTalk', pose: 'talk', run: async (ctx) => {
      ctx.body.innerHTML = `<div class="story-talk">${s.breathe ? '<div class="breathe"><span>🎈</span></div>' : `<img class="story-thumb big" src="${img(5)}" alt="">`}<p class="story-text">${s.talk}</p></div>`;
      ctx.bubble('');
      await ctx.talk(`S/${s.id}/talk`);
      await continueBtn(ctx, STORY_UI.stTalkBtn);
    } },
    celebrate('stDone', { html: `<img class="story-thumb big" src="${img(5)}" alt="">`, text: STORY_UI.stDone, clip: UI('stDone') }),
  ] };
}
const STORY_STATIONS = STORIES.map(storyStation);

// =====================================================================
// מה זה שיר: חרוזים, הברות ושירים
// =====================================================================
const rw = (id) => RHYME_WORDS.find((r) => r.id === id);
const rhymeRounds = (n = 5) => () => [...Array(n)].map(() => {
  const groups = [...new Set(RHYME_WORDS.map((r) => r.g))];
  const g = groups[Math.floor(Math.random() * groups.length)];
  const [t, mate] = shuffle(RHYME_WORDS.filter((r) => r.g === g));
  const others = shuffle(RHYME_WORDS.filter((r) => r.g !== g)).filter((r, i, a) => a.findIndex((x) => x.g === r.g) === i).slice(0, 2);
  return { text: `${SONG_UI.rhWith} <b>${t.w}</b>?`, clips: [UI('rhWith'), `R/${t.id}`], top: `<div class="rh-target"><span class="an-emoji">${t.e}</span><b>${t.w}</b></div>`,
    options: [mate, ...others].map((r) => ({ html: `<span class="an-emoji small">${r.e}</span><b>${r.w}</b>`, ok: r === mate, after: r === mate ? `R/${r.id}` : null })) };
});
const oddRounds = (n = 4) => () => [...Array(n)].map(() => {
  const groups = [...new Set(RHYME_WORDS.map((r) => r.g))];
  const g = shuffle(groups)[0];
  const two = shuffle(RHYME_WORDS.filter((r) => r.g === g)).slice(0, 2);
  const odd = shuffle(RHYME_WORDS.filter((r) => r.g !== g))[0];
  return { text: SONG_UI.rhOdd, clips: [UI('rhOdd'), ...[...two, odd].map((r) => `R/${r.id}`)], options: [...two, odd].map((r) => ({ html: `<span class="an-emoji small">${r.e}</span><b>${r.w}</b>`, ok: r === odd })) };
});
const sylRounds = () => shuffle(SYL_WORDS).slice(0, 5).map((w) => ({
  text: SONG_UI.syQ, clips: [UI('syQ'), `R/${w.id}`], top: `<div class="rh-target"><span class="an-emoji">${w.e}</span><b>${w.s.join(' - ')}</b></div>`,
  options: [1, 2, 3, 4].map((k) => ({ html: `<span class="claps">${'👏'.repeat(k)}</span><b>${k}</b>`, ok: k === w.s.length })), keepOrder: true }));
function songStation(s) {
  return { id: s.id, chip: s.icon, title: s.title, stages: () => [
    song('sgSong', () => ({ pre: 'ui/sgSing', verses: s.lines.map((l, i) => ({ text: l, clip: `G/${s.id}/${i}` })) })),
    choose('sgQ', () => [{ pre: UI('sgQ'), text: s.q, clips: `G/${s.id}/q`, options: s.options.map((o) => ({ html: /^\d+$/.test(o.e) ? `${numeral(+o.e)}<b>${o.t}</b>` : `<span class="an-emoji small">${o.e}</span><b>${o.t}</b>`, ok: !!o.ok })) }]),
    celebrate('sgDone', { text: SONG_UI.sgDone, clip: UI('sgDone') }),
  ] };
}
const SONG_STATIONS = [
  { id: 'rhyme', chip: '🎈', title: 'מָה זֶה חָרוּז?', stages: () => [
    cards('rhTeach', [{ html: `<div class="kit-row">${['balon', 'shaon'].map((id) => `<span class="an-emoji">${rw(id).e}</span>`).join('')}<b class="plus">~</b>${['tzav', 'zahav'].map((id) => `<span class="an-emoji">${rw(id).e}</span>`).join('')}</div>`, text: SONG_UI.rhTeach, clips: UI('rhTeach') }]),
    choose('rhGame', rhymeRounds(5)), celebrate('sgDone', { text: SONG_UI.sgDone, clip: UI('sgDone') })] },
  songStation(SONGS[0]),
  { id: 'claps', chip: '👏', title: 'מוֹחֲאִים כַּפַּיִם', stages: () => [
    cards('syTeach', [{ html: `<div class="rh-target"><span class="an-emoji">${IS_AR ? '🦋' : '🍌'}</span><b>${IS_AR ? 'فَ - رَا - شَة' : 'בָּ - נָ - נָה'}</b><span class="claps">👏👏👏</span></div>`, text: SONG_UI.syTeach, clips: UI('syTeach') }]),
    choose('syGame', sylRounds), celebrate('sgDone', { text: SONG_UI.sgDone, clip: UI('sgDone') })] },
  songStation(SONGS[1]),
  songStation(SONGS[2]),
  songStation(SONGS[3]),
  { id: 'odd', chip: '🔁', review: true, title: 'מִי לֹא מִתְחָרֵז?', stages: () => [choose('rhOdd', oddRounds(4)), celebrate('sgDone', { text: SONG_UI.sgDone, clip: UI('sgDone') })] },
];

// =====================================================================
// צד האנגלית
// =====================================================================
const lk = (a) => a.L.toLowerCase();
const abcHTML = (a) => `<div class="abc-card" dir="ltr"><span class="abc-big">${a.L}${a.L.toLowerCase()}</span><span class="en-emoji">${a.e}</span></div>`;
function abcStation(group, gi) {
  return { id: `abc${gi}`, chip: `<span dir="ltr">${group[0].L}-${group[group.length - 1].L}</span>`, title: `${group[0].L} - ${group[group.length - 1].L}`, stages: () => [
    ...(gi === 0 ? [intro('enIntro', { pics: [pic(OWL, 'friend-big')], lines: [{ who: 0, clip: 'E/owlHello', text: '<bdi dir="ltr">Hello! I am Yogi the owl.</bdi>' }, { clip: UI('enAbcIntro'), text: EN_UI.enAbcIntro }] })] : []),
    cards('abcCards', group.map((a) => ({ html: abcHTML(a), cap: `<bdi dir="ltr">${a.w}</bdi>`, text: `<bdi dir="ltr"><b>${a.L}</b> - ${a.w}</bdi>`, clips: `E/abc/${a.k}` }))),
    choose('abcName', () => shuffle(group).slice(0, 4).map((t) => ({ pre: UI('enAbcFind'), text: '🔊', clips: `E/abcn/${lk(t)}`, top: '<button class="btn round replay listen" aria-label="שוב">🔊</button>',
      options: shuffle(group.filter((x) => x !== t)).slice(0, 2).concat([t]).map((a) => ({ html: `<span class="abc-big" dir="ltr">${a.L}</span>`, ok: a === t, after: a === t ? `E/abc/${a.k}` : null })) }))),
    choose('abcStart', () => shuffle(group.filter((a) => a.L !== 'X')).slice(0, 3).map((t) => ({ pre: UI('enAbcStart'), text: `<bdi dir="ltr">${t.w}</bdi>`, clips: `E/w/${enWordKey(t.w)}`, top: `<div class="rh-target"><span class="an-emoji">${t.e}</span></div>`,
      options: shuffle(ABC.filter((x) => x !== t)).slice(0, 2).concat([t]).map((a) => ({ html: `<span class="abc-big" dir="ltr">${a.L}</span>`, ok: a === t, after: a === t ? `E/abc/${a.k}` : null })) }))),
    echo('abcEcho', group.map((a) => ({ html: abcHTML(a), clip: `E/abc/${a.k}` }))),
    celebrate('enDone', { html: `<div class="kit-row" dir="ltr">${group.map((a) => `<span class="abc-big small">${a.L}</span>`).join('')}</div>`, text: ENGLISH.ui.enDone, clip: UI('enDone'), sayClip: 'E/owlGreat' }),
  ] };
}
const ABC_GROUPS = [ABC.slice(0, 4), ABC.slice(4, 8), ABC.slice(8, 12), ABC.slice(12, 16), ABC.slice(16, 20), ABC.slice(20)];
const enReview = (id, words) => ({ id, chip: '🔁', review: true, title: 'Review', stages: () => [
  choose('enR', () => shuffle(words).slice(0, Math.min(8, words.length)).map((t) => {
    const o = shuffle(words.filter((w) => w !== t)).slice(0, 2).concat([t]);
    return { pre: UI('enListen'), text: '🔊', clips: `E/w/${enWordKey(t.en)}`, top: '<button class="btn round replay listen" aria-label="שוב">🔊</button>', options: o.map((w) => ({ html: enHTML(w), ok: w === t, after: w === t ? `E/w/${enWordKey(w.en)}` : null })) };
  })),
  celebrate('enEnd', { html: pic(OWL, 'sticker-pic big-sticker'), text: ENGLISH.ui.enDone, clip: UI('enDone'), sayClip: 'E/owlGreat' }),
] });

export const EN_WORLDS = [
  ...EN_THEMES.map((T, ti) => ({ id: T.id, title: T.title, icon: T.icon, bg: 'english', friend: OWL, sub: T.sets.map((s) => s.title).join(' · '),
    story: ti === 0 ? [{ clip: UI('enStory1'), text: ENGLISH.ui.enStory1, pose: 'talk' }, { clip: UI('enStory2'), text: ENGLISH.ui.enStory2, pose: 'jump' }] : [],
    stations: [...T.sets.map((s, i) => englishStation(s, i)), enReview(`${T.id}-r`, T.sets.flatMap((s) => s.words))] })),
  { id: 'en-abc', title: 'ABC', icon: '🔤', bg: 'english', friend: OWL, sub: 'A B C',
    story: [{ clip: UI('enAbcIntro'), text: EN_UI.enAbcIntro, pose: 'talk' }],
    stations: ABC_GROUPS.flatMap((g, i) => {
      const st = [abcStation(g, i)];
      if (i % 2 === 1) st.push({ id: `abcr${i}`, chip: '🔁', review: true, title: 'Review', stages: () => [
        choose('abcR', () => shuffle([...ABC_GROUPS[i - 1], ...g]).slice(0, 6).map((t) => ({ pre: UI('enAbcFind'), text: '🔊', clips: `E/abcn/${lk(t)}`, top: '<button class="btn round replay listen" aria-label="שוב">🔊</button>',
          options: shuffle([...ABC_GROUPS[i - 1], ...g].filter((x) => x !== t)).slice(0, 3).concat([t]).map((a) => ({ html: `<span class="abc-big" dir="ltr">${a.L}</span>`, ok: a === t })) }))),
        celebrate('enDone', { text: ENGLISH.ui.enDone, clip: UI('enDone'), sayClip: 'E/owlGreat' })] });
      return st;
    }) },
];

// =====================================================================
// עולמות עבריים חדשים
// =====================================================================
export const HE_MORE = [
  { id: 'numbers', title: 'מִסְפָּרִים', icon: '🔢', bg: 'size', friend: 'img/friends/ayin.webp', sub: 'סוֹפְרִים עַד 10',
    story: [{ clip: UI('nmStory1'), text: NUM_UI.nmStory1, pose: 'wave' }, { clip: UI('nmStory2'), text: NUM_UI.nmStory2, pose: 'jump' }], stations: NUMBER_STATIONS },
  { id: 'math', title: 'חִבּוּר וְחִסּוּר', icon: '➕', bg: 'forest', friend: 'img/friends/tsadi.webp', sub: 'צִפּוֹרִים בָּאוֹת וְעָפוֹת',
    story: [{ clip: UI('mtStory1'), text: MATH_UI.mtStory1, pose: 'wave' }, { clip: UI('mtStory2'), text: MATH_UI.mtStory2, pose: 'jump' }], stations: MATH_STATIONS },
  { id: 'stories', title: 'פִּנַּת הַסִּפּוּרִים', icon: '📚', bg: 'home', friend: 'img/friends/yod.webp', sub: 'סִפּוּרִים עַל אֹמֶץ וַחֲבֵרוּת',
    story: [{ clip: UI('stStory1'), text: STORY_UI.stStory1, pose: 'talk' }, { clip: UI('stStory2'), text: STORY_UI.stStory2, pose: 'wave' }], stations: STORY_STATIONS },
  { id: 'songs', title: 'מָה זֶה שִׁיר?', icon: '🎵', bg: 'colors', friend: 'img/colors/rainbow.webp', sub: 'חֲרוּזִים, כַּפַּיִם וְשִׁירִים',
    story: [{ clip: UI('sgStory1'), text: SONG_UI.sgStory1, pose: 'talk' }, { clip: UI('sgStory2'), text: SONG_UI.sgStory2, pose: 'jump' }], stations: SONG_STATIONS },
];
