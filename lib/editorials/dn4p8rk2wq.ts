import type { EditorialEntry } from './types';

// Briefing: the Defence Investment Plan's "jobs hole". Re-verified and corrected
// 2026-07-09: the ~10,000 jobs estimate is now attributed to the reporting (Guardian
// / New Civil Engineer, from analysis of government figures; jobs-per-pound ~2.4
// defence vs 11.5 transport / 10 energy). Andrea Egan is general secretary of Unison
// (took office 22 Jan 2026); the "significant consequences" line was a paraphrase, so
// it is now recast and her verified verbatim quote used instead. Stephen Gethins (SNP)
// on Scottish energy jobs and the £2bn energy cuts held until autumn (The Scotsman).
// Acorn/Peterhead: the omitted counterclaim added, energy minister Michael Shanks says
// it is "still on track" (Energy Voice). A46 Newark / A38 Derby: DfT RIS3 review.
const piece: EditorialEntry = {
  slug: 'dn4p8rk2wq',
  kicker: 'Defence and Money',
  headline: 'The Defence Plan Does Not Just Have a Funding Hole. It Has a Jobs Hole.',
  standfirst:
    'New analysis estimates the infrastructure cuts funding the Defence Investment Plan could cost around 10,000 jobs, because defence spending employs fewer people per pound than the roads and energy projects being raided. Starmer gets the launch. Burnham gets the cancelled schemes.',
  publishedAt: '2026-07-09',
  authorByline: 'opengovt',
  kind: 'briefing',
  body: [
    { type: 'paragraph', text: 'Analysis of government spending figures, reported this week by the Guardian and New Civil Engineer, estimates that cuts to infrastructure spending used to fund the Defence Investment Plan could cost the UK around 10,000 jobs. The defence industry creates fewer jobs per pound than construction, transport and public services. Advanced manufacturing, automation and AI mean that £15 billion in defence spending does not produce the same employment as £15 billion in road building or energy projects. The government is redirecting money from sectors that employ more people into a sector that employs fewer.' },
    { type: 'paragraph', text: 'Andrea Egan, general secretary of Unison, warned that cutting the departments that run essential public services to fund defence could hit employment across healthcare, education and local government. She said the plan meant “extra cash for war and overseas interventions, but less for schools and hospitals.” The SNP’s Stephen Gethins warned that Scottish energy jobs have been put at risk and that the £2 billion in energy cuts will not even be announced until the autumn, meaning Burnham inherits the axe without knowing where it falls.' },
    { type: 'paragraph', text: 'The A46 Newark Bypass. The A38 Derby Junctions. Energy projects across Scotland. The Acorn carbon capture scheme at Peterhead, which the Scottish Government’s climate plan depends on, has been thrown into doubt, though the UK energy minister Michael Shanks says it is “still on track.” None of this is abstract. Each one is a payroll, a signed contract and a community that was promised investment and may lose it to fund submarines it will never see.' },
    { type: 'paragraph', text: 'The defence case is not frivolous. Ukraine exposed how fast stockpiles vanish. Drone warfare has changed the battlefield. NATO allies are under pressure. But if the government cuts projects that employ more people to fund projects that employ fewer, it needs to explain why that trade is worth it. “National security” is a serious answer. It is not a free pass to gut regional infrastructure and pretend nobody noticed.' },
    { type: 'paragraph', text: 'Starmer gets the patriotic launch. Burnham gets the cancelled road schemes, the angry mayors and the Treasury headache. The government wants this to look like strength. Right now it looks like a swap: roads out, weapons in, jobs lost, bill to follow.' },
  ],
};

export default piece;
