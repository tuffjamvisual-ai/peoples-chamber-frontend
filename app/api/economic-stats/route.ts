import { NextResponse } from 'next/server';

export const revalidate = 3600;

export async function GET() {
  try {
    const cpiRes = await fetch(
      'https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/d7g7/mm23/data',
      { next: { revalidate: 3600 } }
    );
    const cpiData = await cpiRes.json();
    const months = cpiData.months;
    const latest = months[months.length - 1];
    const cpi = latest.value;
    const cpiDate = latest.month + ' ' + latest.year;

    return NextResponse.json({
      cpi,
      cpiDate,
      bankRate: '3.75',
      nationalDebt: '93% of GDP',
      annualBorrowing: '£133bn',
      gdpGrowth: '1.1%',
      debtGDP: '95%',
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json({
      cpi: '3.0',
      cpiDate: 'February 2026',
      bankRate: '3.75',
      nationalDebt: '93% of GDP',
      annualBorrowing: '£133bn',
      gdpGrowth: '1.1%',
      debtGDP: '95%',
      lastUpdated: new Date().toISOString(),
    });
  }
}
