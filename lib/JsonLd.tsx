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

// JSON.stringify handles unicode + escaping; the only sequence we have to guard against inside a <script> body is the
// literal "</", which would close the tag. Replace with a Unicode-escaped form that's identical when parsed back as
// JSON. Exported for scripts/checks/json-ld-check.ts, which parses every block the builders make (run before builds).
export function serialiseJsonLd(data: JsonLdValue): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}

export default function JsonLd({ data }: Props): ReactElement {
  const serialised = serialiseJsonLd(data);
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serialised }}
    />
  );
}

// ----- Schema builders -----------------------------------------------

// The site-wide graph, on every page from the root layout (owner's brief, 3 Nov 2026): the WebSite, with its
// SearchAction pointing at /search?q=, and the Organization (opengovt, with its logo). The homepage used to add the
// Organization on its own; it is now here once, for every page.
export function buildSiteGraph() {
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE}/#website`,
        name: 'opengovt',
        alternateName: ['Open Govt', 'OpenGovt', 'opengovt.uk'],
        url: SITE,
        description: 'Independent UK Parliament tracker and government transparency record.',
        inLanguage: 'en-GB',
        publisher: { '@id': `${SITE}/#org` },
        about: [
          { '@type': 'Thing', name: 'UK politics' },
          { '@type': 'Thing', name: 'UK government transparency' },
          { '@type': 'Thing', name: 'Members of Parliament' },
          { '@type': 'Thing', name: 'Government departments' },
        ],
        potentialAction: {
          '@type': 'SearchAction',
          target: `${SITE}/search?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'Organization',
        '@id': `${SITE}/#org`,
        name: "opengovt",
        alternateName: ['Open Govt', 'OpenGovt', 'opengovt.uk'],
        url: `${SITE}/`,
        // The header wordmark, one line in its stamp, on cream (public/brand-logo.png, 1200 by 428, owner, 30 Oct 2026).
        logo: { '@type': 'ImageObject', url: `${SITE}/brand-logo.png`, width: 1200, height: 428 },
        description:
          'Independent UK Parliament tracker and government transparency record.',
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

// The latest stored update date of a report (editorials.update_note, [{ date: 'YYYY-MM-DD', text }]), as an ISO
// timestamp; null if it has none. Only a true stored date: never the facts checked date, a deploy or an import time.
export function latestUpdateIso(updateNote: { date: string }[] | null | undefined): string | null {
  const isos = (updateNote ?? []).map((u) => ukDateIso(u?.date)).filter((d): d is string => !!d).sort();
  return isos.length ? isos[isos.length - 1] : null;
}

// When a report last changed, as an ISO timestamp: its latest update date (latestUpdateIso), or else its publish date;
// null if it has neither. The one rule for both the NewsArticle dateModified and the sitemap's <lastmod>, so the two can
// never disagree. T1-UPDATED (Cowork, 13 Nov 2026, accuracy): the facts checked date is no longer used for either, as
// checking a report's facts does not change it.
export function editorialModifiedIso(updateNote: { date: string }[] | null | undefined, publishedAt: string | null | undefined): string | null {
  const published = publishedAt ? editorialDateIso(publishedAt) : null;
  const updated = latestUpdateIso(updateNote);
  if (updated && published) return updated > published ? updated : published;
  return updated ?? published;
}

// The update date to show next to the published date ("Updated 5 November 2026"): the latest update date, only when it
// is later than the publish date (T1-UPDATED, Cowork 13 Nov 2026: not when the update was made the day it was published).
export function shownUpdateIso(updateNote: { date: string }[] | null | undefined, publishedAt: string | null | undefined): string | null {
  const updated = latestUpdateIso(updateNote);
  const published = publishedAt ? editorialDateIso(publishedAt) : null;
  return updated && published && updated.slice(0, 10) > published.slice(0, 10) ? updated : null;
}

// NewsArticle for editorial/investigation pages — the content most likely to
// earn rich results. headline + datePublished are the load-bearing fields.
export function buildEditorialArticle(opts: {
  slug: string;
  headline: string;
  description?: string | null;
  datePublished?: string | null;
  author?: string | null;
  /** The report's stored updates (update_note); dateModified is the latest, or datePublished (editorialModifiedIso). */
  updateNote?: { date: string }[] | null;
  /** The MPs the piece names (relatedMemberIds), each with their opengovt page (owner's brief, 3 Nov 2026). */
  mentions?: { memberId: number; name: string }[];
}) {
  const published = opts.datePublished ? editorialDateIso(opts.datePublished) : null;
  const modified = editorialModifiedIso(opts.updateNote, opts.datePublished);
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: opts.headline,
    ...(opts.description ? { description: opts.description } : {}),
    ...(published ? { datePublished: published } : {}),
    // dateModified (T1-UPDATED, 13 Nov 2026): the piece's latest stored update date, or its publish date.
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
        url: `${SITE}/brand-logo.png`,
        width: 1200,
        height: 428,
      },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${SITE}/editorials/${opts.slug}` },
    url: `${SITE}/editorials/${opts.slug}`,
    ...(opts.mentions?.length
      ? { mentions: opts.mentions.map((m) => ({ '@type': 'Person', name: m.name, url: `${SITE}/mps/${m.memberId}` })) }
      : {}),
  };
}

// BreadcrumbList (23 Oct 2026): Home, the section, then the page itself, with absolute URLs.
// Donor pages (owner, 1 Nov 2026): Organization unless the donor is an individual, then Person; name and canonical url
// only, no other claims.
export function buildDonorEntity(opts: { slug: string; name: string; individual: boolean }) {
  return {
    '@context': 'https://schema.org',
    '@type': opts.individual ? 'Person' : 'Organization',
    name: opts.name,
    url: `${SITE}/donors/${opts.slug}`,
  };
}

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

// MP profiles (owner's brief, 3 Nov 2026): name, url and sameAs the member's page on members.parliament.uk for every
// MP; for a current MP only, jobTitle "Member of Parliament", the party as memberOf (an Organization) and the House of
// Commons as affiliation (a former member's party and seat are history, so neither is claimed). Only values already on
// the page.
export function buildMpPerson(opts: {
  memberId: number;
  fullName: string;
  party: string | null;
  photoUrl?: string | null;
  former?: boolean;
}) {
  const current = !opts.former;
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    '@id': `${SITE}/mps/${opts.memberId}#person`,
    name: opts.fullName,
    ...(current ? { jobTitle: 'Member of Parliament' } : {}),
    ...(current && opts.party ? { memberOf: { '@type': 'Organization', name: opts.party } } : {}),
    ...(current
      ? { affiliation: { '@type': 'GovernmentOrganization', name: 'House of Commons', url: 'https://www.parliament.uk/business/commons/' } }
      : {}),
    sameAs: [`https://members.parliament.uk/member/${opts.memberId}`],
    image: opts.photoUrl || undefined,
    url: `${SITE}/mps/${opts.memberId}`,
  };
}

export function buildBillLegislation(opts: {
  billId: number;
  title: string;
  legislationDate: string | null; // ISO date
  isLaw: boolean; // these three from lib/bill-status.ts (UX1a)
  defeated: boolean;
  withdrawn: boolean;
  sponsorName: string | null;
}) {
  // legislationLegalForce (23 Oct 2026; legislationStatus is not a schema.org property): a bill, whether before
  // Parliament, withdrawn or defeated, is not in force. An Act's commencement can follow Royal Assent, so no force
  // status is claimed for it.
  const legalForce = opts.isLaw ? undefined : 'https://schema.org/NotInForce';

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
    legislationType: opts.isLaw ? 'Act' : 'Bill',
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
