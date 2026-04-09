const fs = require('fs');
const path = require('path');

const BASE = path.join(process.env.HOME, 'peoples-chamber-frontend/lib/departments');

const departments = [
  { slug: 'home-office', govukSlug: 'home-office', name: 'Home Office', zones: ['Small Boats', 'Immigration', 'Policing', 'Counter-Terrorism', 'Drugs', 'Passports & Visas', 'Prisons', 'Crime', 'Borders', 'Asylum', 'Firearms', 'Organised Crime', 'Human Trafficking', 'Identity & Biometrics', 'Fire Service', 'Emergency Services', 'Extremism & Radicalisation', 'GCHQ Oversight', 'Mi5 Oversight', 'Deportation Policy'] },
  { slug: 'health', govukSlug: 'department-of-health-and-social-care', name: 'Department of Health and Social Care', zones: ['NHS Funding', 'NHS Waiting Lists', 'Social Care', 'Mental Health', 'GP Services', 'Hospitals', 'Dentistry', 'Medicines & Pharmacy', 'Public Health', 'Cancer Treatment', 'Ambulance Services', 'Care Homes', 'Disability Support', 'Vaccines', 'Obesity Strategy', 'Alcohol & Drug Treatment', "Women's Health", "Children's Health", 'NHS Workforce', 'Patient Safety'] },
  { slug: 'energy', govukSlug: 'department-for-energy-security-and-net-zero', name: 'Department for Energy Security and Net Zero', zones: ['Energy Bills', 'Net Zero', 'Renewable Energy', 'Nuclear Power', 'North Sea Oil & Gas', 'Energy Price Cap', 'Solar & Wind', 'Home Insulation', 'Heat Pumps', 'Carbon Targets', 'Hydrogen Strategy', 'Electricity Grid', 'Energy Storage', 'Smart Meters', 'Fuel Poverty', 'Carbon Capture', 'EV Infrastructure', 'Green Jobs', 'Energy Security', 'International Climate Finance'] },
  { slug: 'education', govukSlug: 'department-for-education', name: 'Department for Education', zones: ['Schools Funding', 'Curriculum', 'Ofsted', 'Teacher Pay', 'University Tuition Fees', 'Student Loans', 'Free School Meals', 'SEND Provision', 'Early Years & Childcare', 'Academies & Free Schools', 'Grammar Schools', 'Skills & Apprenticeships', 'Further Education', 'Higher Education', 'Children in Care', 'Safeguarding', 'School Buildings', 'Attendance & Exclusions', 'Teacher Recruitment', 'Exam Reform'] },
  { slug: 'work-pensions', govukSlug: 'department-for-work-pensions', name: 'Department for Work and Pensions', zones: ['Universal Credit', 'State Pension', 'Disability Benefits', 'PIP', "Jobseeker's Allowance", 'Child Maintenance', "Carer's Allowance", 'Benefit Sanctions', 'Work Capability Assessment', 'Pension Credit', 'Winter Fuel Payment', 'Housing Benefit', 'Benefits Cap', 'Fraud & Error', 'Welfare Reform', 'Employment Support', 'Bereavement Benefits', 'Maternity & Paternity Pay', 'Auto-Enrolment Oversight', 'Retirement Age'] },
  { slug: 'transport', govukSlug: 'department-for-transport', name: 'Department for Transport', zones: ['Rail', 'Roads & Motorways', 'HS2', 'Aviation', 'Driving Licences & DVLA', 'Road Tax', 'Bus Services', 'Active Travel', 'Electric Vehicles', 'Freight & Logistics', 'Maritime & Ports', 'Road Safety', 'Speed Limits', 'Transport for London', 'Northern Powerhouse Rail', 'Cycling Infrastructure', 'MOT & Vehicle Standards', 'Autonomous Vehicles', 'Drones', 'Transport Decarbonisation'] },
  { slug: 'environment', govukSlug: 'department-for-environment-food-rural-affairs', name: 'Department for Environment Food and Rural Affairs', zones: ['Farming Subsidies', 'Food Standards', 'Water Quality', 'Air Quality', 'Biodiversity', 'Rewilding', 'Flood Defence', 'Fishing & Fisheries', 'Animal Welfare', 'Pesticides', 'Waste & Recycling', 'Plastic Pollution', 'National Parks', 'Tree Planting', 'Inheritance Tax on Farms', 'Sewage & Water Companies', 'Rural Affairs', 'Food Security', 'Veterinary Services', 'Climate Adaptation'] },
  { slug: 'business-trade', govukSlug: 'department-for-business-and-trade', name: 'Department for Business and Trade', zones: ['Trade Deals', 'Export Support', 'Business Regulation', "Workers' Rights", 'Minimum Wage', 'Employment Law', 'Small Business Support', 'Competition Policy', 'Post Office', 'Companies House', 'Intellectual Property', 'Consumer Rights', 'Product Safety', 'US Tariffs', 'Invest in Great Britain', 'Industrial Strategy', 'Free Ports', 'Steel Industry', 'Automotive Sector', 'Tech Sector Support'] },
  { slug: 'science-tech', govukSlug: 'department-for-science-innovation-and-technology', name: 'Department for Science Innovation and Technology', zones: ['AI Strategy', 'R&D Funding', 'Broadband & Digital Infrastructure', 'Online Safety', 'Cybersecurity', 'Space', 'Life Sciences', 'Quantum Computing', 'Data & Privacy', 'Tech Regulation', 'UKRI', 'University Research Funding', 'Digital Government', 'Semiconductors', 'Tech Visas', 'Science Diplomacy', 'Nuclear Research', 'Robotics', 'Digital Identity', 'Tech Skills'] },
  { slug: 'housing', govukSlug: 'ministry-of-housing-communities-local-government', name: 'Ministry of Housing Communities and Local Government', zones: ['Housebuilding Targets', 'Planning Reform', 'Affordable Housing', 'Social Housing', "Renters' Rights", 'Leasehold Reform', 'Local Government Funding', 'Council Tax', 'Rough Sleeping', 'Homelessness', 'Building Safety', 'Grenfell Legacy', 'Devolution', 'Mayoral Authorities', 'Community Cohesion', 'Levelling Up', 'Empty Homes', 'Green Belt', 'First Homes Scheme', 'Housing Benefits Oversight'] },
  { slug: 'justice', govukSlug: 'ministry-of-justice', name: 'Ministry of Justice', zones: ['Prisons', 'Probation', 'Courts & Tribunals', 'Legal Aid', 'Sentencing Policy', 'Youth Justice', 'Rehabilitation', 'Prison Overcrowding', 'Parole Board', 'Judicial Appointments', 'Human Rights Act', 'ECHR', "Victims' Rights", 'Family Courts', 'Civil Courts', 'Magistrates', 'Community Sentences', 'Reoffending Rates', 'Prison Staff', 'Crown Prosecution Service Liaison'] },
  { slug: 'defence', govukSlug: 'ministry-of-defence', name: 'Ministry of Defence', zones: ['Defence Budget', 'Armed Forces', 'Nuclear Deterrent', 'NATO Commitment', 'Ukraine Support', 'Army', 'Royal Navy', 'RAF', "Veterans' Support", 'Defence Procurement', 'Cyber Warfare', 'Intelligence Services', 'Reserve Forces', 'Military Housing', 'Defence Industry', 'Space Defence', 'Drone Warfare', 'Special Forces', 'Military Justice', 'Overseas Bases'] },
  { slug: 'culture', govukSlug: 'department-for-culture-media-and-sport', name: 'Department for Culture Media and Sport', zones: ['BBC & Broadcasting', 'Press Regulation', 'Arts Funding', 'Sport Funding', 'Olympics', 'Gambling Regulation', 'Tourism', 'Heritage & Museums', 'Creative Industries', 'Film & TV', 'Music Industry', 'Libraries', 'Gaming', 'Esports', 'National Lottery', 'Football Regulation', 'Internet Safety', 'Online Harms', 'Copyright', 'Public Monuments'] },
  { slug: 'cabinet-office', govukSlug: 'cabinet-office', name: 'Cabinet Office', zones: ['Civil Service Reform', 'Government Efficiency', 'Constitution & Democracy', 'Elections & Voting', 'National Security', 'Emergency Planning', 'Government Digital Service', 'Public Procurement', 'Honours System', 'Cabinet Committees', 'Ministerial Code', 'Union Policy', 'Devolution Oversight', 'Government Communications', 'Central Government Pay', 'Counter-Corruption', 'Lobbying Regulation', 'Freedom of Information', 'Data Sharing', 'AI in Government'] },
  { slug: 'foreign-office', govukSlug: 'foreign-commonwealth-development-office', name: 'Foreign Commonwealth and Development Office', zones: ['UK-EU Relations', 'US Relations', 'China Policy', 'Russia Sanctions', 'Ukraine Diplomacy', 'Middle East Policy', 'UN Security Council', 'NATO', 'Commonwealth', 'Foreign Aid', 'Consular Services', 'British Overseas Territories', 'Trade Diplomacy', 'Climate Diplomacy', 'Human Rights Policy', 'Sanctions', 'Counter-Terrorism Overseas', 'Refugee & Asylum Diplomacy', 'Gibraltar', 'Falklands'] },
  { slug: 'attorney-general', govukSlug: 'attorney-generals-office', name: "Attorney General's Office", zones: ['Legal Advice to Government', 'Crown Prosecution Service', 'Serious Fraud Office', 'Government Litigation', 'Public Interest Immunity', 'Treaty Obligations', 'International Law', 'Contempt of Court', 'Unduly Lenient Sentences', 'Law Officers'] },
  { slug: 'scotland-office', govukSlug: 'scotland-office', name: 'Scotland Office', zones: ['Scottish Devolution', 'Scotland Act', 'Barnett Formula', 'Independence Referendum', 'UK-Scotland Relations', 'Reserved Matters', 'Scottish Parliament Liaison', "Scotland's Budget", 'Cross-Border Issues', 'Scotland in the Union'] },
  { slug: 'wales-office', govukSlug: 'wales-office', name: 'Wales Office', zones: ['Welsh Devolution', 'Wales Act', 'Barnett Formula Wales', 'Senedd Relations', 'Reserved Matters Wales', 'Welsh Budget', 'Cross-Border Issues Wales', 'Wales in the Union', 'Welsh Language Policy', 'Infrastructure in Wales'] },
  { slug: 'northern-ireland-office', govukSlug: 'northern-ireland-office', name: 'Northern Ireland Office', zones: ['Stormont', 'Windsor Framework', 'Good Friday Agreement', 'NI Protocol', 'Cross-Border Relations', 'NI Budget', 'Legacy Issues', "Victims' Issues", 'NI Security', 'NI in the Union'] },
  { slug: 'commons-leader', govukSlug: 'privy-council-office', name: 'Office of the Leader of the House of Commons', zones: ['Parliamentary Business', 'Legislative Programme', 'Commons Procedure', 'Government Bills Timetable', 'Opposition Day Debates', 'Select Committees', 'Parliamentary Questions', 'Recess Dates', 'Commons Reform', 'Speaker Relations'] },
  { slug: 'lords-leader', govukSlug: 'office-of-the-leader-of-the-house-of-lords', name: 'Office of the Leader of the House of Lords', zones: ['Lords Business', 'Lords Reform', 'Hereditary Peers', 'Life Peers Appointments', 'Lords Procedure', 'Government Bills in Lords', 'Lords Amendments', 'Lords Committees', 'Lords Attendance', 'Lords Expenses'] },
  { slug: 'advocate-general', govukSlug: 'office-of-the-advocate-general-for-scotland', name: 'Office of the Advocate General for Scotland', zones: ['Scots Law Advice', 'Scottish Legal Issues', 'UK Legislation in Scotland', 'Devolution Legal Questions', 'Treaty Law Scotland', 'Scottish Courts Liaison', 'Law Reform Scotland', 'Public Inquiries Scotland', 'Scottish Bar Relations', 'Constitutional Law Scotland'] },
  { slug: 'ukef', govukSlug: 'uk-export-finance', name: 'UK Export Finance', zones: ['Export Guarantees', 'Export Insurance', 'Trade Finance', 'Overseas Investment', 'Defence Exports', 'Infrastructure Exports', 'Green Export Finance', 'Fossil Fuel Export Finance', 'SME Export Support', 'Direct Lending'] },
];

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? require('https') : require('http');
    mod.get(url, { headers: { 'Accept': 'application/json', 'User-Agent': 'PeoplesChamber/1.0' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return httpGet(res.headers.location).then(resolve).catch(reject);
      }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function stripHtml(html) {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractSentences(text, maxChars) {
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  let result = '';
  for (const s of sentences) {
    if ((result + s).length > maxChars) break;
    result += s;
  }
  return result.trim() || text.slice(0, maxChars);
}

async function fetchZoneContext(zone, govukSlug) {
  try {
    const query = encodeURIComponent(zone);
    const searchUrl = `https://www.gov.uk/api/search.json?filter_organisations=${govukSlug}&q=${query}&order=-public_timestamp&count=3`;
    const searchRaw = await httpGet(searchUrl);
    const searchData = JSON.parse(searchRaw);
    const results = searchData.results || [];
    for (const result of results) {
      const link = result.link;
      if (!link) continue;
      const apiUrl = `https://www.gov.uk/api/content${link}`;
      const contentRaw = await httpGet(apiUrl);
      const contentData = JSON.parse(contentRaw);
      let text = '';
      const body = contentData.details?.body || '';
      if (body) text = stripHtml(body);
      const parts = contentData.details?.parts || [];
      for (const part of parts) text += ' ' + stripHtml(part.body || '');
      text = text.trim();
      if (text.length > 100) return extractSentences(text, 600);
    }
    return '';
  } catch (e) {
    return '';
  }
}

function zoneToFilename(zone) {
  return zone.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function zoneToVarName(zone) {
  return zoneToFilename(zone).replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
}

async function main() {
  for (const dept of departments) {
    const deptDir = path.join(BASE, dept.slug);
    const cacheFile = path.join(deptDir, '_zones_cache.json');
    const existing = fs.existsSync(cacheFile) ? JSON.parse(fs.readFileSync(cacheFile, 'utf8')) : {};

    console.log(`\n=== ${dept.name} ===`);

    for (const zone of dept.zones) {
      if (existing[zone]) { console.log(`  skip ${zone}`); continue; }
      process.stdout.write(`  ${zone}... `);
      const context = await fetchZoneContext(zone, dept.govukSlug);
      existing[zone] = context || `${zone} is a key policy area overseen by the ${dept.name}.`;
      fs.writeFileSync(cacheFile, JSON.stringify(existing, null, 2));
      console.log(context ? 'done' : 'placeholder');
      await new Promise(r => setTimeout(r, 300));
    }

    for (const zone of dept.zones) {
      const context = (existing[zone] || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, ' ');
      const filename = zoneToFilename(zone);
      const tsContent = `import type { ControlZoneData } from '../types';

const data: ControlZoneData = {
  zone: '${zone.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}',
  context: '${context}',
  positions: [],
};

export default data;
`;
      fs.writeFileSync(path.join(deptDir, `${filename}.ts`), tsContent);
    }

    const camel = dept.slug.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    const imports = dept.zones.map(z => `import ${zoneToVarName(z)} from './${zoneToFilename(z)}';`).join('\n');
    const zoneList = dept.zones.map(z => zoneToVarName(z)).join(',\n    ');

    const indexContent = `import type { DepartmentData } from '../types';
import meta from './meta';
${imports}

const ${camel}: DepartmentData = {
  ...meta,
  partyPositions: [],
  controlZonePositions: [
    ${zoneList},
  ],
};

export default ${camel};
`;
    fs.writeFileSync(path.join(deptDir, 'index.ts'), indexContent);
    console.log(`  index.ts written`);
  }
  console.log('\n=== Done ===');
}

main().catch(console.error);
