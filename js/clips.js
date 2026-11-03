// רשימת כל קטעי השמע. משותף לדפדפן (טקסט גיבוי לדיבור) ולמחולל השמע (tools/build-clips.mjs).
import { COLORS, CUI, colorLines, parseThing } from './colors-data.js';
import { LETTERS, REGIONS, UI, HERO, letterLines, wordChant, wordSentence, regionLine, parseWord, ttsText } from './data.js';

const TEACHER = 'Read aloud in Hebrew, warmly, slowly and very clearly, like a kind kindergarten teacher talking to a 5 year old. Pronounce every vowel exactly as written in the niqqud. Read only this text';
const FRIEND = 'Read aloud in Hebrew as a friendly, playful cartoon animal character talking to a small child, slowly and clearly. Pronounce every vowel exactly as written in the niqqud. Read only this text';
const WORD = 'Say this single Hebrew word clearly for a 5 year old learning to read, exactly as the niqqud shows, with nothing added before or after it. Say only the word';
const CHANT = 'You are a warm kindergarten teacher teaching Hebrew phonics. Say the short opening sound twice, quickly and crisply, then say the whole word clearly with a happy voice. Pronounce exactly as the niqqud shows and do not add any sound after the last letter. Read only this text';
const SYL = 'Read these Hebrew syllables aloud slowly with a short pause between them, for a child learning to read, exactly as the niqqud shows. Read only this text';

export function buildClips() {
  const clips = [];
  // alt: נוסח חלופי אם מנוע הקול מסרב לנוסח הראשון
  const add = (id, text, voice = HERO.voice, style = TEACHER, alt) => clips.push({ id, text: ttsText(text), voice, style, ...(alt ? { alt: ttsText(alt) } : {}) });
  for (const [k, t] of Object.entries(UI)) add(`ui/${k}`, t);
  for (const r of REGIONS) add(`region/${r.id}`, regionLine(r));
  for (const l of LETTERS) {
    const lines = letterLines(l);
    add(`L/${l.id}/name`, lines.name, HERO.voice, WORD);
    add(`L/${l.id}/friend1`, lines.friend1, l.friend.voice, FRIEND);
    add(`L/${l.id}/friend2`, lines.friend2, l.friend.voice, FRIEND);
    add(`L/${l.id}/intro`, lines.intro);
    add(`L/${l.id}/syl`, lines.syl, HERO.voice, SYL, l.syl.map((x) => (/[\u05B8\u05B6]/.test(x) && !/[וי]/.test(x) && !l.final ? `${x}ה` : x)).join(', ') + '.');
    add(`L/${l.id}/yesno`, lines.yesno);
    add(`L/${l.id}/done`, lines.done);
    l.words.forEach((s, i) => {
      const { w } = parseWord(s);
      add(`L/${l.id}/w${i}`, w, HERO.voice, WORD);
      add(`L/${l.id}/s${i}`, wordChant(l, w), HERO.voice, CHANT, wordSentence(l, w));
    });
  }
  // עולם הצבעים
  for (const [k, t] of Object.entries(CUI)) add(`ui/${k}`, t);
  const DROP_VOICES = ['Aoede', 'Callirrhoe', 'Despina', 'Laomedeia', 'Autonoe'];
  COLORS.forEach((c, n) => {
    const lines = colorLines(c);
    const v = DROP_VOICES[n % DROP_VOICES.length];
    add(`C/${c.id}/name`, lines.name, HERO.voice, WORD);
    add(`C/${c.id}/friend1`, lines.friend1, v, FRIEND);
    add(`C/${c.id}/friend2`, lines.friend2, v, FRIEND);
    for (const k of ['intro', 'where', 'which', 'pick', 'bubbles', 'done', 'mixQ', 'mixA']) if (lines[k]) add(`C/${c.id}/${k}`, lines[k]);
    c.things.forEach((t, i) => add(`C/${c.id}/t${i}`, parseThing(t).w, HERO.voice, WORD));
  });
  return clips;
}
