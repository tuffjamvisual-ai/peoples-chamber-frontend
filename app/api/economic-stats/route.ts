import { NextResponse } from 'next/server';

export const revalidate = 3600;

export type EconomicStats = {
  cpi: string;
  cpiDate: string;
  bankRate: string;
  nationalDebt: string;
  annualBorrowing: string;
  gdpGrowth: string;
  debtGDP: string;
  lastUpdated: string;
};

const FALLBACK: EconomicStats = {
  cpi: '3.0',
  cpiDate: 'February 2026',
  bankRate: '3.75',
  nationalDebt: '93% of GDP',
  annualBorrowing: '£133bn',
  gdpGrowth: '1.1%',
  debtGDP: '95%',
  lastUpdated: new Date().toISOString(),
};

export async function getEconomicStats(): Promise<EconomicStats> {
  try {
    const cpiRes = await fetch(
      'https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/d7g7/mm23/data',
      { next: { revalidate: 3600 } },
    );
    const cpiData = await cpiRes.json();
    const months = cpiData.months;
    const latest = months[months.length - 1];
    return {
      ...FALLBACK,
      cpi: latest.value,
      cpiDate: latest.month + ' ' + latest.year,
      lastUpdated: new Date().toISOString(),
    };
  } catch {
    return FALLBACK;
  }
}

export async function GET() {
  return NextResponse.json(await getEconomicStats());
}
