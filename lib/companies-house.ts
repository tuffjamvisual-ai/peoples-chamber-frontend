// Companies House numbers and addresses, with no database client, so pages and client components can share them.
// A number as Companies House writes it (normalise_company_number in SQL): 8 digits, or 2 letters and 6 digits, so a
// short form recorded elsewhere ('SC93761' in the Electoral Commission register) links to the right record (SC093761)
// (T2's follow-up to Cowork ENTRY 422; backlog job 7 of ENTRY 429).

export function normaliseCompanyNumber(raw: string): string | null {
  const c = raw.toUpperCase().replace(/\s/g, '');
  if (/^0*$/.test(c) || /^[A-Z]{2}0*$/.test(c)) return null;
  if (/^[0-9]{1,8}$/.test(c)) return c.padStart(8, '0');
  if (/^[A-Z]{2}[0-9]{1,6}$/.test(c)) return c.slice(0, 2) + c.slice(2).padStart(6, '0');
  return null;
}

// The number to show and link: Companies House's own form where the recorded one can be read, else as recorded.
export const companyNumberAsFiled = (raw: string): string => normaliseCompanyNumber(raw) ?? raw.trim();

export const companiesHouseUrl = (raw: string): string =>
  `https://find-and-update.company-information.service.gov.uk/company/${encodeURIComponent(companyNumberAsFiled(raw))}`;
