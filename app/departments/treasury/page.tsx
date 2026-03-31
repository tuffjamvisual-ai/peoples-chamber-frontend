'use client';

import { useState } from 'react';
import Navigation from '../../components/Navigation';
import Link from 'next/link';

const partyPositions = [
  { party: 'Labour', colour: '#d50000', position: 'Maintaining fiscal rules with debt falling as share of GDP. Raised employer National Insurance by 1.2% raising £15bn. Froze income tax thresholds until 2028. Windfall tax on oil and gas companies. Scrapped planned income tax rise after public backlash. Spring 2026 forecast shows inflation falling to 2.3% and borrowing down to £133bn.' },
  { party: 'Conservative', colour: '#0087dc', position: 'Cut taxes for workers and businesses. Scrap net zero levies saving families £165/year. Oppose NI rise which costs businesses £5bn. Reverse fiscal drag by unfreezing tax thresholds. Pro-growth economic agenda with deregulation.' },
  { party: 'Reform UK', colour: '#12b6cf', position: 'Raise income tax threshold to £20,000 taking millions out of tax. Abolish inheritance tax for estates under £2m. Cut corporation tax for small businesses. No new stealth taxes. Slash government waste to fund tax cuts. Scrap the Budget Black Hole narrative.' },
  { party: 'Liberal Democrats', colour: '#faa61a', position: 'Windfall tax on banks making excess profits. Wealth tax on assets over £10m. Invest in public services over tax cuts. Reform business rates to support high street. Oppose fiscal drag and frozen thresholds.' },
  { party: 'Green Party', colour: '#02a95b', position: 'Wealth tax on the super-rich. Financial transaction tax on City trades. End fossil fuel subsidies. Fund public services through progressive taxation. Scrap VAT on home insulation and repairs.' },
  { party: 'SNP', colour: '#fff200', position: 'Full fiscal autonomy for Scotland. Oppose UK-wide austerity. Invest in public services not tax cuts for the wealthy. End the two-child benefit cap. Scrap the freeze on income tax thresholds.' },
  { party: 'Plaid Cymru', colour: '#005b54', position: 'Full fiscal powers for Wales. Oppose austerity that harms Welsh communities. Windfall taxes on excessive profits. Wales needs its own borrowing powers. End fiscal drag hitting Welsh workers.' },
  { party: 'Workers Party', colour: '#8b0000', position: 'Tax the rich properly. Nationalise banks. No more austerity. Public ownership of key industries. Cancel the debt created by banker bailouts. End corporate tax avoidance costing £90bn a year.' },
];

const obr = {
  inflation: '2.3%',
  debt: '93% of GDP',
  borrowing: '£133bn',
  gdp: '1.1%',
  bankRate: '3.75%',
  updated: '3 March 2026',
};

