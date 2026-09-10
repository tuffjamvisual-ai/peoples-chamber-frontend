import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const PUB_URL =
  'https://publications.parliament.uk/pa/cm5902/cmselect/cmpubacc/88/report.html';
const COM_URL =
  'https://committees.parliament.uk/publications/54849';
const ROBOTS_URL =
  'https://publications.parliament.uk/robots.txt';

const VARIANTS: { label: string; headers: Record<string, string> }[] = [
  { label: '1. bare (no headers)', headers: {} },
  {
    label: '2. site UA',
    headers: { 'User-Agent': 'PeoplesChamber/1.0' },
  },
  {
    label: '3. desktop browser UA',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
    },
  },
  {
    label: '4. browser UA + Accept + Accept-Language',
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-GB,en;q=0.9',
    },
  },
];

async function probe(url: string, headers: Record<string, string>) {
  try {
    const res = await fetch(url, {
      headers,
      redirect: 'follow',
      cache: 'no-store',
    });
    const body = await res.text();
    return {
      status: res.status,
      finalUrl: res.url,
      bytes: body.length,
      preview: body.slice(0, 200),
    };
  } catch (e) {
    return { error: (e as Error).message };
  }
}

export async function GET() {
  const [pubResults, comResults, robotsResult] = await Promise.all([
    Promise.all(
      VARIANTS.map(async (v) => ({ label: v.label, ...(await probe(PUB_URL, v.headers)) }))
    ),
    Promise.all(
      VARIANTS.map(async (v) => ({ label: v.label, ...(await probe(COM_URL, v.headers)) }))
    ),
    probe(ROBOTS_URL, {}),
  ]);

  return NextResponse.json({
    publications_parliament_uk: pubResults,
    committees_parliament_uk: comResults,
    robots_txt: robotsResult,
  });
}
