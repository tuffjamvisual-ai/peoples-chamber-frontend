// The subject words for a debate's search description (owner, 5 Nov 2026, visibility campaign item 13), for example
// "backlog" for the debate on Work Capability Assessment timescales. Nothing is invented: every word comes from the
// debate's title or from what was said in it.
//
// The rule: a word counts if it has 4 or more letters (or is an abbreviation in capitals, such as NHS), is not on the list
// of everyday and parliamentary words below, is not part of a speaker's name, seat or office, and either is said at
// least 3 times or is in the title. Singular and plural count as one. Words not in the title rank first, by how often
// they are said, because the page title already carries the title's own words; then the title's words. The top 3 are used.
const COMMON = new Set(`uk

about above across action actually added after again against agree agreed ahead allow almost alone along already also although always among amount another answer anyone anything apart appropriate area areas around asked asking aspect aspects back based because become been before behalf behind being believe below benefit best better between beyond both bring brought build called came cannot care case cases cause certain certainly chance change changes clear clearly close come comes coming comment comments commit commitment committed concern concerned concerns consider considered considering constituencies constituency constituent constituents continue continues could country course current currently deal debate debates decision decisions deliver delivering department departments despite detail details different difficult does doing done down during each early effect effective either else ensure ensuring enough especially even event ever every everyone everything example excellent exactly fact fair family few figure figures final find first five focus follow following force forward four friend friends from full fully further future gave gentleman gentlemen getting give given gives giving going gone good government governments great group groups have having hear heard hears help helping here high highlight highly himself home honourable hope hour hours house however huge idea impact important improve include includes including increase indeed information instead interest into involved issue issues itself just keep kind know knows lady large last later lead learn least leave left less letter level levels life like likely line listen little live lives local long look looking looks lord lords lot made main make makes making many matter matters mean means meet meeting member members mention might million minister ministers minute minutes moment money month months more most motion move moved much must myself name national near need needed needs never next nine noble none note nothing number numbers office often once ones only opportunity order other others ought over part particular particularly party passed past pay people perhaps period person place plan plans please point points policy position possible power practice pre present press pressure previous previously primary prime principle priority probably problem problems process proposal proposals protect provide provided providing public publish published question questions quite raise raised raises rate rather read real really reason reasons receive received recent recently recognise record reduce regard related remain report reports representations request require required resource resources respect response rest result results review right rights rise said same saying says second secretary section sector see seek seem seems seen sense serious service services session seven several shadow shall share short should show shows side since single sir situation sitting small some someone something sometimes soon sorry speak speaker speaking specific speech spoke stage stand start started state statement states step steps still stop strong subject such suggest support supported supporting sure system systems table take taken takes taking talk talking tell term terms than thank thanks that their them themselves then there therefore these they thing things think thinking third this those though thought thousand three through throughout thus time times today together told took total towards tried true trust trying turn twice under understand unless until update upon urge used using value various very view views visit wait want wanted wants warm water ways week weeks welcome well went were what whatever when where whether which while white whole whose will wish with within without wonder word words work worked working works world worth would write written wrong year years yes yesterday yet young your
available billion british england english lose royal special united kingdom
january february march april june july august september october november december monday tuesday wednesday thursday friday saturday sunday
`.trim().split(/\s+/));

const WORD = /[A-Za-z][A-Za-z'’-]*[A-Za-z]/g;
const keyOf = (w: string) => w.toLowerCase().replace(/['’]s$/, '').replace(/['’]$/, '');
const singular = (k: string) => (/[^s]s$/.test(k) && k.length > 4 ? k.slice(0, -1) : k);

export function debateSubjectWords(title: string, said: string[], speakers: string[], max = 3): string[] {
  const names = new Set<string>();
  for (const s of speakers) for (const w of s.match(WORD) ?? []) names.add(singular(keyOf(w)));
  const counted = (w: string) => /^[A-Z]{2,6}$/.test(w) || w.length >= 4;
  const usable = (k: string) => !COMMON.has(k) && !COMMON.has(singular(k)) && !names.has(singular(k));

  const inTitle = new Set((title.match(WORD) ?? []).filter(counted).map((w) => singular(keyOf(w))));
  const tally = new Map<string, { n: number; forms: Map<string, number> }>();
  for (const text of said) {
    for (const w of text.match(WORD) ?? []) {
      if (!counted(w) || !usable(keyOf(w))) continue;
      const k = singular(keyOf(w));
      const t = tally.get(k) ?? { n: 0, forms: new Map() };
      t.n++;
      const form = w.replace(/['’]s$/, '').replace(/['’]$/, '');
      t.forms.set(form, (t.forms.get(form) ?? 0) + 1);
      tally.set(k, t);
    }
  }
  // The way the word is most often written in the debate, in lower case unless it is usually a name or an abbreviation.
  const shown = (t: { forms: Map<string, number> }) => {
    const [form] = [...t.forms.entries()].sort((a, b) => b[1] - a[1])[0];
    const lower = form.toLowerCase();
    const asLower = [...t.forms.entries()].filter(([f]) => f.toLowerCase() === lower);
    const n = asLower.reduce((a, [, c]) => a + c, 0), lc = t.forms.get(lower) ?? 0;
    return lc * 2 >= n ? lower : form;
  };
  const candidates = [...tally.entries()].filter(([k, t]) => t.n >= 3 || inTitle.has(k));
  const rank = (a: [string, { n: number }], b: [string, { n: number }]) => Number(inTitle.has(a[0])) - Number(inTitle.has(b[0])) || b[1].n - a[1].n || a[0].localeCompare(b[0]);
  return candidates.sort(rank).slice(0, max).map(([, t]) => shown(t));
}

// "Covers backlog, claimants and reassessment." Empty when there are no such words.
export function subjectSentence(words: string[]): string {
  if (!words.length) return '';
  const list = words.length === 1 ? words[0] : `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
  return `Covers ${list}.`;
}
