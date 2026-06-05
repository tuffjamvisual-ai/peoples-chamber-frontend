// Server-rendered <script type="application/ld+json"> injector.
//
// One component, six schemas (WebSite/Organization for the homepage,
// Person for MPs, Legislation for bills, GovernmentOrganization for
// departments, WebPage for transparency surfaces). Each call site
// builds its own payload from existing data and passes the object
// through; this file only handles the serialisation + script tag.
//
// Added 2026-06-05 as part of the SEO Phase 1 program.

import type { ReactElement } from 'react';

export const SITE = 'https://www.thepeopleschamber.uk';

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
  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${SITE}/#website`,
        url: `${SITE}/`,
        name: "The People's Chamber",
        description:
          'Track every UK MP, bill, vote and government department in one place.',
        publisher: { '@id': `${SITE}/#org` },
        potentialAction: {
          '@type': 'SearchAction',
          target: `${SITE}/mps?q={search_term_string}`,
          'query-input': 'required name=search_term_string',
        },
      },
      {
        '@type': 'Organization',
        '@id': `${SITE}/#org`,
        name: "The People's Chamber",
        url: `${SITE}/`,
        description:
          'Independent UK Parliament tracker and government transparency platform.',
        sameAs: [] as string[],
      },
    ],
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
  let status: string | undefined;
  if (opts.isAct) status = 'InForce';
  else if (opts.isWithdrawn) status = 'Discontinued';
  else if (opts.isDefeated) status = 'Discontinued';
  else status = 'Proposed';

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
    legislationStatus: status,
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
