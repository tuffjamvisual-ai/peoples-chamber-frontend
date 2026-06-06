// Donor sector taxonomy shared between server-side cross-reference
// computation and client-side rendering.
//
// Two parallel pattern sets per sector:
//   donorRegex   — matches against EC donor names (used in the donor
//                  pill on the Donations tab)
//   voteKeywords — matches against mp_division_votes.division_title or
//                  bill.plain_summary (used to compute "what bills
//                  touched this sector that this MP voted on")
//
// Order matters where one sector's keywords could match another's: list
// the more-specific sector first.

export type Sector = {
  key: string;
  label: string;
  colour: string;
  donorRegex: RegExp;
  voteKeywords: string[];
};

export const SECTORS: Sector[] = [
  {
    key: 'tradeunion',
    label: 'Trade union',
    colour: '#a64030',
    donorRegex: /\b(unite the union|unite$|unison|gmb|usdaw|cwu|aslef|nasuwt|nut|nutuc|tuc|fbu|prospect|equity|musicians.{0,5}union|writers.{0,5}guild|community union|fda union|napo|nuj|nautilus|pcs|rmt|tssa|ucu|bda)\b/i,
    voteKeywords: ['trade union', 'employment rights', 'strikes', 'strike action', 'industrial action', 'picket', 'collective bargaining', 'minimum service', 'agency workers', 'p&o', 'fire and rehire', 'zero hours'],
  },
  {
    key: 'property',
    label: 'Property',
    colour: '#5e3a14',
    donorRegex: /\b(properties|property|estates|developments|homes ltd|housing|real estate|landlord|land ltd|builders|construction)\b/i,
    voteKeywords: ['leasehold', 'freehold', 'renters', 'landlord', 'tenant', 'tenancy', 'housing', 'planning', 'building safety', 'cladding', 'right to buy', 'social housing', 'council tax', 'business rates', 'levelling-up and regeneration', 'urban planning'],
  },
  {
    key: 'finance',
    label: 'Finance',
    colour: '#1a4666',
    donorRegex: /\b(capital|partners|investments?|hedge|fund management|asset management|equity|holdings|securities|wealth|private bank|sovereign)\b/i,
    voteKeywords: ['financial services', 'banking', 'building societies', 'insurance', 'pensions', 'pension schemes', 'capital markets', 'mortgage', 'consumer credit', 'national insurance contributions', 'financial regulation', 'fca', 'financial conduct', 'prudential'],
  },
  {
    key: 'gambling',
    label: 'Gambling',
    colour: '#7a4a16',
    donorRegex: /\b(gambling|bet365|bookmakers?|paddy power|ladbrokes|coral|william hill|casino|bingo|betting|wagering|lottery)\b/i,
    voteKeywords: ['gambling', 'betting', 'lottery', 'casino', 'horserace betting', 'wagering', 'fobts', 'fixed odds', 'gambling commission'],
  },
  {
    key: 'defence',
    label: 'Defence',
    colour: '#3b3b3b',
    donorRegex: /\b(defence|defense|arms|aerospace|missile|naval systems|bae|qinetiq|babcock|leonardo|raytheon|lockheed)\b/i,
    voteKeywords: ['armed forces', 'defence', 'national security', 'aukus', 'nato', 'arms export', 'arms trade', 'military', 'intelligence services', 'integrated review', 'nuclear deterrent', 'trident'],
  },
  {
    key: 'energy',
    label: 'Oil & gas',
    colour: '#222',
    donorRegex: /\b(oil|petroleum|gas ltd|shell|bp\s|exxon|chevron|drilling|exploration|lng|coal)\b/i,
    voteKeywords: ['oil', 'gas', 'petroleum', 'fossil fuel', 'north sea', 'drilling', 'fracking', 'coal', 'lng', 'energy bill', 'energy security'],
  },
  {
    key: 'media',
    label: 'Media',
    colour: '#444',
    donorRegex: /\b(media|publishing|newspapers?|press ltd|broadcast|telegraph|times newspapers|news uk|news group|daily mail|guardian media|reach plc)\b/i,
    voteKeywords: ['media bill', 'broadcasting', 'press', 'online safety', 'channel 4', 'bbc', 'press regulation', 'leveson', 'royal charter', 'media plurality'],
  },
  {
    key: 'pharma',
    label: 'Pharma',
    colour: '#4a8a3a',
    donorRegex: /\b(pharma|biotech|pharmaceuticals?|astrazeneca|gsk|glaxo|life sciences|medicines|vaccines|biopharma)\b/i,
    voteKeywords: ['medicines', 'pharmaceutical', 'drug pricing', 'vaccines', 'nhs prescription', 'clinical trials', 'biotech', 'life sciences', 'human medicines', 'health innovation'],
  },
  {
    key: 'tech',
    label: 'Tech',
    colour: '#005b8a',
    donorRegex: /\b(technologies|technology|software|systems ltd|digital ltd|ai labs|data labs|microsoft|google|amazon|meta platforms|apple inc)\b/i,
    voteKeywords: ['online safety', 'digital markets', 'data protection', 'data use and access', 'ai bill', 'artificial intelligence', 'algorithmic', 'platform regulation', 'social media', 'online harms', 'digital services'],
  },
  {
    key: 'tobacco',
    label: 'Tobacco',
    colour: '#8b4513',
    donorRegex: /\b(tobacco|vape|vaping|imperial brands|british american tobacco|bat plc|philip morris|nicotine)\b/i,
    voteKeywords: ['tobacco', 'vaping', 'e-cigarette', 'nicotine', 'smokefree', 'smoke-free', 'tobacco and vapes'],
  },
  {
    key: 'crypto',
    label: 'Crypto',
    colour: '#704214',
    donorRegex: /\b(crypto|coin ltd|bitcoin|blockchain|digital asset|web3|defi)\b/i,
    voteKeywords: ['cryptocurrency', 'cryptoasset', 'crypto asset', 'digital currency', 'central bank digital currency', 'cbdc', 'virtual asset'],
  },
];

export function sectorForDonor(donorName: string): Sector | null {
  for (const s of SECTORS) {
    if (s.donorRegex.test(donorName)) return s;
  }
  return null;
}

export function sectorForVote(title: string | null | undefined): Sector | null {
  if (!title) return null;
  const lower = title.toLowerCase();
  for (const s of SECTORS) {
    for (const kw of s.voteKeywords) {
      if (lower.includes(kw)) return s;
    }
  }
  return null;
}

// Flat list of every vote keyword across all sectors — used to build
// the server-side .or() ILIKE filter.
export const ALL_VOTE_KEYWORDS: string[] = SECTORS.flatMap((s) => s.voteKeywords);
