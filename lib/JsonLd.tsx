// Server-rendered <script type="application/ld+json"> injector.
//
// One component, seven schemas (WebSite/Organization for the homepage,
// Person for MPs, Legislation for bills, GovernmentOrganization for
// departments, WebPage for transparency surfaces, BreadcrumbList). Each call site
// builds its own payload from existing data and passes the object
// through; this file only handles the serialisation + script tag.
//
// Added 2026-06-05 as part of the SEO Phase 1 program.

import type { ReactElement } from 'react';

export const SITE = 'https://www.opengovt.uk';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JsonLdValue = any;

interface Props {
  data: JsonLdValue;
}

export default function JsonLd({ data }: Props): ReactElement {
  // JSON.stringify handles unicode + escaping; the only sequence we
  // have to guard against inside a <script> body is the literal "</",
  // which would close the tag. Replace with a Unicode-escaped form
  // that's identical when parsed back as JSON.
  const serialised = JSON.stringify(data).replace(/</g, '\\u003c');
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serialised }}
    />
  );
}

// ----- Schema builders -----------------------------------------------

export function buildHomepageGraph() {
  // The site-wide WebSite node (with its SearchAction) is emitted once in the
  // root layout on EVERY page. The homepage therefore only adds the Organization
  // node here — emitting a second WebSite was a duplicate flagged in the SEO
  // audit and has been removed.
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE}/#org`,
        name: "opengovt",
        alternateName: ['Open Govt', 'OpenGovt', 'opengovt.uk'],
        url: `${SITE}/`,
        description:
          'Independent UK Parliament tracker and government transparency platform.',
        sameAs: [] as string[],
      },
    ],
  };
}

// Editorial publish dates are stored date-only ('YYYY-MM-DD'). Schema.org
// datePublished wants strict ISO 8601 with a timezone; normalise a date-only
// value to UTC midnight, and leave (or complete) any value that already
// carries a time/zone. Avoids the "no timezone" Rich Results warning without
// asserting a false time-of-day beyond midnight UTC.
function editorialDateIso(raw: string): string {
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return `${s}T00:00:00Z`;
  if (/[Zz]$/.test(s)) return s.replace(/z$/, 'Z');
  if (/[+-]\d{2}:?\d{2}$/.test(s)) return s; // already has an offset
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(s)) return `${s}:00Z`;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(s)) return `${s}Z`;
  return s;
}

// A UK date as the editorials write it ("23 October 2026") or an ISO date, as an ISO timestamp; null if neither.
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
export function ukDateIso(raw: string | null | undefined): string | null {
  const s = (raw ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return editorialDateIso(s);
  const m = /^(\d{1,2}) ([A-Za-z]+) (\d{4})$/.exec(s);
  const month = m ? MONTHS.indexOf(m[2].toLowerCase()) : -1;
  if (!m || month < 0) return null;
  return `${m[3]}-${String(month + 1).padStart(2, '0')}-${m[1].padStart(2, '0')}T00:00:00Z`;
}

// When a report last changed, as an ISO timestamp: the date its facts were last checked (evidence.lastChecked, as
// written), or else its publish date; null if it has neither. The one rule for both the NewsArticle dateModified and
// the sitemap's <lastmod> (24 Oct 2026), so the two can never disagree.
export function editorialModifiedIso(lastChecked: string | null | undefined, publishedAt: string | null | undefined): string | null {
  return ukDateIso(lastChecked) ?? (publishedAt ? editorialDateIso(publishedAt) : null);
}

// NewsArticle for editorial/investigation pages — the content most likely to
// earn rich results. headline + datePublished are the load-bearing fields.
export function buildEditorialArticle(opts: {
  slug: string;
  headline: string;
  description?: string | null;
  datePublished?: string | null;
  author?: string | null;
  /** evidence.lastChecked, as written ("23 October 2026" or ISO); dateModified falls back to datePublished. */
  lastChecked?: string | null;
}) {
  const published = opts.datePublished ? editorialDateIso(opts.datePublished) : null;
  const modified = editorialModifiedIso(opts.lastChecked, opts.datePublished);
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: opts.headline,
    ...(opts.description ? { description: opts.description } : {}),
    ...(published ? { datePublished: published } : {}),
    // dateModified (23 Oct 2026): the date the piece's facts were last checked, or its publish date.
    ...(modified ? { dateModified: modified } : {}),
    // The piece's own share image (app/editorials/[slug]/opengraph-image.tsx).
    image: { '@type': 'ImageObject', url: `${SITE}/editorials/${opts.slug}/opengraph-image`, width: 1200, height: 630 },
    author: { '@type': 'Organization', name: opts.author || 'opengovt', url: `${SITE}/` },
    publisher: {
      '@type': 'Organization',
      name: 'opengovt',
      url: `${SITE}/`,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE}/logo.png`,
        width: 512,
        height: 279,
      },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE}/editorials/${opts.slug}` },
    url: `${SITE}/editorials/${opts.slug}`,
  };
}

