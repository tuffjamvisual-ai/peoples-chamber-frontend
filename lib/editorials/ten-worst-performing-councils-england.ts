import type { EditorialEntry } from './types';

const piece: EditorialEntry = {
  slug: 'ten-worst-performing-councils-england',
  kicker: 'Investigation',
  headline: 'The ten worst performing councils in England',
  standfirst:
    "Eight English councils have declared themselves effectively bankrupt since 2018. Between them they accumulated more than £5 billion in debt and deficit. One was abolished and replaced with two new authorities. Another went bankrupt three times in three years. A commuter-belt borough council with sixteen million pounds of annual revenue borrowed its way to £1.2 billion of debt, a ratio so extreme that no repayment schedule exists that could realistically clear it. England's second city is still under government commissioners who arrived in October 2023 and show no indication of leaving. And according to the Local Government Association's own survey, one in five council leaders expects to issue a Section 114 notice within two years.",
  publishedAt: '2026-06-08',
  authorByline: "opengovt",
  body: [
    {
      type: 'paragraph',
      text: 'This ranking is based on the scale of financial or governance failure, the size of the debt or deficit involved, the duration and severity of government intervention, the measurable impact on residents and services, and the long-term damage to the institution. The councils are ordered by severity. The information is drawn from Section 114 notices, commissioner reports, MHCLG interventions, NAO findings and council published accounts.',
    },

    { type: 'heading', level: 3, text: '1. Woking Borough Council' },
    {
      type: 'paragraph',
      text: 'Woking is not Liverpool. It is not Birmingham. It is a Surrey commuter town where houses cost half a million pounds and the train to Waterloo takes twenty four minutes. Its council had an annual revenue budget of £16 million. By June 2023, when it issued its Section 114 notice, the debt stood at £1.2 billion.',
    },
    { type: 'paragraph', text: 'Seventy five times annual income. No English council has ever come close to that ratio.' },
    {
      type: 'paragraph',
      text: "The debt was not caused by social care pressures or government funding cuts. It was caused by the Victoria Square development, a town centre regeneration scheme funded by borrowing on a scale that bore no relationship to what a district council of Woking's size could service. Money was lent to council-owned companies at rates no commercial bank would have offered. Provisions for repayment were inadequate or absent. The governance structures that should have questioned a sixteen-million-pound council taking on a billion pounds of debt did not question it.",
    },
    {
      type: 'paragraph',
      text: "Commissioners arrived. They are still there. Woking's residents, who live in one of the most affluent parts of southern England, now face years of reduced services. The swimming pool closed. Discretionary grants dried up. Council tax rose. The people paying the bill had no involvement in the decisions that created it, and no mechanism existed to stop those decisions before they became irreversible.",
    },
    {
      type: 'paragraph',
      text: 'The question that hangs over Woking is not why the council failed. It is why nobody outside the council stopped it. The external auditors signed off the accounts. Central government did not intervene. The borrowing was legal. The governance was technically compliant. Every safeguard designed to prevent exactly this outcome failed to prevent it.',
    },

    { type: 'heading', level: 3, text: '2. Birmingham City Council' },
    {
      type: 'paragraph',
      text: "Birmingham's Section 114 notice in September 2023 revealed an £87 million in-year gap and up to £760 million in outstanding equal pay claims. The numbers are so large they obscure the human failure underneath.",
    },
    {
      type: 'paragraph',
      text: "The equal pay liability had been growing for more than a decade. Female council workers in cleaning, catering, care and school support roles were paid less than male colleagues doing work of equivalent value. This was not a secret. Legal claims were filed. Tribunals found in the claimants' favour. Each year the council's leadership looked at the mounting bill, decided it was too large to settle, and passed the problem to the following year's budget. Each year the bill grew. By 2023 it had reached three quarters of a billion pounds and the council could no longer pretend it would go away.",
    },
    {
      type: 'paragraph',
      text: "The Oracle IT disaster ran alongside the equal pay crisis like a second infection in the same patient. Birmingham spent hundreds of millions on an enterprise resource planning system that was supposed to modernise payroll, finance and HR across Europe's largest local authority. It did not work properly. Staff could not be paid correctly. Financial reporting was unreliable. The council was simultaneously failing to pay its female workers fairly and failing to implement the technology that might have told it how badly it was failing.",
    },
    {
      type: 'paragraph',
      text: "Commissioners arrived in October 2023 and described an authority requiring \"root and branch reform.\" They are still in place. The council has announced £148 million in cuts. Twenty libraries are under threat. Youth centres have closed. Road resurfacing has been delayed. Bin collection schedules have changed. Council tax has risen by more than ten percent across two years. Residents of England's second city are paying significantly more and receiving measurably less, and the process of recovery has barely started.",
    },

    { type: 'heading', level: 3, text: '3. Croydon London Borough' },
    {
      type: 'paragraph',
      text: 'Croydon went bankrupt in November 2020. It went bankrupt again in December 2020. It went bankrupt a third time in November 2022. No other English council has matched this sequence.',
    },
    {
      type: 'paragraph',
      text: "The total debt reached £1.6 billion: £1.3 billion of General Fund borrowing and £300 million of Housing Revenue Account debt. The debt servicing cost alone was £47 million a year. For context, that is roughly one sixth of Croydon's entire annual budget being consumed by interest payments on past borrowing before a single resident received a single service. Before the bins were collected. Before the streetlights were maintained. Before the social workers were paid. One pound in every six had already been spent.",
    },
    {
      type: 'paragraph',
      text: "The borrowing funded property speculation. Croydon bought the Croydon Park Hotel. It invested heavily through Brick by Brick, its own development company. The strategy assumed property values would rise and rental income would flow. When neither happened at the rate required, the losses overwhelmed the council's capacity to absorb them.",
    },
    {
      type: 'paragraph',
      text: 'Council tax went up fifteen percent in one year. Libraries closed. Youth services were cut. Community grants were withdrawn. Commissioners arrived in 2021 and remain involved. By 2025 Croydon has stabilised in the sense that it is no longer actively collapsing. It has not recovered. The debt is still being serviced. The services that were cut have not come back. The residents who lost their library or their youth club or their community grant are not waiting for recovery. They already know what happened to them.',
    },

    { type: 'heading', level: 3, text: '4. Thurrock Council' },
    {
      type: 'paragraph',
      text: 'Thurrock Council invested over £1 billion in solar farms, commercial property and energy bonds. It funded the portfolio almost entirely through borrowing. When values fell and returns dried up, the deficit reached £469 million.',
    },
    {
      type: 'paragraph',
      text: "To understand why this matters, consider what Thurrock Council is actually for. It collects bins in Grays and Tilbury. It maintains roads in Stanford-le-Hope. It processes planning applications in Corringham. It provides social care to elderly and vulnerable residents across a stretch of south Essex. At no point in the job description does it say \"manage a billion-pound investment portfolio weighted toward speculative energy assets.\"",
    },
    {
      type: 'paragraph',
      text: 'Essex County Council was appointed as commissioner in December 2022. By 2025 the intervention continues. Thurrock received Exceptional Financial Support from government in 2024/25. The residents who needed their potholes fixed and their care packages maintained got a council that had been running a leveraged investment fund on their behalf, without their knowledge, and lost.',
    },

    { type: 'heading', level: 3, text: '5. Slough Borough Council' },
    {
      type: 'paragraph',
      text: 'Every other council on this list knew it was in trouble, even if it responded too slowly. Slough did not know.',
    },
    {
      type: 'paragraph',
      text: 'When the Section 114 notice was issued in July 2021, the incoming chief finance officer discovered that the council had been incorrectly calculating its Minimum Revenue Provision since 2016/17. For five years the budget had been built on numbers that were wrong. Asset lives had been overstated to reduce annual charges. Capital receipts had been applied in ways that were not permitted. Some borrowing had simply been left out of the calculations. The accounts said the council was under pressure. The reality was that the council was insolvent and had been heading that way for years without anyone in the building realising it.',
    },
    { type: 'paragraph', text: 'The true deficit was £96 million in the current year, projected to reach £159 million within four years.' },
    {
      type: 'paragraph',
      text: "Commissioners were appointed. In 2025 the government announced it was minded to extend the intervention. Assets are still being sold. Services are still being cut. Four years after the Section 114 notice, the recovery remains incomplete. Slough's failure was not recklessness or gambling. It was something more disturbing: a council that did not know how much money it had, how much it owed, or how close it was to the edge.",
    },

    { type: 'heading', level: 3, text: '6. Nottingham City Council' },
    {
      type: 'paragraph',
      text: 'Robin Hood Energy was launched by Nottingham City Council in 2015 as a municipal energy company that would sell cheaper gas and electricity to local residents. The name was chosen carefully. The politics were appealing. A Labour council in a Labour city would take on the energy giants and return the savings to the people.',
    },
    {
      type: 'paragraph',
      text: "The company lost tens of millions of pounds. It was wound up in 2020. The losses were absorbed into the council's accounts for years, quietly eating through reserves while the political leadership maintained the narrative that commercial ventures would save the city from austerity.",
    },
    {
      type: 'paragraph',
      text: 'Robin Hood Energy was not the only commercial failure, but it was the most visible. The council issued Section 114 notices in December 2021 and November 2023. The second revealed a £23 million in-year gap and a £53 million projection for the following year. Commissioners were appointed.',
    },
    {
      type: 'paragraph',
      text: 'By 2025, Nottingham charges the third highest council tax in England: £2,755 for a Band D property. That figure is £363 above the national average. Residents are paying a premium for a council that remains under external supervision, cannot set its own budget without commissioner approval, and is still dealing with the consequences of a failed energy company that was supposed to make their bills cheaper. Robin Hood took from the council taxpayers. It did not give to anybody.',
    },

    { type: 'heading', level: 3, text: '7. Northamptonshire County Council' },
    {
      type: 'paragraph',
      text: 'Northamptonshire issued two Section 114 notices in 2018, the first council to do so in nearly twenty years. The response was unique. The council was not rescued. It was not restructured. It was abolished.',
    },
    {
      type: 'paragraph',
      text: "Commissioners concluded that the authority's financial management and political oversight had failed so completely that no intervention short of dissolution would work. The county council and its seven district councils were replaced by two new unitary authorities, West Northamptonshire and North Northamptonshire, which came into existence in April 2021.",
    },
    {
      type: 'paragraph',
      text: 'The abolition was not clean. It was expensive, disruptive and painful. Staff were transferred into new organisations. Services were reorganised while still being delivered. Residents experienced years of uncertainty about which authority was responsible for what. The new councils inherited the problems of the old one without the institutional memory to understand them.',
    },
    {
      type: 'paragraph',
      text: 'Northamptonshire established a precedent that no other English council wants to test: local government failure can end not with reform but with extinction. The institution itself can be dismantled and replaced. Four years on, the replacement authorities are still finding their footing. Whether the reorganisation delivered better outcomes for residents is contested. What is not contested is that the original county council was judged beyond saving.',
    },

    { type: 'heading', level: 3, text: '8. Liverpool City Council' },
    {
      type: 'paragraph',
      text: "Liverpool did not go bankrupt. Liverpool's problem was that its council could not be trusted to spend public money properly.",
    },
    {
      type: 'paragraph',
      text: "Max Caller's 2021 inspection found failures in governance, planning, procurement and financial management serious enough to justify direct government intervention. The specifics matter. Planning decisions had been made without adequate evidence or proper process. Contracts had been awarded through procedures that did not meet basic standards of competitive tendering. Property transactions had been conducted in ways that raised questions about value for money. Financial controls that any competent organisation would consider routine were absent.",
    },
    {
      type: 'paragraph',
      text: 'Commissioners were appointed in June 2021 to oversee planning, highways, property management and governance. Their mandate was not to balance the books. It was to force the council to follow its own rules.',
    },
    {
      type: 'paragraph',
      text: "The city itself continued to grow. Investment flowed. Tourism thrived. The universities expanded. Liverpool's reputation as one of England's most dynamic cities was unaffected by its council's failures, which made those failures more frustrating rather than less. A city generating that much economic energy deserved a council operating at the same level. It did not have one.",
    },
    {
      type: 'paragraph',
      text: 'By 2025, the intervention has tightened processes and strengthened oversight. Commissioners remain involved. The reforms succeeded in the mechanical sense: procedures now exist where they did not before. Whether the culture that allowed the failures has genuinely changed, or simply learned to operate within tighter constraints, is a question that only the next decade will answer.',
    },

    { type: 'heading', level: 3, text: '9. Sandwell Metropolitan Borough Council' },
    {
      type: 'paragraph',
      text: 'Sandwell\'s failure was not spectacular. There was no billion-pound debt, no collapsed energy company, no triple bankruptcy. The council simply did not work properly for years, and the people who suffered most were the ones who could least afford a dysfunctional local authority.',
    },
    {
      type: 'paragraph',
      text: "Commissioners were appointed in March 2022 after government concluded the council was failing its best value duty. The evidence was a succession of governance scandals so persistent they became the background noise of the borough's politics. Leadership was unstable: leaders came and went, each inheriting the problems of the last and leaving before they could fix them. Senior officers operated without effective oversight. Scrutiny committees existed on paper but did not function as genuine checks on executive decisions. Allegations of misconduct recurred without producing lasting change.",
    },
    {
      type: 'paragraph',
      text: "Sandwell contains some of the most deprived communities in the West Midlands. Child poverty rates are among the highest in England. Educational attainment lags behind the national average. Housing conditions in parts of the borough are poor. Public health outcomes are worse than comparable areas. These are precisely the conditions under which effective local government matters most, and precisely the conditions under which Sandwell's council was least able to provide it.",
    },
    {
      type: 'paragraph',
      text: "The intervention ended formally on 22 March 2024 after two years. Commissioners described the council as a \"far cry\" from where it started and said it was now \"capable of taking forward its improvement independently.\" The governance structures have been rebuilt. Whether they hold under the sustained pressure of serving one of England's poorest boroughs without relapsing into the patterns that broke them is an open question.",
    },

    { type: 'heading', level: 3, text: '10. Somerset Council' },
    {
      type: 'paragraph',
      text: 'Somerset did not go bankrupt. It belongs on this list because what happened there is more alarming than most of the formal bankruptcies above it.',
    },
    {
      type: 'paragraph',
      text: 'Somerset Council was created in April 2023. It was brand new. It had been designed from scratch by merging Somerset County Council and four district councils into a single unitary authority. The reorganisation was explicitly intended to produce a more efficient, more resilient institution. The old structures were deemed too fragmented and too expensive. The new council was supposed to be the solution.',
    },
    {
      type: 'paragraph',
      text: 'Within months of opening its doors, Somerset declared a financial emergency. Soaring demand for adult social care, rising costs across every service area, and a funding settlement that did not cover the gap between income and obligation pushed the new authority toward a Section 114 notice before it had completed its first year of existence.',
    },
    {
      type: 'paragraph',
      text: 'Emergency spending cuts and government support prevented formal bankruptcy. By 2025, Somerset has stabilised. The adult social care pressures that nearly broke it have not diminished.',
    },
    {
      type: 'paragraph',
      text: 'Somerset matters because it destroys the most convenient explanation for the crisis on this list. If a council can be designed from scratch, built to be efficient, launched with the explicit backing of central government, and still reach financial emergency within twelve months, the problem is not poor management. The problem is not reckless investment. The problem is not weak governance. The problem is that the money coming in does not cover the services residents need. No structure fixes that. No reorganisation changes the arithmetic. Somerset is the strongest evidence that the crisis in English local government is not about individual failure. It is about a funding model that no longer works.',
    },

    { type: 'heading', level: 2, text: 'What the ten cases tell us' },
    {
      type: 'paragraph',
      text: 'Woking, Thurrock and Croydon borrowed public money to gamble on commercial investments and lost. Birmingham let an equal pay liability grow for a decade while pouring hundreds of millions into a failed IT system. Nottingham launched an energy company that lost money for five years before anyone stopped it. Slough did not know its own accounts were wrong. Liverpool could not be trusted to award a contract properly. Sandwell could not keep a functioning leadership team in place long enough to govern. Northamptonshire was so far gone it was abolished. Somerset was built to be the answer and nearly became the next question.',
    },
    {
      type: 'paragraph',
      text: 'The common factor is not austerity, though austerity made every one of these failures worse. Core local government funding fell by eighteen percent per person in real terms between 2010 and 2025. But the deeper failure is that every system designed to prevent catastrophe, external audit, central government oversight, elected member scrutiny, officer accountability, failed in every one of these cases. The auditors signed off accounts that turned out to be wrong. Central government did not intervene until the damage was irreversible. Elected members did not ask the questions that needed asking. Officers either did not raise alarms or raised them into rooms where nobody was listening.',
    },
    {
      type: 'paragraph',
      text: 'In 2024/25, the government provided £1.4 billion in Exceptional Financial Support to eighteen councils. Analysis shared with ITV News in March 2024 suggested sixty three councils could declare bankruptcy within one year, rising to one hundred and twenty seven within five years.',
    },
    {
      type: 'paragraph',
      text: 'The ten councils on this list are not outliers. They are the failures large enough and dramatic enough to become visible. Behind them, across England, councils are cutting services, selling assets, drawing down reserves and deferring maintenance to balance budgets that do not balance. The question is no longer whether more councils will fail. It is how many are already failing quietly, how soon the next Section 114 notice arrives, and whether anyone in government will act before it does.',
    },
  ],
};

export default piece;
