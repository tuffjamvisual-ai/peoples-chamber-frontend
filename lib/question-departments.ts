// Parliament's answering departments (owner, backlog item 15c, 6 Nov 2026): one page per Parliament id. Names as Parliament gives them,
// tidied: id 220 has a trailing space, and id 88 appears as "Attorney General" and "Attorney General's Office". page is the site's
// /departments/<slug>. nowPartOf, functionsMovedTo and previously link reorganised departments: Parliament's last questions to 214, 216 and
// 217 were tabled on 14 July 2026. The Machinery of Government statement HLWS298 (21 July 2026) moved 216's functions to 220, 10 and 53.
export type QuestionDepartment = { id: number; name: string; slug: string; page?: string; nowPartOf?: number[]; functionsMovedTo?: number[]; previously?: number[]; source?: { label: string; url: string } };

export const QUESTION_DEPARTMENTS: QuestionDepartment[] = [
  { id: 17, name: 'Department of Health and Social Care', slug: 'health-and-social-care', page: 'health' },
  { id: 7, name: 'Ministry of Housing, Communities and Local Government', slug: 'housing-communities-and-local-government', page: 'housing' },
  { id: 1, name: 'Home Office', slug: 'home-office', page: 'home-office' },
  { id: 11, name: 'Ministry of Defence', slug: 'defence', page: 'defence' },
  { id: 13, name: 'Department for Environment, Food and Rural Affairs', slug: 'environment-food-and-rural-affairs', page: 'environment' },
  { id: 27, name: 'Department for Transport', slug: 'transport', page: 'transport' },
  { id: 60, name: 'Department for Education', slug: 'education', page: 'education' },
  { id: 208, name: 'Foreign, Commonwealth and Development Office', slug: 'foreign-commonwealth-and-development-office', page: 'foreign-office' },
  { id: 14, name: 'Treasury', slug: 'treasury', page: 'treasury' },
  { id: 53, name: 'Cabinet Office', slug: 'cabinet-office', page: 'cabinet-office' },
  { id: 29, name: 'Department for Work and Pensions', slug: 'work-and-pensions', page: 'work-pensions' },
  { id: 215, name: 'Department for Energy Security and Net Zero', slug: 'energy-security-and-net-zero', page: 'energy' },
  { id: 214, name: 'Department for Business and Trade', slug: 'business-and-trade', nowPartOf: [220] },
  { id: 54, name: 'Ministry of Justice', slug: 'justice', page: 'justice' },
  { id: 216, name: 'Department for Science, Innovation and Technology', slug: 'science-innovation-and-technology', functionsMovedTo: [220, 10, 53], source: { label: 'Machinery of Government statement, HLWS298, 21 July 2026', url: 'https://questions-statements.parliament.uk/written-statements/detail/2026-07-21/hlws298' } },
  { id: 217, name: 'Department for Culture, Media and Sport', slug: 'culture-media-and-sport', nowPartOf: [10] },
  { id: 220, name: 'Department for Business, Innovation, Science and Trade', slug: 'business-innovation-science-and-trade', page: 'business-trade', previously: [214, 216] },
  { id: 21, name: 'Northern Ireland Office', slug: 'northern-ireland-office', page: 'northern-ireland-office' },
  { id: 10, name: 'Department for Digital, Culture, Media and Sport', slug: 'digital-culture-media-and-sport', page: 'culture', previously: [217, 216] },
  { id: 31, name: 'Women and Equalities', slug: 'women-and-equalities' },
  { id: 88, name: "Attorney General's Office", slug: 'attorney-generals-office', page: 'attorney-general' },
  { id: 2, name: 'Scotland Office', slug: 'scotland-office', page: 'scotland-office' },
  { id: 28, name: 'Wales Office', slug: 'wales-office', page: 'wales-office' },
  { id: 36, name: "Speaker's Committee on the Electoral Commission", slug: 'speakers-committee-on-the-electoral-commission' },
  { id: 18, name: 'House of Commons Commission', slug: 'house-of-commons-commission' },
  { id: 204, name: 'The Senior Deputy Speaker', slug: 'senior-deputy-speaker' },
  { id: 9, name: 'Church Commissioners', slug: 'church-commissioners' },
  { id: 34, name: 'Leader of the House', slug: 'leader-of-the-house', page: 'commons-leader' },
  { id: 92, name: 'Leader of the House of Lords', slug: 'leader-of-the-house-of-lords', page: 'lords-leader' },
  { id: 90, name: "Speaker's Committee for the Independent Parliamentary Standards Authority", slug: 'speakers-committee-for-ipsa' },
  { id: 213, name: 'Restoration and Renewal Client Board', slug: 'restoration-and-renewal-client-board' },
  { id: 24, name: 'Public Accounts Commission', slug: 'public-accounts-commission' },
  { id: 91, name: 'Members Estimate Committee', slug: 'members-estimate-committee' },
  { id: 23, name: 'Prime Minister', slug: 'prime-minister' },
];

export const departmentById = (id: number | null | undefined) => QUESTION_DEPARTMENTS.find((d) => d.id === id);
export const departmentBySlug = (slug: string | null | undefined) => QUESTION_DEPARTMENTS.find((d) => d.slug === slug);
export const departmentForPage = (page: string) => QUESTION_DEPARTMENTS.find((d) => d.page === page);
