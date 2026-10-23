// Topic landing-page mapping. One entry per policy area. Nothing is tagged per
// item: departments and editorials are listed explicitly (small, exact), while
// divisions, bills and polls are matched at query time. Top MPs come from the
// written-questions department breakdown (mp_contribution_totals.wq_top_departments)
// via deptApiNames.
//
// Matching (rule B, owner's approval, 21 Oct 2026). Words match whole words only,
// case-insensitive: they once matched as substrings, so "bus" put the Child-like
// Sexual Abuse Dolls (Offences) Bill on Transport. A government bill (bill.bill_type_id
// 1, 3, 4 or 10) belongs to a topic when one of billDepartments sponsored it; when
// every such department is in SHARED_DEPARTMENTS, its title must also match words.
// Other bills, divisions and the Read next topic link match words; nothing matches a
// title containing an exclude word. Polls match pollWords.

export type TopicDef = {
  slug: string;
  title: string;
  blurb: string;
  // Department file slugs (lib/departments) for the assessment card; first is primary.
  departmentSlugs: string[];
  // Exact answeringBodyName values as stored in wq_top_departments, for top MPs.
  deptApiNames: string[];
  // Whole words or phrases matched (case-insensitive) against bill and division titles.
  words: string[];
  // Titles containing any of these whole words or phrases are left out.
  exclude: string[];
  // Sponsoring departments (Bills API sponsors[].organisation.name, predecessors included) for government bills.
  billDepartments: string[];
  // Bills added by name (owner's approval, 22 Oct 2026): exact titles, matched as whole phrases on top of words,
  // for bills on the subject whose titles contain none of the words. Bills only, not divisions or Read next.
  billTitles?: string[];
  // Editorial slugs (lib/editorials) hand-mapped to this topic.
  // Investigations and briefings on this subject, assigned by hand (all existing pieces
  // assigned 16 Oct 2026 after the reassessment found most topic pages listed none).
  // A piece can sit in several topics. Add new pieces here when they are published.
  editorialSlugs: string[];
  // Substring keywords matched against poll questions.
  pollWords: string[];
  // Open Govt data pages for this topic, listed under "Data on Open Govt".
  dataPages?: { href: string; title: string; description: string }[];
};

