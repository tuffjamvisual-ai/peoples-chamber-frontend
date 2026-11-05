// The subject words for a debate's search description (owner, 5 Nov 2026, visibility campaign item 13), for example
// "backlog" for the debate on Work Capability Assessment timescales. Nothing is invented: every word comes from what was
// said in the debate. If the rule does not find at least two words, the description has no "Covers" sentence.
//
// The rule (tightened 5 Nov 2026). A word counts only if all of these hold:
//   it has 4 or more letters, or is an abbreviation in capitals such as NHS;
//   it is not on the list below of everyday and parliamentary words, nor in the title, nor in a speaker's name or seat;
//   it is said at least 5 times and at least once per 500 words, so it is a theme and not a passing mention;
//   it is written in lower case at least 80 per cent of the time (or is an abbreviation), which leaves out names and places;
//   it is used as a noun: at least 40 per cent of the time after a word like "the" or "of", and at least 40 per cent of the
//   time before a word like "is" or "and" or at the end of a phrase, which leaves out words like "grateful" and "happen".
// Sittings that gather many subjects (Engagements, Points of Order, Business of the House) never get one.
// Singular and plural count as one. The 3 most often said are used.
const COMMON = new Set(`uk

about above across action actually added after again against agree agreed ahead allow almost alone along already also although always among amount another answer anyone anything apart appropriate area areas around asked asking aspect aspects back based because become been before behalf behind being believe below benefit best better between beyond both bring brought build called came cannot care case cases cause certain certainly chance change changes clear clearly close come comes coming comment comments commit commitment committed concern concerned concerns consider considered considering constituencies constituency constituent constituents continue continues could country course current currently deal debate debates decision decisions deliver delivering department departments despite detail details different difficult does doing done down during each early effect effective either else ensure ensuring enough especially even event ever every everyone everything example excellent exactly fact fair family few figure figures final find first five focus follow following force forward four friend friends from full fully further future gave gentleman gentlemen getting give given gives giving going gone good government governments great group groups have having hear heard hears help helping here high highlight highly himself home honourable hope hour hours house however huge idea impact important improve include includes including increase indeed information instead interest into involved issue issues itself just keep kind know knows lady large last later lead learn least leave left less letter level levels life like likely line listen little live lives local long look looking looks lord lords lot made main make makes making many matter matters mean means meet meeting member members mention might million minister ministers minute minutes moment money month months more most motion move moved much must myself name national near need needed needs never next nine noble none note nothing number numbers office often once ones only opportunity order other others ought over part particular particularly party passed past pay people perhaps period person place plan plans please point points policy position possible power practice pre present press pressure previous previously primary prime principle priority probably problem problems process proposal proposals protect provide provided providing public publish published question questions quite raise raised raises rate rather read real really reason reasons receive received recent recently recognise record reduce regard related remain report reports representations request require required resource resources respect response rest result results review right rights rise said same saying says second secretary section sector see seek seem seems seen sense serious service services session seven several shadow shall share short should show shows side since single sir situation sitting small some someone something sometimes soon sorry speak speaker speaking specific speech spoke stage stand start started state statement states step steps still stop strong subject such suggest support supported supporting sure system systems table take taken takes taking talk talking tell term terms than thank thanks that their them themselves then there therefore these they thing things think thinking third this those though thought thousand three through throughout thus time times today together told took total towards tried true trust trying turn twice under understand unless until update upon urge used using value various very view views visit wait want wanted wants warm water ways week weeks welcome well went were what whatever when where whether which while white whole whose will wish with within without wonder word words work worked working works world worth would write written wrong year years yes yesterday yet young your
available billion british england english lose royal special united kingdom
bill clause amendment amendments committee committees hansard labour conservative conservatives liberal democrat democrats executive leader crown gulf proceedings potential greater approach announcement cost costs legislation instrument application applications land region
january february march april june july august september october november december monday tuesday wednesday thursday friday saturday sunday
`.trim().split(/\s+/));

