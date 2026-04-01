export type SearchResult = {
  department: string;
  departmentSlug: string;
  zone: string;
  keywords: string[];
};

export const searchIndex: SearchResult[] = [
  // Treasury — Income Tax
  { department: 'HM Treasury', departmentSlug: 'treasury', zone: 'Income Tax', keywords: ['income tax', 'personal allowance', 'tax threshold', 'fiscal drag', 'higher rate tax', 'basic rate', 'tax free allowance', 'paye', 'stealth tax', 'tax freeze', 'tax bands'] },
  // Treasury — National Insurance
  { department: 'HM Treasury', departmentSlug: 'treasury', zone: 'National Insurance', keywords: ['national insurance', 'ni rise', 'employers ni', 'ni contributions', 'jobs tax', 'ni threshold', 'employee ni', 'class 1', 'class 2', 'class 4'] },
  // Treasury — VAT
  { department: 'HM Treasury', departmentSlug: 'treasury', zone: 'VAT', keywords: ['vat', 'value added tax', 'vat on schools', 'private school vat', 'vat rate', 'vat exemption', 'zero rated vat'] },
  // Treasury — The Budget
  { department: 'HM Treasury', departmentSlug: 'treasury', zone: 'The Budget', keywords: ['budget', 'autumn budget', 'spring statement', 'spending review', 'fiscal event', 'chancellors budget', 'obr forecast', 'black hole', 'budget 2024', 'budget 2025'] },
  // Treasury — Pensions
  { department: 'HM Treasury', departmentSlug: 'treasury', zone: 'Pensions', keywords: ['pensions', 'state pension', 'triple lock', 'winter fuel payment', 'winter fuel allowance', 'pension age', 'retirement age', 'auto enrolment', 'workplace pension', 'pension credit', 'pension pot'] },
  // Treasury — Banks
  { department: 'HM Treasury', departmentSlug: 'treasury', zone: 'Banks', keywords: ['banks', 'banking', 'windfall tax banks', 'savings rates', 'bank profits', 'high street banks', 'branch closures', 'building societies', 'bank regulation', 'fca', 'pra', 'financial conduct authority'] },
  // Treasury — Inflation
  { department: 'HM Treasury', departmentSlug: 'treasury', zone: 'Inflation', keywords: ['inflation', 'cpi', 'rpi', 'price rises', 'rising prices', 'cost of living crisis', 'food inflation', 'energy inflation', 'bank of england', 'interest rates', 'quantitative easing'] },
  // Treasury — Cost of Living
  { department: 'HM Treasury', departmentSlug: 'treasury', zone: 'Cost of Living', keywords: ['cost of living', 'household bills', 'energy bills', 'fuel bills', 'rising costs', 'struggling families', 'cost of living crisis', 'household finances', 'squeezed middle'] },
  // Treasury — National Debt
  { department: 'HM Treasury', departmentSlug: 'treasury', zone: 'National Debt', keywords: ['national debt', 'public debt', 'government debt', 'debt gdp', 'borrowing', 'deficit', 'fiscal rules', 'debt interest', 'gilts', 'sovereign debt', 'government bonds'] },
  // Treasury — Economic Growth
  { department: 'HM Treasury', departmentSlug: 'treasury', zone: 'Economic Growth', keywords: ['economic growth', 'gdp', 'growth mission', 'productivity', 'recession', 'economic recovery', 'g7', 'growth strategy', 'industrial strategy', 'investment', 'supply side'] },
  // Treasury — Crypto & Digital Money
  { department: 'HM Treasury', departmentSlug: 'treasury', zone: 'Crypto & Digital Money', keywords: ['crypto', 'cryptocurrency', 'bitcoin', 'digital pound', 'cbdc', 'central bank digital currency', 'crypto regulation', 'blockchain', 'mica', 'digital money', 'crypto fraud', 'nfts'] },
  // Treasury — Mortgage Rules
  { department: 'HM Treasury', departmentSlug: 'treasury', zone: 'Mortgage Rules', keywords: ['mortgage', 'mortgages', 'mortgage rates', 'mortgage payments', 'remortgage', 'first time buyer', 'stamp duty', 'mortgage charter', 'house buying', 'mortgage crisis', 'bank rate mortgage'] },
  // Home Office — Small Boats
  { department: 'Home Office', departmentSlug: 'home-office', zone: 'Small Boats', keywords: ['small boats', 'channel crossings', 'boats channel', 'illegal crossings', 'rwanda', 'rwanda scheme', 'asylum seekers channel', 'dinghies', 'channel migrants', 'stop the boats', 'border force boats'] },
  // Home Office — Immigration
  { department: 'Home Office', departmentSlug: 'home-office', zone: 'Immigration', keywords: ['immigration', 'net migration', 'migrants', 'visa', 'skilled worker visa', 'points based system', 'immigration cap', 'mass immigration', 'legal immigration', 'immigration numbers', 'immigration policy'] },
  // Home Office — Policing
  { department: 'Home Office', departmentSlug: 'home-office', zone: 'Policing', keywords: ['police', 'policing', 'police funding', 'police numbers', 'officers', 'community policing', 'police cuts', 'met police', 'police reform', 'police accountability', 'constabulary'] },
  // Home Office — Counter-Terrorism
  { department: 'Home Office', departmentSlug: 'home-office', zone: 'Counter-Terrorism', keywords: ['terrorism', 'counter terrorism', 'prevent', 'radicalisation', 'extremism', 'terror threat', 'islamist extremism', 'far right extremism', 'mi5', 'security services', 'threat level'] },
  // Home Office — Drugs
  { department: 'Home Office', departmentSlug: 'home-office', zone: 'Drugs', keywords: ['drugs', 'drug policy', 'cannabis', 'cannabis legalisation', 'drug decriminalisation', 'county lines', 'drug gangs', 'cocaine', 'heroin', 'drug treatment', 'addiction', 'drug reform'] },
  // Home Office — Crime
  { department: 'Home Office', departmentSlug: 'home-office', zone: 'Crime', keywords: ['crime', 'crime rates', 'violent crime', 'burglary', 'theft', 'antisocial behaviour', 'asb', 'crime statistics', 'crime reduction', 'criminal justice', 'law and order'] },
  // Home Office — Knife Crime
  { department: 'Home Office', departmentSlug: 'home-office', zone: 'Knife Crime', keywords: ['knife crime', 'knife attacks', 'stabbings', 'youth violence', 'knife violence', 'blade crime', 'knife ban', 'zombie knives', 'knife amnesties', 'knife carrying'] },
  // Home Office — Grooming Gangs
  { department: 'Home Office', departmentSlug: 'home-office', zone: 'Grooming Gangs', keywords: ['grooming gangs', 'grooming', 'child sexual exploitation', 'cse', 'rotherham', 'rochdale', 'grooming gang inquiry', 'child abuse gangs', 'grooming gang data', 'offender ethnicity'] },
];

export function searchTopics(query: string): SearchResult[] {
  if (!query || query.length < 2) return [];
  const q = query.toLowerCase().trim();
  return searchIndex.filter(item =>
    item.keywords.some(k => k.includes(q)) ||
    item.zone.toLowerCase().includes(q) ||
    item.department.toLowerCase().includes(q)
  ).slice(0, 10);
}