export const topics: TopicDef[] = [
  {
    slug: 'housing',
    title: 'Housing',
    blurb:
      'Housing is the policy area where national decisions land most directly on daily life: whether a family can afford to rent, whether a young person can ever buy, whether a council can house those with nowhere to go. Successive governments have promised hundreds of thousands of new homes a year and none has delivered them since the 1960s. Planning rules, leasehold reform, renters’ rights, social housing and council tax all sit here, and the gap between what is pledged and what is built is one of the defining failures of modern British government.',
    departmentSlugs: ['housing'],
    deptApiNames: ['Ministry of Housing, Communities and Local Government'],
    words: ['housing', 'homeless', 'homelessness', 'renters', 'rent', 'rents', 'leasehold', 'leaseholders', 'tenant', 'tenants', 'tenancy', 'tenancies', 'landlord', 'landlords', 'planning', 'building safety', 'levelling up', 'social housing', 'park homes', 'commonhold'],
    exclude: [],
    billDepartments: ['Ministry of Housing, Communities and Local Government', 'Department for Levelling Up, Housing and Communities', 'Department for Communities and Local Government', 'Office of the Deputy Prime Minister'],
    editorialSlugs: ['fxdep4e6wh', 'x4g3y1z5d8', 'cq4r8vn2mp', 'awsucrmvr1', 'ten-worst-performing-councils-england', 'nq7x4km2wp', 'bm4k9mxw7r', 'rs8k4mxw9n', 'wk4n9mxw7r', 'qm4n9mxw7r', 'ck8m2wq7x3', 'ew4k9mxn7r', 'cq8m4xw2hl'],
    pollWords: ['housing', 'home', 'homes', 'tenant', 'tenants', 'leasehold', 'council tax', 'empty home', 'empty homes'],
  },
  {
    slug: 'immigration',
    title: 'Immigration',
    blurb:
      'Few subjects move votes like immigration, and few are argued about with less reference to the numbers. It covers legal migration and work visas, asylum and the crossings in small boats, the size of the backlog, the cost of hotel accommodation, and the repeated attempts by governments of both parties to deter arrivals through deals, deterrents and legislation. The questions are genuinely hard: how to meet international obligations, control the border, and run a system that is neither cruel nor a magnet, all at once.',
    departmentSlugs: ['home-office'],
    deptApiNames: ['Home Office'],
    words: ['immigration', 'asylum', 'migrant', 'migrants', 'migration', 'border', 'borders', 'refugee', 'refugees', 'deportation', 'nationality', 'small boats'],
    exclude: [],
    billDepartments: ['Home Office'],
    editorialSlugs: ['as6k2mwx9q', 'k9m4qxw7n2', 'q4m8k2xw7n', 'r4n8k2wq7m'],
    pollWords: ['immigration', 'asylum', 'channel crossing', 'channel crossings', 'deport', 'deportation', 'deportations', 'echr', 'human rights'],
  },
  {
    slug: 'nhs-and-health',
    title: 'NHS and Health',
    blurb:
      'The NHS consumes nearly a fifth of all government spending and still cannot get patients seen on time. That is the starting point. Health policy decides how long people wait for an operation, whether they can see a GP, how social care is paid for, and how a service consuming nearly a fifth of all government spending copes with an ageing population. Waiting lists, workforce shortages, mental health provision and the unresolved question of who funds social care are the recurring battlegrounds, and the performance of the department behind them is measured here against what it was set up to deliver.',
    departmentSlugs: ['health'],
    deptApiNames: ['Department of Health and Social Care'],
    words: ['nhs', 'health', 'hospital', 'hospitals', 'social care', 'mental health', 'medicine', 'medicines', 'medical', 'patient', 'patients', 'tobacco', 'vapes', 'dentist', 'dentists', 'dental', 'hospice', 'hospices', 'assisted dying'],
    exclude: ['health and safety'],
    billDepartments: ['Department of Health and Social Care', 'Department of Health'],
    editorialSlugs: ['nh4k9mxw7r', 'rc8m4kqx7n', 'hx4m2kq9w7', 'kv4n9mxw7r', 'pw7k3nq9hd'],
    pollWords: ['nhs', 'health', 'social care', 'hospital'],
  },
  {
    slug: 'defence',
    title: 'Defence',
    blurb:
      'Defence is where the gap between what politicians promise and what they fund is sharpest. The questions here are about how much the country spends on its armed forces, the state of the nuclear deterrent, support for veterans, the readiness of equipment and personnel, and the commitments Britain makes through NATO and to allies under pressure. War in Europe and instability in the Middle East have pushed defence back up the agenda after decades of cuts, and the decisions taken now will shape what the country can and cannot do for a generation.',
    departmentSlugs: ['defence'],
    deptApiNames: ['Ministry of Defence'],
    words: ['defence', 'armed forces', 'military', 'veteran', 'veterans', 'nato', 'army', 'navy', 'royal air force', 'service personnel', 'overseas operations'],
    exclude: [],
    billDepartments: ['Ministry of Defence'],
    editorialSlugs: ['dn4p8rk2wq', 'p9k4w2rx7m', 'mf7k3qxw9n', 'q4m8k2xw7n', 'w7q2m9rk5t', 'k3p9w7nx2d', 'mi5k7qxw9n'],
    pollWords: ['defence', 'war', 'military', 'airstrike', 'iran', 'middle east'],
  },
  {
    slug: 'education',
    title: 'Education',
    blurb:
      'Education shapes every life chance the state can influence, from early years to university. Policy here covers school funding and standards, teacher recruitment and retention, special educational needs provision that is widely agreed to be in crisis, childcare costs, university finance and the balance between academic and vocational routes. It is an area where the effects of decisions take years to show and where quick savings can do lasting damage, which makes scrutiny of what is promised against what is funded particularly important.',
    departmentSlugs: ['education'],
    deptApiNames: ['Department for Education'],
    words: ['education', 'school', 'schools', 'teacher', 'teachers', 'pupil', 'pupils', 'university', 'universities', 'student', 'students', 'childcare', 'skills', 'apprentice', 'apprentices', 'apprenticeship', 'apprenticeships', 'special educational needs', 'academies', 'higher education'],
    exclude: [],
    billDepartments: ['Department for Education', 'Department for Children, Schools and Families', 'Department for Education and Skills', 'Department for Innovation, Universities and Skills'],
    editorialSlugs: ['pc7m3wq9k2', 'st6k9mxq4w'],
    pollWords: ['school', 'education', 'tuition', 'university', 'childcare'],
  },
  {
    slug: 'economy-and-tax',
    title: 'Economy and Tax',
    blurb:
      'Everything else a government wants to do depends on the money to pay for it, which makes the economy the area where the hardest choices are made and the most promises broken. Tax rates and thresholds, the level of borrowing, growth and productivity, the cost of living and the rules governing business all sit here. Manifesto pledges not to raise particular taxes collide with the arithmetic of the public finances, and the distance between what was promised at an election and what is delivered in a Budget is one of the clearest tests of whether a government can be trusted.',
    departmentSlugs: ['treasury', 'business-trade'],
    deptApiNames: ['Treasury', 'Department for Business and Trade'],
    words: ['tax', 'taxes', 'taxation', 'budget', 'finance', 'fiscal', 'national insurance', 'vat', 'economy', 'economic', 'spending', 'business rates', 'customs'],
    exclude: ['student finance'],
    billDepartments: ['HM Treasury', 'Department for Business and Trade', 'Department for Business, Energy and Industrial Strategy', 'Department for Business, Innovation and Skills', 'Department for Business, Enterprise and Regulatory Reform', 'Department for International Trade', 'Department of Trade and Industry'],
    editorialSlugs: ['aq4pfusttu', 'whr8acs2gf', 'd8m4xpq2vt', 'se9k4m2xq7', 'm7k4qxw9n2', 'skq4m9xw2t', 'vk4n9mxw7r', 'vq8k3mxw7n', 'tk4n9mxw7r', 'mk4n9mxw7r', 'tq6m4kx9w2', 'bk7m3wq9x2', 'td4k9mxw7r'],
    pollWords: ['tax', 'national insurance', 'capital gains', 'spending', 'budget'],
  },
  {
    slug: 'welfare-and-benefits',
    title: 'Welfare and Benefits',
    blurb:
      'The welfare system is how the state supports people who cannot support themselves, through pensions, disability benefits, universal credit and the safety net beneath work on low pay. It is also one of the largest single areas of spending and a perennial political battleground, where every reform pits the cost to the taxpayer against the consequences for the people who rely on it. Pension policy, disability assessments, the level of benefits for people of working age and the rules that decide who qualifies are all decided here, and the human stakes are higher than almost anywhere else in government.',
    departmentSlugs: ['work-pensions'],
    deptApiNames: ['Department for Work and Pensions'],
    words: ['welfare', 'benefit', 'benefits', 'universal credit', 'pension', 'pensions', 'disability', 'disabilities', 'disabled', 'poverty', 'pip', 'personal independence payment', 'winter fuel', 'state pension', 'child benefit', 'carers', 'carer'],
    exclude: [],
    billDepartments: ['Department for Work and Pensions'],
    editorialSlugs: ['kv4n9mxw7r', 'hl7k2mx9w4', 'vt6k9mxw3n'],
    pollWords: ['welfare', 'benefit', 'pip', 'pension', 'winter fuel', 'disability'],
  },
  {
    slug: 'climate-and-energy',
    title: 'Climate and Energy',
    blurb:
      'Climate and energy policy decides both how much households pay to heat their homes and what kind of country is handed to the next generation. It covers the path to net zero, the mix of renewables, nuclear and fossil fuels, the future of North Sea oil and gas, energy security after the shock of the Ukraine war, and the cost of the transition and who bears it. The tension at its heart is real: the case for decarbonisation over the long run against the immediate pressure of bills, jobs and supply, and governments are repeatedly forced to choose between them.',
    departmentSlugs: ['energy', 'environment'],
    deptApiNames: ['Department for Energy Security and Net Zero', 'Department for Environment, Food and Rural Affairs'],
    words: ['climate', 'energy', 'net zero', 'carbon', 'renewable', 'renewables', 'electricity', 'emission', 'emissions', 'petroleum', 'environment', 'environmental', 'water', 'sewage', 'oil', 'gas', 'fracking'],
    exclude: [],
    billDepartments: ['Department for Energy Security and Net Zero', 'Department for Environment, Food and Rural Affairs', 'Department of Energy and Climate Change', 'Department for Business, Energy and Industrial Strategy'],
    editorialSlugs: ['dw4k9mxw7r', 'pf7k3mxw9q', 'xf4k9mxw7r', 'hw9k4mxq2t', 'gw4k9mxn7r', 'vb8k4mxn9r', 'tn4k7mxw9r', 'mk4n9mxw7r', 'vt6k9mxw3n'],
    pollWords: ['energy', 'oil', 'gas', 'climate', 'north sea', 'net zero'],
    dataPages: [
      { href: '/sewage', title: 'Sewage spills', description: 'How long storm overflows spilled sewage in every council area and constituency in England and Northern Ireland, and for each water company.' },
    ],
  },
  {
    slug: 'justice-and-policing',
    title: 'Justice and Policing',
    blurb:
      'Justice and policing cover the machinery that keeps order and holds people to account: the police, the courts, sentencing, prisons and the law itself. The system is under visible strain, with overflowing prisons, court backlogs that leave victims and defendants waiting years, and questions about whether sentencing matches public expectation. Decisions here determine whether crimes are investigated, whether trials happen in reasonable time, and whether the punishment of offenders serves protection, deterrence or simply warehousing. It is where the state’s power over the individual is at its most direct.',
    departmentSlugs: ['justice', 'home-office'],
    deptApiNames: ['Ministry of Justice', 'Home Office'],
    words: ['justice', 'police', 'policing', 'crime', 'crimes', 'sentencing', 'sentence', 'sentences', 'prison', 'prisons', 'court', 'courts', 'criminal', 'offence', 'offences', 'offenders', 'victims', 'sexual'],
    exclude: [],
    billDepartments: ['Ministry of Justice', 'Home Office'],
    editorialSlugs: ['xm7co0hssx', 'cr4k9mxw7r', 'em7k4mxw9n', 'jx4m9wk2q7', 'px4n9mxw7r', 'pn8k4qxw2r', 'pk9v2mrx4t', 'hx7n4qw2mk', 'obd5xiiexy', 'fr9k2mxw7q', 'bg9k4mxw2q', 'pb4k9mxw7r', 'ia4k9mxw7r', 'hn4k9mxw7r', 'ms9k4qxw7n', 'mi5k7qxw9n', 'ai755882dw'],
    pollWords: ['crime', 'police', 'sentence', 'prison', 'grooming', 'justice'],
  },
  {
    slug: 'transport',
    title: 'Transport',
    blurb:
      'Transport policy is felt every day in the cost of a train ticket, the state of the roads and whether a bus still runs. It covers the railways and the long argument over ownership and fares, the future of major projects like HS2, road building and maintenance, aviation, and the shift towards electric vehicles and active travel. Big infrastructure decisions commit money for decades and are frequently revised, delayed or cancelled, and the record of what was announced against what was actually delivered is one of the more revealing measures of government competence.',
    departmentSlugs: ['transport'],
    deptApiNames: ['Department for Transport'],
    words: ['transport', 'rail', 'railway', 'railways', 'road', 'roads', 'hs2', 'bus', 'buses', 'aviation', 'driver', 'drivers', 'driving', 'highway', 'highways', 'cycling', 'electric vehicle', 'electric vehicles', 'motor vehicles', 'taxi', 'taxis', 'airport', 'airports', 'shipping', 'maritime'],
    exclude: [],
    billDepartments: ['Department for Transport'],
    editorialSlugs: ['gx4k9mxw7r', 'k3p9w7nx2d'],
    pollWords: ['transport', 'rail', 'hs2', 'road', 'bus', 'driver'],
  },
  {
    slug: 'foreign-affairs',
    title: 'Foreign Affairs',
    blurb:
      'Foreign affairs is where Britain decides what kind of power it wants to be in the world. It covers diplomacy and alliances, the response to wars and crises, sanctions, trade relationships, international development and the management of the relationship with the United States and Europe. Much of it happens out of public view and is shaped by events the government cannot control, but the choices made about which conflicts to join, which partners to trust and which agreements to sign have consequences that reach back to security, the economy and the country’s standing for years afterwards.',
    departmentSlugs: ['foreign-office'],
    deptApiNames: ['Foreign, Commonwealth and Development Office'],
    words: ['foreign', 'sanction', 'sanctions', 'gaza', 'israel', 'palestine', 'palestinian', 'iran', 'ukraine', 'diplomatic', 'overseas aid', 'commonwealth', 'trade agreement', 'trade agreements', 'international development', 'treaty', 'treaties'],
    exclude: [],
    billDepartments: ['Foreign, Commonwealth and Development Office', 'Foreign and Commonwealth Office', 'Department for International Development', 'Department for Exiting the European Union'],
    editorialSlugs: ['d8m4xpq2vt', 'mn8k4qxw7v', 'rk9m4qxw7d', 'q4m8k2xw7n', 'tk4n9mxw7r'],
    pollWords: ['foreign', 'iran', 'israel', 'gaza', 'middle east', 'ukraine'],
  },
  {
    slug: 'constitutional-reform',
    title: 'Constitutional Reform',
    blurb:
      'Constitutional reform is the argument about the rules of the game itself: how Parliament works, how power is held to account, and whether the system that produces British governments is fit for purpose. It covers the voting system and the case for proportional representation, reform of the House of Lords, devolution, the standards regime that governs MPs’ conduct and outside interests, and the mechanisms by which the public can remove those who fail them. Unlike most policy areas it has no single department behind it, but it shapes everything else, because it decides who gets to decide.',
    departmentSlugs: [],
    deptApiNames: ['Cabinet Office'],
    words: ['constitution', 'constitutional', 'house of lords', 'electoral', 'elections', 'devolution', 'referendum', 'recall', 'standards in public life', 'ministerial standards', 'boundary', 'boundaries', 'proportional representation', 'votes at 16', 'representation of the people', 'local government reorganisation'],
    exclude: [],
    billDepartments: ['Cabinet Office', 'Office of the Leader of the House of Commons', 'Office of the Leader of the House of Lords', 'Northern Ireland Office', 'Scotland Office', 'Wales Office', 'Office of the Advocate General for Scotland', 'Prime Minister'],
    editorialSlugs: ['373qnkdlvr', 'kxlkhj1jgj', 'power-for-sale-20-politicians-who-cashed-in', 'the-revolving-door', 'when-did-politicians-stop-taking-responsibility', 'britains-most-disgraced-politicians', 'kp7m2xqv9d', 'siicjkcsr6', 'ag7k4mxq9w', 'v3n8q2xk6w', 'wq7m4kx2np', 'qn4k9mxw7r', 'td4k9mxw7r', '6vui3xxze9', 'bn6k4qxw27', 'p4w9k2xr7n', 'hb9k2xq7mw', 'q7m3k9xw2r', 'dk9m2xq7w4', 'mn8k4qxw7v', 'rk9m4qxw7d'],
    pollWords: ['proportional representation', 'no confidence', 'second job', 'second jobs', 'attendance', 'recall', 'lords', 'donation', 'gift'],
  },
  {
    slug: 'culture-media-and-sport',
    title: 'Culture, Media and Sport',
    blurb:
      'Culture, media and sport covers the BBC and the licence fee, Channel 4 and S4C, libraries and museums, the arts, the National Lottery and sport. It also covers the rules on gambling, press regulation and ticket resale, and the new independent regulator for English football. The BBC’s Royal Charter expires at the end of 2027, and decisions on how the BBC is funded after that are due in a government White Paper.',
    departmentSlugs: ['culture'],
    // Written questions were answered as the Department for Culture, Media and Sport until the 2026 renaming.
    deptApiNames: ['Department for Digital, Culture, Media and Sport', 'Department for Culture, Media and Sport'],
    words: ['culture', 'cultural', 'arts', 'museum', 'museums', 'gallery', 'galleries', 'heritage', 'listed buildings', 'media', 'broadcasting', 'broadcaster', 'broadcasters', 'bbc', 'television', 'tv licence', 'licence fee', 'channel 4', 's4c', 'press', 'newspaper', 'newspapers', 'journalism', 'journalists', 'sport', 'sports', 'sporting', 'football', 'cricket', 'olympic', 'olympics', 'commonwealth games', 'gambling', 'betting', 'lottery', 'lotteries', 'tourism', 'library', 'libraries', 'music', 'theatre', 'theatres', 'film', 'creative industries', 'tickets', 'ticketing'],
    exclude: ['trees', 'chalk streams', 'social media', 'organ tourism'],
    // DCMS also sponsored digital, data, telecoms and charities bills, so both names are shared (owner's approval,
    // 22 Oct 2026): their bills need one of the words too.
    billDepartments: ['Department for Culture, Media and Sport', 'Department for Digital, Culture, Media and Sport'],
    billTitles: ['Video Recording Act 2010', 'Digital Switchover (Disclosure of Information) Act 2007'],
    editorialSlugs: ['bc4n8mxw2t'],
    pollWords: ['bbc', 'licence fee', 'gambling', 'football', 'sport', 'arts'],
  },
];

