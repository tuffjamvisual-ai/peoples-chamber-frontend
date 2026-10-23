import type { EditorialEntry } from './types';

// Third in the Harborne / Reform crypto series. Corrected text approved by John on
// 22 Oct 2026, every fact checked against the bill PDF, Parliament's member record,
// the Commissioner's investigations page, HuffPost, Monbiot's Guardian column and
// the other sources.
const piece: EditorialEntry = {
  slug: 'q7m3k9xw2r',
  kicker: 'Money and Power',
  headline: `Reform Deleted Farage’s Crypto Bill Without Saying Why`,
  standfirst: `Nigel Farage launched Reform UK’s Cryptoassets and Digital Finance Bill in May 2025 and said he would enact it as Prime Minister, but a year and a day later the party removed it from its website and did not respond when asked why.`,
  summary: "Reform UK removed the crypto bill Nigel Farage promised to enact as Prime Minister from its website and did not say why.",
  publishedAt: '2026-10-22',
  authorByline: 'opengovt',
  body: [
    { type: 'paragraph', text: `On 29 May 2025, at the Bitcoin 2025 conference in Las Vegas, [Nigel Farage](/mps/5091) launched Reform UK’s Cryptoassets and Digital Finance Bill and said he would enact it as Prime Minister. On 30 May 2026, a year and a day later, the bill was removed from Reform UK’s website. The Nerve contacted the party twice to ask why, and Reform did not respond.` },
    { type: 'paragraph', text: `The bill proposed a single 10 per cent capital gains tax rate on cryptoassets, replacing rates of up to 24 per cent. It would make it unlawful for banks and payment providers to deny services “solely due to lawful involvement with cryptoassets”, with “the burden” on the bank to justify any refusal. It would create a Treasury Bitcoin Reserve Fund as part of the UK’s official reserves, in which “Bitcoin must be the principal holding of the Fund”, with objectives including “signalling confidence in digital assets”. It would require HMRC to accept tax payments in approved cryptoassets, with Bitcoin approved from the day that section took effect, set as 6 April. It also proposed a two year regulatory sandbox for “large financial institutions and other designated firms” and a 90 day limit on any government taskforce studying crypto. In launching it, Reform said it had become “the first UK political party in history” able to accept donations in Bitcoin and other cryptocurrencies.` },
    { type: 'paragraph', text: `Reform UK’s largest donor is Christopher Harborne, a British businessman based in Thailand who owns about 12 per cent of Tether, the company behind the world’s most traded stablecoin. The Sunday Times Rich List 2026 put his wealth at £18.2 billion. He has given more than £22 million to Farage’s parties, including a record £9 million to Reform UK in 2025 and a further £3 million in March 2026. Writing in the Guardian, George Monbiot put Harborne’s giving at “about two-thirds of all Reform’s donations since its foundation”.` },
    { type: 'paragraph', text: `In 2024, weeks before Farage decided to stand for Parliament, Harborne gave him a personal gift of £5 million. Farage did not register it. He says it was a personal, unconditional gift that did not need registering. Asked on BBC Breakfast in June 2026 how much of it he had spent, he replied: “It’s literally none of your business!” Harborne told the Telegraph he gave the money “because of my great admiration for the decades of work he had done to achieve Brexit”. Commons rules require new MPs to register gifts over £300 received in the previous 12 months, unless the gift “could not be reasonably thought by others” to relate to their political activities.` },
    { type: 'paragraph', text: `On 13 May 2026, the Parliamentary Commissioner for Standards, Daniel Greenberg, opened an investigation into Farage under Rule 5 of the Code of Conduct, for failure to register an interest. The Electoral Commission said in May that it was considering whether to open its own inquiry. Farage left the Commons on 8 July 2026, when he resigned his Clacton seat, and returned on 13 August 2026 after winning the by election. Greenberg interviewed him in September. As of 22 October 2026, the investigation remained open and no finding had been published. Farage denies breaking any rules.` },
    { type: 'paragraph', text: `On 20 September 2025, Farage and Zia Yusuf wrote in the Telegraph against the Bank of England’s proposed £20,000 cap on individual holdings of sterling stablecoins. In June 2026, the Bank dropped the cap. In October 2025, Farage called a central bank digital currency a “total and utter horror” and said: “I’m prepared to go to prison” to stop one. A state digital pound would compete with commercial stablecoins such as Tether’s. In March 2026, Farage invested £275,650 in Stack BTC, a Bitcoin business chaired by the former Chancellor Kwasi Kwarteng. [Phil Brickell](/mps/5128), the Labour MP who chairs the All-Party Parliamentary Group on Anti-Corruption and Responsible Tax, called it “highly inappropriate for an elected politician to hold such a significant investment”.` },
    { type: 'paragraph', text: `In December 2025, asked how often he speaks to Harborne, Farage said: “Maybe once a month, maybe once every six weeks, but certainly not more than that.” Asked whether Harborne wants anything in return, he said: “I promise you absolutely nothing.”` },
    { type: 'paragraph', text: `The bill contains drafting errors. Section 2(5) reads “The FCA must make rules specifying that the participant (a) the eligibility criteria”, which does not form a sentence. Section 4(6)(c) promises to improve public finances “though long term holdings”. Section 6(5) uses the American spelling “endeavors”. Carol Alexander, professor of finance at the University of Sussex, told The Nerve: “It’s like this was made up by a schoolkid.”` },
    { type: 'paragraph', text: `The bill is no longer on Reform UK’s website. The copy that the party’s website provider still hosted in June now returns an access denied error.` },
    { type: 'cta', text: 'Read the documented record: Christopher Harborne, Nigel Farage and £30 million', href: '/editorials/hb9k2xq7mw' },
  ],
  evidence: {
    recordsReviewed: [
      `Reform UK, Cryptoassets and Digital Finance Bill, 29 May 2025`,
      { text: `The Block, Farage launches crypto bill, 30 May 2025`, links: [{ match: 'The Block, Farage launches crypto bill', url: 'https://www.theblock.co/post/356366/nigel-farage-uk-bitcoin-reserve-capital-gains-tax-cut-crypto-revolution-reform' }] },
      { text: `The Nerve, Reform’s vanishing crypto bill, 30 Jun 2026`, links: [{ match: 'The Nerve, Reform’s vanishing crypto bill', url: 'https://www.thenerve.news/p/reform-crypto-bill-website-policy-nigel-farage-stablecoin-bank-of-england-stack-trump' }] },
      { text: `Commissioner for Standards, investigations`, url: 'https://www.parliament.uk/mps-lords-and-offices/standards-and-financial-interests/parliamentary-commissioner-for-standards/complaints-and-investigations/allegations-currently-under-investigation-by-the-commissioner/' },
      { text: `The Lead, Farage’s £5m gift, 16 May 2026`, links: [{ match: 'The Lead, Farage’s £5m gift', url: 'https://national.thelead.uk/p/nigel-farage-reform-donation-christopher-harborne-crypto-billionaire-parliamentary-standards-investigation' }] },
      { text: `Parliament, Nigel Farage career`, url: 'https://members.parliament.uk/member/5091/career' },
      { text: `Channel 4 FactCheck, 9 Jul 2026`, links: [{ match: 'Channel 4 FactCheck', url: 'https://www.channel4.com/news/factcheck/factcheck-the-latest-on-nigel-farages-5m-gift-and-his-resignation-as-clacton-mp' }] },
      { text: `HuffPost, Farage on BBC Breakfast, 23 Jun 2026`, links: [{ match: 'HuffPost, Farage on BBC Breakfast', url: 'https://www.huffingtonpost.co.uk/entry/nigel-farage-pressure-5m-donation_uk_6a3a532ce4b0810d44202c20' }] },
      { text: `George Monbiot, Get the money out of politics, 30 Apr 2026`, links: [{ match: 'George Monbiot, Get the money out of politics', url: 'https://www.monbiot.com/2026/05/03/get-the-money-out-of-politics/' }] },
      { text: `The Block, Farage on central bank digital currencies, 22 Oct 2025`, links: [{ match: 'The Block, Farage on central bank digital currencies', url: 'https://www.theblock.co/post/375657/nigel-farage-bitcoin-crypto-reform-uk' }] },
      { text: `Independent, Farage on Harborne, 4 Dec 2025`, links: [{ match: 'Independent, Farage on Harborne', url: 'https://www.aol.com/articles/reform-uk-gets-record-9m-094129041.html' }] },
    ],
    lastChecked: '2026-10-22',
  },
  relatedMemberIds: [5091, 5128],
};

export default piece;
