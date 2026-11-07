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
      'Housing policy covers how homes are planned, built, rented, bought and allocated. Planning rules, leasehold reform, renters’ rights, social housing and council tax all sit here.',
    departmentSlugs: ['housing'],
    deptApiNames: ['Ministry of Housing, Communities and Local Government'],
    words: ['housing', 'homeless', 'homelessness', 'renters', 'rent', 'rents', 'leasehold', 'leaseholders', 'tenant', 'tenants', 'tenancy', 'tenancies', 'landlord', 'landlords', 'planning', 'building safety', 'levelling up', 'social housing', 'park homes', 'commonhold'],
    exclude: [],
    billDepartments: ['Ministry of Housing, Communities and Local Government', 'Department for Levelling Up, Housing and Communities', 'Department for Communities and Local Government', 'Office of the Deputy Prime Minister'],
    pollWords: ['housing', 'home', 'homes', 'tenant', 'tenants', 'leasehold', 'council tax', 'empty home', 'empty homes'],
  },
  {
    slug: 'immigration',
    title: 'Immigration',
    blurb:
      'Immigration policy covers who can come to the UK, on what terms, and how arrivals are processed. It covers legal migration and work visas, asylum, small boat crossings, the asylum backlog, the cost of hotel accommodation, and the agreements and legislation governments have used on arrivals.',
    departmentSlugs: ['home-office'],
    deptApiNames: ['Home Office'],
    words: ['immigration', 'asylum', 'migrant', 'migrants', 'migration', 'border', 'borders', 'refugee', 'refugees', 'deportation', 'nationality', 'small boats'],
    exclude: [],
    billDepartments: ['Home Office'],
    pollWords: ['immigration', 'asylum', 'channel crossing', 'channel crossings', 'deport', 'deportation', 'deportations', 'echr', 'human rights'],
  },
  {
    slug: 'nhs-and-health',
    title: 'NHS and Health',
    blurb:
      'Health policy covers the NHS in England, public health and adult social care. It decides how long people wait for an operation, whether they can see a GP, and how social care is paid for. Waiting lists, the workforce, mental health provision and the funding of social care are among the questions covered here.',
    departmentSlugs: ['health'],
    deptApiNames: ['Department of Health and Social Care'],
    words: ['nhs', 'health', 'hospital', 'hospitals', 'social care', 'mental health', 'medicine', 'medicines', 'medical', 'patient', 'patients', 'tobacco', 'vapes', 'dentist', 'dentists', 'dental', 'hospice', 'hospices', 'assisted dying'],
    exclude: ['health and safety'],
    billDepartments: ['Department of Health and Social Care', 'Department of Health'],
    pollWords: ['nhs', 'health', 'social care', 'hospital'],
  },
  {
    slug: 'defence',
    title: 'Defence',
    blurb:
      'Defence policy covers the armed forces, equipment, bases and the UK’s military commitments abroad. The questions here are about how much the country spends on its armed forces, the state of the nuclear deterrent, support for veterans, the readiness of equipment and personnel, and the commitments Britain makes through NATO and to allies under pressure.',
    departmentSlugs: ['defence'],
    deptApiNames: ['Ministry of Defence'],
    words: ['defence', 'armed forces', 'military', 'veteran', 'veterans', 'nato', 'army', 'navy', 'royal air force', 'service personnel', 'overseas operations'],
    exclude: [],
    billDepartments: ['Ministry of Defence'],
    pollWords: ['defence', 'war', 'military', 'airstrike', 'iran', 'middle east'],
  },
  {
    slug: 'education',
    title: 'Education',
    blurb:
      'Education policy covers early years, schools, further education and universities. It covers school funding and standards, teacher recruitment and retention, special educational needs provision, childcare costs, university finance and the balance between academic and vocational routes.',
    departmentSlugs: ['education'],
    deptApiNames: ['Department for Education'],
    words: ['education', 'school', 'schools', 'teacher', 'teachers', 'pupil', 'pupils', 'university', 'universities', 'student', 'students', 'childcare', 'skills', 'apprentice', 'apprentices', 'apprenticeship', 'apprenticeships', 'special educational needs', 'academies', 'higher education'],
    exclude: [],
    billDepartments: ['Department for Education', 'Department for Children, Schools and Families', 'Department for Education and Skills', 'Department for Innovation, Universities and Skills'],
    pollWords: ['school', 'education', 'tuition', 'university', 'childcare'],
  },
  {
    slug: 'economy-and-tax',
    title: 'Economy and Tax',
    blurb:
      'Economic policy covers taxation, public spending, borrowing and the government’s plans for growth. Tax rates and thresholds, the level of borrowing, growth and productivity, the cost of living and the rules governing business all sit here.',
    departmentSlugs: ['treasury', 'business-trade'],
    deptApiNames: ['Treasury', 'Department for Business and Trade'],
    words: ['tax', 'taxes', 'taxation', 'budget', 'finance', 'fiscal', 'national insurance', 'vat', 'economy', 'economic', 'spending', 'business rates', 'customs'],
    exclude: ['student finance'],
    billDepartments: ['HM Treasury', 'Department for Business and Trade', 'Department for Business, Energy and Industrial Strategy', 'Department for Business, Innovation and Skills', 'Department for Business, Enterprise and Regulatory Reform', 'Department for International Trade', 'Department of Trade and Industry'],
    pollWords: ['tax', 'national insurance', 'capital gains', 'spending', 'budget'],
  },
  {
    slug: 'welfare-and-benefits',
    title: 'Welfare and Benefits',
    blurb:
      'The welfare system is how the state supports people who cannot support themselves, through pensions, disability benefits, universal credit and the safety net beneath work on low pay. Pension policy, disability assessments, the level of working age benefits and the rules that decide who qualifies are all decided here.',
    departmentSlugs: ['work-pensions'],
    deptApiNames: ['Department for Work and Pensions'],
    words: ['welfare', 'benefit', 'benefits', 'universal credit', 'pension', 'pensions', 'disability', 'disabilities', 'disabled', 'poverty', 'pip', 'personal independence payment', 'winter fuel', 'state pension', 'child benefit', 'carers', 'carer'],
    exclude: [],
    billDepartments: ['Department for Work and Pensions'],
    pollWords: ['welfare', 'benefit', 'pip', 'pension', 'winter fuel', 'disability'],
  },
  {
    slug: 'climate-and-energy',
    title: 'Climate and Energy',
    blurb:
      'Climate and energy policy covers energy supply and prices, household bills and the UK’s emissions targets. It covers the path to net zero, the mix of renewables, nuclear and fossil fuels, the future of North Sea oil and gas, energy security after the shock of the Ukraine war, and the cost of the transition and who bears it.',
    departmentSlugs: ['energy', 'environment'],
    deptApiNames: ['Department for Energy Security and Net Zero', 'Department for Environment, Food and Rural Affairs'],
    words: ['climate', 'energy', 'net zero', 'carbon', 'renewable', 'renewables', 'electricity', 'emission', 'emissions', 'petroleum', 'environment', 'environmental', 'water', 'sewage', 'oil', 'gas', 'fracking'],
    exclude: [],
    billDepartments: ['Department for Energy Security and Net Zero', 'Department for Environment, Food and Rural Affairs', 'Department of Energy and Climate Change', 'Department for Business, Energy and Industrial Strategy'],
    pollWords: ['energy', 'oil', 'gas', 'climate', 'north sea', 'net zero'],
    dataPages: [
      { href: '/sewage', title: 'Sewage spills', description: 'How long storm overflows spilled sewage in every council area and constituency in England, Scotland and Northern Ireland, and for each water company.' },
    ],
  },
  {
    slug: 'justice-and-policing',
    title: 'Justice and Policing',
    blurb:
      'Justice and policing cover the machinery that keeps order and holds people to account: the police, the courts, sentencing, prisons and the law itself. It covers how crimes are investigated, how long trials take, and how offenders are sentenced and held.',
    departmentSlugs: ['justice', 'home-office'],
    deptApiNames: ['Ministry of Justice', 'Home Office'],
    words: ['justice', 'police', 'policing', 'crime', 'crimes', 'sentencing', 'sentence', 'sentences', 'prison', 'prisons', 'court', 'courts', 'criminal', 'offence', 'offences', 'offenders', 'victims', 'sexual'],
    exclude: [],
    billDepartments: ['Ministry of Justice', 'Home Office'],
    pollWords: ['crime', 'police', 'sentence', 'prison', 'grooming', 'justice'],
  },
  {
    slug: 'transport',
    title: 'Transport',
    blurb:
      'Transport policy covers rail fares and services, roads and local buses. It covers the railways and the long argument over ownership and fares, the future of major projects like HS2, road building and maintenance, aviation, and the shift towards electric vehicles and active travel. It also covers major infrastructure projects.',
    departmentSlugs: ['transport'],
    deptApiNames: ['Department for Transport'],
    words: ['transport', 'rail', 'railway', 'railways', 'road', 'roads', 'hs2', 'bus', 'buses', 'aviation', 'driver', 'drivers', 'driving', 'highway', 'highways', 'cycling', 'electric vehicle', 'electric vehicles', 'motor vehicles', 'taxi', 'taxis', 'airport', 'airports', 'shipping', 'maritime'],
    exclude: [],
    billDepartments: ['Department for Transport'],
    pollWords: ['transport', 'rail', 'hs2', 'road', 'bus', 'driver'],
  },
  {
    slug: 'foreign-affairs',
    title: 'Foreign Affairs',
    blurb:
      'Foreign policy covers the UK’s relations with other countries, its alliances, its treaties and its aid. It covers diplomacy and alliances, the response to wars and crises, sanctions, trade relationships, international development and the management of the relationship with the United States and Europe.',
    departmentSlugs: ['foreign-office'],
    deptApiNames: ['Foreign, Commonwealth and Development Office'],
    words: ['foreign', 'sanction', 'sanctions', 'gaza', 'israel', 'palestine', 'palestinian', 'iran', 'ukraine', 'diplomatic', 'overseas aid', 'commonwealth', 'trade agreement', 'trade agreements', 'international development', 'treaty', 'treaties'],
    exclude: [],
    billDepartments: ['Foreign, Commonwealth and Development Office', 'Foreign and Commonwealth Office', 'Department for International Development', 'Department for Exiting the European Union'],
    pollWords: ['foreign', 'iran', 'israel', 'gaza', 'middle east', 'ukraine'],
  },
  {
    slug: 'constitutional-reform',
    title: 'Constitutional Reform',
    blurb:
      'Constitutional reform covers the rules of the system itself: how Parliament works and how power is held to account. It covers the voting system, reform of the House of Lords, devolution, the standards regime that governs MPs’ conduct and outside interests, and the ways the public can remove elected representatives. Written questions on it are listed here under the Cabinet Office.',
    departmentSlugs: [],
    deptApiNames: ['Cabinet Office'],
    words: ['constitution', 'constitutional', 'house of lords', 'electoral', 'elections', 'devolution', 'referendum', 'recall', 'standards in public life', 'ministerial standards', 'boundary', 'boundaries', 'proportional representation', 'votes at 16', 'representation of the people', 'local government reorganisation'],
    exclude: [],
    billDepartments: ['Cabinet Office', 'Office of the Leader of the House of Commons', 'Office of the Leader of the House of Lords', 'Northern Ireland Office', 'Scotland Office', 'Wales Office', 'Office of the Advocate General for Scotland', 'Prime Minister'],
    pollWords: ['proportional representation', 'no confidence', 'second job', 'second jobs', 'attendance', 'recall', 'lords', 'donation', 'gift'],
  },
  {
    slug: 'culture-media-and-sport',
    title: 'Culture, Media and Sport',
    blurb:
      'Culture, media and sport covers the BBC and the licence fee, Channel 4 and S4C, libraries and museums, the arts, the National Lottery and sport. It also covers the rules on gambling, press regulation and ticket resale, and the new independent regulator for English football.',
    departmentSlugs: ['culture'],
    // Written questions were answered as the Department for Culture, Media and Sport until the 2026 renaming.
    deptApiNames: ['Department for Digital, Culture, Media and Sport', 'Department for Culture, Media and Sport'],
    words: ['culture', 'cultural', 'arts', 'museum', 'museums', 'gallery', 'galleries', 'heritage', 'listed buildings', 'media', 'broadcasting', 'broadcaster', 'broadcasters', 'bbc', 'television', 'tv licence', 'licence fee', 'channel 4', 's4c', 'press', 'newspaper', 'newspapers', 'journalism', 'journalists', 'sport', 'sports', 'sporting', 'football', 'cricket', 'olympic', 'olympics', 'commonwealth games', 'gambling', 'betting', 'lottery', 'lotteries', 'tourism', 'library', 'libraries', 'music', 'theatre', 'theatres', 'film', 'creative industries', 'tickets', 'ticketing'],
    exclude: ['trees', 'chalk streams', 'social media', 'organ tourism'],
    // DCMS also sponsored digital, data, telecoms and charities bills, so both names are shared (owner's approval,
    // 22 Oct 2026): their bills need one of the words too.
    billDepartments: ['Department for Culture, Media and Sport', 'Department for Digital, Culture, Media and Sport'],
    billTitles: ['Video Recording Act 2010', 'Digital Switchover (Disclosure of Information) Act 2007'],
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