const WORD = /[A-Za-z][A-Za-z'’-]*[A-Za-z]/g;
// Sittings that gather many subjects: no one set of words describes them.
const MANY_SUBJECTS = /^(?:engagements|points? of order|business of the house|topical questions|public bill committees?|oral answers|bills? presented|prayers?|royal assent|speaker'?s? statement|delegated legislation|general committees?)\b/i;
// The word before a noun, and the words that usually follow one.
const BEFORE_NOUN = new Set('the a an of our their this that these those more many some any no his her my your for in on with about'.split(' '));
const AFTER_NOUN = new Set('is are was were has have had will would can could should may might must do does did and or but of to in on at by for from with as that which who than who if when because while so not'.split(' '));

const keyOf = (w: string) => w.toLowerCase().replace(/['’]s$/, '').replace(/['’]$/, '');
const singular = (k: string) => {
  if (/[^aeiou]ies$/.test(k) && k.length > 5) return `${k.slice(0, -3)}y`;
  return /[^s]s$/.test(k) && k.length > 4 ? k.slice(0, -1) : k;
};
const isAbbreviation = (w: string) => /^(?:[A-Z]{3,5}|AI|GP)$/.test(w);

type Tally = { n: number; lower: number; caps: number; afterSignal: number; beforeSignal: number; forms: Map<string, number> };

export function debateSubjectWords(title: string, said: string[], speakers: string[], max = 3): string[] {
  const cleanTitle = title.replace(/\s+/g, ' ').trim();
  if (MANY_SUBJECTS.test(cleanTitle)) return [];
  const names = new Set<string>();
  for (const s of speakers) for (const w of s.match(WORD) ?? []) names.add(singular(keyOf(w)));
  const inTitle = new Set((cleanTitle.match(WORD) ?? []).map((w) => singular(keyOf(w))));

  const tally = new Map<string, Tally>();
  let total = 0;
  for (const text of said) {
    const tokens = text.match(/[A-Za-z][A-Za-z'’-]*[A-Za-z]|[.,;:!?()]/g) ?? [];
    tokens.forEach((w, i) => {
      if (w.length === 1) return;
      total++;
      if (!isAbbreviation(w) && w.length < 4) return;
      const key = keyOf(w), k = singular(key);
      if (COMMON.has(key) || COMMON.has(k) || names.has(k) || inTitle.has(k)) return;
      const prev = (tokens[i - 1] ?? '.').toLowerCase(), next = (tokens[i + 1] ?? '.').toLowerCase();
      const t = tally.get(k) ?? { n: 0, lower: 0, caps: 0, afterSignal: 0, beforeSignal: 0, forms: new Map() };
      t.n++;
      if (isAbbreviation(w)) t.caps++;
      else if (w === w.toLowerCase()) t.lower++;
      if (BEFORE_NOUN.has(prev)) t.afterSignal++;
      if (next.length === 1 || AFTER_NOUN.has(next)) t.beforeSignal++;
      const form = w.replace(/['’]s$/, '').replace(/['’]$/, '');
      t.forms.set(form, (t.forms.get(form) ?? 0) + 1);
      tally.set(k, t);
    });
  }
  const need = Math.max(5, Math.ceil(total / 500));
  const picked = [...tally.entries()]
    .filter(([, t]) => t.n >= need)
    // A name or a place is usually written with a capital: out, unless it is an abbreviation such as NHS.
    .filter(([, t]) => t.caps / t.n >= 0.8 || t.lower / t.n >= 0.8)
    // A word that makes sense alone is used as a noun: "the backlog", "backlog is". "Grateful" and "happen" are not.
    .filter(([, t]) => t.caps / t.n >= 0.8 || (t.afterSignal / t.n >= 0.4 && t.beforeSignal / t.n >= 0.4))
    .sort((a, b) => b[1].n - a[1].n || a[0].localeCompare(b[0]))
    .slice(0, max)
    .map(([, t]) => [...t.forms.entries()].sort((a, b) => b[1] - a[1])[0][0]);
  // One word alone rarely says what a debate covers: the description then stays as it was.
  return picked.length >= 2 ? picked : [];
}

// "Covers backlog, claimants and reassessment." Empty when there are no such words.
export function subjectSentence(words: string[]): string {
  if (!words.length) return '';
  const list = words.length === 1 ? words[0] : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
  return `Covers ${list}.`;
}
