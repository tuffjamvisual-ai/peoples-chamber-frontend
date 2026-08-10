import type { EditorialEntry } from './types';

// Opinion: digital ID and the meaning of "voluntary". Fact-checked 2026-07-10 against
// UK Digital ID (Wikipedia), Think Digital Partners (Jan 2026 U-turn), MacRumors
// (under-16 social-media ban, spring 2027) and Ofcom / the Online Safety Act:
// - Digital ID announced 25 Sept 2025 as mandatory for right-to-work; the compulsory
//   element was dropped in a Jan 2026 U-turn; the scheme is now voluntary (consultation
//   March 2026). That U-turn context was added to the piece to ground the premise.
// - Under-16 social-media ban announced, legislation planned before Christmas, spring
//   2027 rollout.
// - Pornography / harmful-material age checks in force under the Online Safety Act
//   since 25 July 2025 (that attribution was added).
// All claims verified; hedges ("announced plans", "still being developed", "may",
// "obvious candidate... not the only possible method") preserved. Protected lines
// ("Convenience is the sales pitch.", "They say it will be voluntary.", "That is
// compulsion without anybody having to admit it.") kept exactly.
const piece: EditorialEntry = {
  slug: 'wq7m4kx2np',
  kicker: 'Digital ID',
  headline: 'Digital ID Will Be “Voluntary”. Watch What That Word Actually Means.',
  standfirst:
    'Ministers dropped the compulsory digital ID in January and now promise the new scheme will be voluntary. But nothing has to be compulsory in law to become compulsory in everyday life.',
  publishedAt: '2026-07-17',
  authorByline: 'opengovt',
  kind: 'briefing',
  opinion: true,
  body: [
    { type: 'paragraph', text: 'Ministers say the scheme will make life easier. For some things, it probably will.' },
    { type: 'paragraph', text: 'The idea is simple enough: an app on your phone that proves who you are, your age, your residency status. No more hunting for a birth certificate last seen when Tony Blair was in Downing Street. Ministers want it used across government services and potentially by private companies too.' },
    { type: 'paragraph', text: 'Convenience is the sales pitch. They say it will be voluntary.' },
    { type: 'paragraph', text: 'That promise is newer than it sounds. When the scheme was announced in September 2025 it was to be compulsory, at least for proving the right to work. Ministers dropped the mandatory element in January 2026. Voluntary is the version that survived.' },
    { type: 'paragraph', text: 'Here is the problem with that word.' },
    { type: 'paragraph', text: 'Nothing has to be compulsory in law to become compulsory in everyday life. Employers, banks, landlords and government departments only need to make digital ID the fastest route. The alternatives can stay on the books while becoming slower, more awkward and barely staffed.' },
    { type: 'paragraph', text: 'Before long, “voluntary” could mean finishing in ten seconds with the app or spending three weeks posting certified documents to an office that never answers the telephone.' },
    { type: 'paragraph', text: 'That is compulsion without anybody having to admit it.' },
    { type: 'paragraph', text: 'Then comes function creep. The ID may begin with work checks and government services, but once the infrastructure exists there will be pressure to use it elsewhere: renting a home, opening an account, proving your age, accessing websites or buying restricted products. Plenty of departments and companies will have a perfectly reasonable explanation for wanting one more use added.' },
    { type: 'paragraph', text: 'Teenagers have particular reason to watch what happens next.' },
    { type: 'paragraph', text: 'The government has not said every teenager will need its national digital ID. But it has announced plans to bar under-16s from major social-media services from spring 2027. Under the Online Safety Act, websites carrying pornography and certain harmful material already have to use strong age checks.' },
    { type: 'paragraph', text: 'The final rules for the social-media restrictions are still being developed.' },
    { type: 'paragraph', text: 'Platforms will need some reliable way of separating a 15-year-old from a 16-year-old. Facial age estimates, photo identification, banking information or other approved checks may all play a part. The government’s digital ID will not be the only possible method, but it is being designed to prove age, which makes it an obvious candidate for wider use, particularly if platforms want one familiar route that satisfies regulators and saves them building their own.' },
    { type: 'paragraph', text: 'No minister may ever explicitly order a teenager to download a government identity app. Teenagers may simply find that social media, gaming sites and other online services become harder to use without one.' },
    { type: 'paragraph', text: 'Security is another concern. A national digital identity network would be a valuable target for hackers, organised criminals and foreign intelligence services. Governments routinely promise that new databases will be secure.' },
    { type: 'paragraph', text: 'Then a contractor makes a mistake, somebody clicks a poisoned link, or millions of records appear for sale online.' },
    { type: 'pullQuote', text: 'A password can be changed. Your face and date of birth cannot.' },
    { type: 'paragraph', text: 'The people hit hardest will not be ministers waving smartphones at a launch event. They will be older people, those without reliable internet access, people with disabilities, families who cannot afford newer devices and anyone who already struggles with online government services. Once the digital route becomes the normal route, everybody outside it risks being treated as a nuisance to be processed.' },
    { type: 'paragraph', text: 'None of this makes digital ID automatically sinister. Properly designed, it could reduce fraud and save people time. But ministerial reassurance is no substitute for protection written into law, especially once the system becomes too embedded to unwind easily.' },
    { type: 'paragraph', text: 'It must remain genuinely optional. Paper and face-to-face alternatives need to work just as well, rather than existing merely so ministers can point to them. Records should not be quietly linked across departments, and police, immigration authorities or private companies should not gain wider access through secondary regulations or promises buried in guidance.' },
    { type: 'paragraph', text: 'People must know what information is held, who has seen it and when it will be deleted. The technology should be independently tested. When failures cause harm, there should be compensation, and officials or companies that misuse the data should face serious penalties.' },
    { type: 'paragraph', text: 'There must also be a legal wall between age verification and wider identification. Proving someone is over 16 should not require handing over their name, address and personal history.' },
    { type: 'paragraph', text: 'Parliament must decide not only what digital ID can be used for, but what it can never be used for.' },
    { type: 'paragraph', text: 'Britain is not building a convenient login. It is creating identity infrastructure that future governments, ministers and officials will inherit.' },
    { type: 'paragraph', text: 'The real question is not whether today’s government promises to behave. It is how much power tomorrow’s government will find waiting for it.' },
  ],
};

export default piece;