// Departments that cover several topics: their bills also need one of the topic's words.
export const SHARED_DEPARTMENTS = ['Home Office', 'Ministry of Housing, Communities and Local Government', 'Department for Levelling Up, Housing and Communities', 'Department for Communities and Local Government', 'Cabinet Office', 'Department for Business, Energy and Industrial Strategy', 'HM Treasury', 'Department for Culture, Media and Sport', 'Department for Digital, Culture, Media and Sport'];

const escapeRegex = (w: string) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Postgres whole-word pattern (for PostgREST imatch, ~*), as whole_words_pattern() in migration 2026-10-21m.
export function wholeWordsPattern(words: string[]): string | null {
  return words.length ? `\\m(${words.map(escapeRegex).join('|')})\\M` : null;
}

// The first of words found in text as a whole word (case-insensitive), unless text contains an exclude word.
export function matchWords(text: string, words: string[], exclude: string[] = []): string | null {
  const re = (ws: string[]) => new RegExp(`(^|[^a-z0-9])(${ws.map(escapeRegex).join('|')})(?![a-z0-9])`, 'i');
  if (!words.length || (exclude.length && re(exclude).test(text))) return null;
  const m = text.match(re(words));
  return m ? m[2].toLowerCase() : null;
}

// The topic_bills / topic_bills_page arguments for a topic (rule B): named bills match as whole phrases too.
export function topicBillArgs(t: TopicDef) {
  return { p_depts: t.billDepartments, p_shared: SHARED_DEPARTMENTS, p_words: [...t.words, ...(t.billTitles || [])], p_exclude: t.exclude };
}

// Newest of each title (case and spacing ignored), in the order given (newest first); the same bill is often
// reintroduced each session under the same title.
export function newestPerTitle<T extends { title: string }>(bills: T[]): T[] {
  const seen = new Set<string>();
  return bills.filter((b) => {
    const key = b.title.trim().replace(/\s+/g, ' ').toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getTopic(slug: string): TopicDef | undefined {
  return topics.find((t) => t.slug === slug);
}