// BreadcrumbList (23 Oct 2026): Home, the section, then the page itself, with absolute URLs.
export function buildBreadcrumbs(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: `${SITE}${it.path}`,
    })),
  };
}

export function buildMpPerson(opts: {
  memberId: number;
  fullName: string;
  party: string | null;
  constituency: string | null;
  photoUrl: string | null;
}) {
  const jobTitle = [
    opts.party,
    opts.constituency ? `MP for ${opts.constituency}` : 'MP',
  ]
    .filter(Boolean)
    .join(' · ');
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${SITE}/mps/${opts.memberId}#person`,
    name: opts.fullName,
    jobTitle,
    memberOf: opts.party
      ? { '@type': 'PoliticalParty', name: opts.party }
      : undefined,
    worksFor: {
      '@type': 'GovernmentOrganization',
      name: 'Parliament of the United Kingdom',
      url: 'https://www.parliament.uk/',
    },
    image: opts.photoUrl || undefined,
    url: `${SITE}/mps/${opts.memberId}`,
  };
}

export function buildBillLegislation(opts: {
  billId: number;
  title: string;
  legislationDate: string | null; // ISO date
  isAct: boolean;
  isDefeated: boolean;
  isWithdrawn: boolean;
  sponsorName: string | null;
}) {
  // legislationLegalForce (23 Oct 2026; legislationStatus is not a schema.org property): a bill, whether before
  // Parliament, withdrawn or defeated, is not in force. An Act's commencement can follow Royal Assent, so no force
  // status is claimed for it.
  const legalForce = opts.isAct ? undefined : 'https://schema.org/NotInForce';

  return {
    '@context': 'https://schema.org',
    '@type': 'Legislation',
    '@id': `${SITE}/bills/${opts.billId}#legislation`,
    name: opts.title,
    legislationDate: opts.legislationDate || undefined,
    legislationIdentifier: String(opts.billId),
    legislationJurisdiction: {
      '@type': 'Country',
      name: 'United Kingdom',
    },
    legislationType: opts.isAct ? 'Act' : 'Bill',
    legislationLegalForce: legalForce,
    sponsor: opts.sponsorName
      ? { '@type': 'Person', name: opts.sponsorName }
      : undefined,
    url: `${SITE}/bills/${opts.billId}`,
  };
}

export function buildDepartmentOrg(opts: {
  slug: string;
  name: string;
  description: string | null;
  sosName: string | null;
  sosMemberId: number | null;
  sosRole: string | null;
}) {
  const employee = opts.sosName
    ? [
        {
          '@type': 'Person' as const,
          name: opts.sosName,
          jobTitle: opts.sosRole || 'Secretary of State',
          url:
            opts.sosMemberId != null
              ? `${SITE}/mps/${opts.sosMemberId}`
              : undefined,
        },
      ]
    : undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'GovernmentOrganization',
    '@id': `${SITE}/departments/${opts.slug}#org`,
    name: opts.name,
    description: opts.description || undefined,
    url: `${SITE}/departments/${opts.slug}`,
    parentOrganization: {
      '@type': 'GovernmentOrganization',
      name: 'Government of the United Kingdom',
    },
    employee,
  };
}

export function buildTransparencyPage(opts: {
  path: string; // e.g. '/transparency/press-releases'
  name: string;
  description: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    '@id': `${SITE}${opts.path}#page`,
    name: opts.name,
    description: opts.description,
    isPartOf: { '@id': `${SITE}/#website` },
    url: `${SITE}${opts.path}`,
  };
}
