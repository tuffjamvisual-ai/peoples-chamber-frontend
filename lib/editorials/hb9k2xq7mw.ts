import type { EditorialEntry } from './types';

// Investigation. Bill provisions cross-checked against reporting (The Block,
// Protos, The Nerve, Bloomberg, Channel 4 / The Conversation factchecks): 10%
// CGT, Bitcoin Reserve Fund, HMRC Bitcoin acceptance, bank non-discrimination;
// £275,650 Stack BTC (Kwarteng); Harborne ~12% Tether; BoE £20k stablecoin cap
// / Telegraph column; "ultimate form of tyranny"; Brickell "caught out"; Farage
// speaks to Harborne "once a month or every six weeks", "none of your business"
// (BBC). Two accuracy fixes vs source copy: "endeavors" (American spelling, the
// stated point) and the spending quote corrected to "Ferraris".
const piece: EditorialEntry = {
  slug: 'hb9k2xq7mw',
  kicker: 'Money and Power',
  headline: 'The Crypto Bill Reform UK Published, Then Deleted',
  standfirst:
    'Reform did not campaign on cryptocurrency in 2024. It later produced a detailed crypto bill. The bill contained measures that would benefit crypto holders, crypto firms and stablecoin issuers. The party’s biggest donor has major interests in the same sector. The bill was then removed from the party website without explanation.',
  publishedAt: '2026-07-08',
  authorByline: 'opengovt',
  body: [
    { type: 'paragraph', text: 'Section 1 would have cut capital gains tax on crypto gains to 10 per cent. That would benefit crypto holders.' },
    { type: 'paragraph', text: 'Section 4 would have created a sovereign Bitcoin Reserve Fund as part of the UK’s official reserves. The bill said Bitcoin should be the fund’s principal holding and that one of its aims was “signalling confidence in digital assets”.' },
    { type: 'paragraph', text: 'Section 5 would have required HMRC to accept Bitcoin for tax payments from the day the bill came into force.' },
    { type: 'paragraph', text: 'Section 3 would have made it harder for banks to refuse service to crypto users unless they could justify the decision. That goes directly to “de-risking”, where banks shut or refuse accounts they consider too risky.' },
    { type: 'paragraph', text: 'For crypto firms, access to banking is not a side issue. It is one of the barriers between the industry and the mainstream financial system.' },
    { type: 'paragraph', text: 'Four months after launching the bill, Farage and Reform chairman Zia Yusuf wrote in the Telegraph attacking the Bank of England’s proposed £20,000 cap on individual holdings of sterling stablecoins. Removing or weakening that cap would benefit stablecoin issuers.' },
    { type: 'paragraph', text: 'Farage has also lobbied against a state-backed digital pound, calling it “the ultimate form of tyranny”. A digital pound would compete with commercial stablecoins.' },
    { type: 'paragraph', text: 'Farage has personally invested £275,650 in Stack BTC, a Bitcoin business chaired by former Chancellor Kwasi Kwarteng.' },
    { type: 'paragraph', text: 'The draft bill was rough in places. Section 2(5) does not read as a complete sentence. Section 4(6)(c) contains a typo, using “though” instead of “through”. Section 6(5) uses the American spelling “endeavors” in a document formatted as an Act of the UK Parliament.' },
    { type: 'paragraph', text: 'The drafting errors do not explain why the bill was removed.' },
    { type: 'paragraph', text: 'Phil Brickell MP, chair of the All-Party Parliamentary Group on Anti-Corruption and Responsible Tax, said Reform appeared to have been “caught out” and called on Farage to disclose correspondence and meetings with crypto billionaire donors.' },
    { type: 'paragraph', text: 'Farage has said he speaks to Harborne “maybe once a month, maybe once every six weeks” and insists he has not promised him anything in return for his donation. He told the BBC the £5 million gift was “none of your business” and said he could spend it on Ferraris if he wanted. He has described himself as someone who “can’t be bought by anybody”.' },
    { type: 'paragraph', text: 'Harborne has said he gave the money because of his admiration for Farage’s work on Brexit. Reform says the gift was completely unconditional.' },
    { type: 'paragraph', text: 'Reform has not explained why the bill disappeared. It has not said whether it still supports the provisions. It has not published a replacement. It has not explained why a party with no manifesto crypto policy produced a crypto bill before producing equivalent draft legislation on the issues it actually campaigned on.' },
  ],
};

export default piece;
