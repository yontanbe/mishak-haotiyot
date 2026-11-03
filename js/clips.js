// רשימת כל קטעי השמע. משותף לדפדפן (טקסט גיבוי לדיבור) ולמחולל השמע (tools/build-clips.mjs).
import { LETTERS, REGIONS, UI, HERO, letterLines, wordSentence, regionLine, parseWord } from './data.js';

const TEACHER = 'Read aloud in Hebrew, warmly, slowly and very clearly, like a kind kindergarten teacher talking to a 5 year old. Pronounce every vowel exactly as written in the niqqud. Read only this text';
const FRIEND = 'Read aloud in Hebrew as a friendly, playful cartoon animal character talking to a small child, slowly and clearly. Pronounce every vowel exactly as written in the niqqud. Read only this text';
const WORD = 'Say this single Hebrew word slowly and very clearly for a 5 year old learning to read, exactly as the niqqud shows. Say only the word';
const SYL = 'Read these Hebrew syllables aloud slowly with a short pause between them, for a child learning to read, exactly as the niqqud shows. Read only this text';

export function buildClips() {
  const clips = [];
  const add = (id, text, voice = HERO.voice, style = TEACHER) => clips.push({ id, text, voice, style });
  for (const [k, t] of Object.entries(UI)) add(`ui/${k}`, t);
  for (const r of REGIONS) add(`region/${r.id}`, regionLine(r));
  for (const l of LETTERS) {
    const lines = letterLines(l);
    add(`L/${l.id}/name`, lines.name, HERO.voice, WORD);
    add(`L/${l.id}/friend1`, lines.friend1, l.friend.voice, FRIEND);
    add(`L/${l.id}/friend2`, lines.friend2, l.friend.voice, FRIEND);
    add(`L/${l.id}/intro`, lines.intro);
    add(`L/${l.id}/syl`, lines.syl, HERO.voice, SYL);
    add(`L/${l.id}/yesno`, lines.yesno);
    add(`L/${l.id}/done`, lines.done);
    l.words.forEach((s, i) => {
      const { w } = parseWord(s);
      add(`L/${l.id}/w${i}`, w, HERO.voice, WORD);
      add(`L/${l.id}/s${i}`, wordSentence(l, w));
    });
  }
  return clips;
}