export default function TreasuryPage() {
  const [salary, setSalary] = useState(35000);

  const personalAllowance = 12570;
  const basicRateLimit = 50270;
  const higherRateLimit = 125140;

  let incomeTax = 0;
  if (salary > personalAllowance) {
    const taxable = salary - personalAllowance;
    if (salary <= basicRateLimit) {
      incomeTax = taxable * 0.20;
    } else if (salary <= higherRateLimit) {
      incomeTax = (basicRateLimit - personalAllowance) * 0.20 + (salary - basicRateLimit) * 0.40;
    } else {
      incomeTax = (basicRateLimit - personalAllowance) * 0.20 + (higherRateLimit - basicRateLimit) * 0.40 + (salary - higherRateLimit) * 0.45;
    }
  }

  const niThreshold = 12570;
  const niUpperLimit = 50270;
  let ni = 0;
  if (salary > niThreshold) {
    if (salary <= niUpperLimit) {
      ni = (salary - niThreshold) * 0.08;
    } else {
      ni = (niUpperLimit - niThreshold) * 0.08 + (salary - niUpperLimit) * 0.02;
    }
  }

  const totalDeducted = incomeTax + ni;
  const takeHome = salary - totalDeducted;
  const effectiveRate = salary > 0 ? Math.round((totalDeducted / salary) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#0a0f1a]">
      <Navigation />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pb-12">

        <div className="flex items-center gap-3 mb-6">
          <Link href="/departments" className="text-gray-400 hover:text-white text-sm flex items-center gap-1">
            ← Departments
          </Link>
        </div>

        {/* Header */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6" style={{ borderLeftColor: '#d4af37', borderLeftWidth: '4px' }}>
          <div className="flex items-start gap-6">
            <img
              src="https://members-api.parliament.uk/api/Members/4611/Thumbnail"
              alt="Rachel Reeves"
              className="w-24 h-24 rounded-full object-cover flex-shrink-0 border-2 border-yellow-600"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs px-2 py-0.5 bg-yellow-900/40 text-yellow-300 rounded border border-yellow-700/40">Ultimate Power Centre</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-1">HM Treasury</h1>
              <p className="text-gray-400 text-sm mb-3">Controls the nation's finances — every other department answers to the Treasury for money.</p>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-gray-500 text-sm">Chancellor:</span>
                <span className="text-white font-medium text-sm">Rachel Reeves MP</span>
                <span className="text-xs px-2 py-0.5 rounded text-white" style={{ backgroundColor: '#d50000' }}>Labour</span>
                <span className="text-xs text-gray-500">First female Chancellor in UK history</span>
              </div>
            </div>
          </div>
        </div>

        {/* OBR Live Stats */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-white">Live Economic Data</h2>
            <span className="text-xs text-gray-500">OBR Spring Forecast · Updated {obr.updated}</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'CPI Inflation', value: obr.inflation, color: 'text-amber-400' },
              { label: 'National Debt', value: obr.debt, color: 'text-red-400' },
              { label: 'Annual Borrowing', value: obr.borrowing, color: 'text-orange-400' },
              { label: 'GDP Growth', value: obr.gdp, color: 'text-green-400' },
              { label: 'Bank Rate', value: obr.bankRate, color: 'text-blue-400' },
              { label: 'Debt/GDP', value: '95%', color: 'text-purple-400' },
            ].map((stat) => (
              <div key={stat.label} className="bg-gray-900 border border-gray-800 rounded-lg p-3 text-center">
                <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-gray-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 text-xs text-gray-600">
            Source: <a href="https://obr.uk/efo/economic-and-fiscal-outlook-march-2026/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">OBR Economic and Fiscal Outlook March 2026</a>
          </div>
        </div>

        {/* Control Zones */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">What The Treasury Controls</h2>
          <div className="flex flex-wrap gap-2">
            {['Income Tax', 'National Insurance', 'VAT', 'The Budget', 'Pensions', 'Banks', 'Inflation', 'Cost of Living', 'National Debt', 'Economic Growth', 'Crypto & Digital Money', 'Mortgage Rules'].map((zone) => (
              <span key={zone} className="px-3 py-1.5 bg-yellow-900/20 text-yellow-300 rounded-lg text-sm border border-yellow-800/30">{zone}</span>
            ))}
          </div>
        </div>

        {/* Current Street Issues */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Current Street Issues — March 2026</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { title: 'Energy Bill Support', desc: 'Middle East conflict pushing gas prices up. Treasury deciding whether to reinstate household support payments. Average bill £1,738/year.', hot: true },
              { title: 'The Tax Trap', desc: 'Frozen income tax thresholds mean 3.7m more people paying higher rate tax by 2028 as wages rise. Treasury calls it "fiscal drag." Public calls it a stealth tax.', hot: true },
              { title: 'Mortgage Support', desc: 'Reeves meeting banks to ensure support for families struggling with mortgage payments as rates remain above 4%.', hot: false },
              { title: 'Crypto Regulation', desc: 'New rules for cryptoassets coming in 2026. Treasury wants to be global hub for digital finance while cracking down on fraud.', hot: false },
            ].map((issue) => (
              <div key={issue.title} className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-white font-medium text-sm">{issue.title}</h3>
                  {issue.hot && <span className="text-xs px-1.5 py-0.5 bg-red-900/40 text-red-400 rounded border border-red-800/40">Hot</span>}
                </div>
                <p className="text-gray-400 text-xs leading-relaxed">{issue.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tax Calculator */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-1">Your Tax Calculator</h2>
          <p className="text-gray-500 text-xs mb-4">See how much of your salary goes to the Treasury (2024/25 rates)</p>

          <div className="mb-4">
            <label className="text-sm text-gray-400 mb-2 block">Annual Salary: <span className="text-white font-semibold">£{salary.toLocaleString()}</span></label>
            <input
              type="range"
              min="0"
              max="200000"
              step="1000"
              value={salary}
              onChange={(e) => setSalary(parseInt(e.target.value))}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>£0</span>
              <span>£100,000</span>
              <span>£200,000</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-green-400">£{Math.round(takeHome).toLocaleString()}</div>
              <div className="text-xs text-gray-500 mt-1">Take Home</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-red-400">£{Math.round(incomeTax).toLocaleString()}</div>
              <div className="text-xs text-gray-500 mt-1">Income Tax</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-orange-400">£{Math.round(ni).toLocaleString()}</div>
              <div className="text-xs text-gray-500 mt-1">National Insurance</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-3 text-center">
              <div className="text-lg font-bold text-amber-400">{effectiveRate}%</div>
              <div className="text-xs text-gray-500 mt-1">Effective Rate</div>
            </div>
          </div>

          <div className="h-3 bg-gray-800 rounded-full overflow-hidden flex">
            <div className="bg-green-600 h-full transition-all" style={{ width: `${(takeHome / salary) * 100}%` }} />
            <div className="bg-red-600 h-full transition-all" style={{ width: `${(incomeTax / salary) * 100}%` }} />
            <div className="bg-orange-600 h-full transition-all" style={{ width: `${(ni / salary) * 100}%` }} />
          </div>
          <div className="flex gap-4 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-600 inline-block"></span>Take home</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-600 inline-block"></span>Income tax</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-orange-600 inline-block"></span>NI</span>
          </div>
        </div>

        {/* Party Positions */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">Where Every Party Stands on Tax & the Economy</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {partyPositions.map((pos) => (
              <div key={pos.party} className="bg-gray-900 border border-gray-800 rounded-xl p-5" style={{ borderLeftColor: pos.colour, borderLeftWidth: '4px' }}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm font-bold text-white px-3 py-1 rounded-full" style={{ backgroundColor: pos.colour }}>{pos.party}</span>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed">{pos.position}</p>
              </div>
            ))}
          </div>
        </div>

      </main>
    </div>
  );
}
