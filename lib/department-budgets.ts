// Department budgets for 2025/26 — used by the department dossier pages
// (rendered under the description on each /departments/<slug> page).
//
// Source: HM Treasury Main Estimates 2025/26 published 15 May 2025, with
// Supplementary Estimates incorporated where they materially changed the
// picture (notably DHSC, where the Supplementary added £10.9 billion to
// Resource DEL).
//
// Keys MUST match the slugs in lib/departments/index.ts — those are the
// semantic slugs the URL routing uses (`health`, `defence`, `work-pensions`
// rather than the DHSC/MoD/DWP abbreviations).
//
// Figures are in £ billions. ame is only set where it materially changes
// the total (in practice only work-pensions, where AME dwarfs DEL).

export type DepartmentBudget = {
  resourceDel: number;
  capitalDel: number;
  ame?: number;
  prose: string;
  year: string;
};

export const DEPARTMENT_BUDGETS: Record<string, DepartmentBudget> = {
  'work-pensions': {
    resourceDel: 9.8, capitalDel: 1.0, ame: 297.0, year: '2025/26',
    prose:
      "The largest spender in government by a wide margin, and almost all of it is AME, demand led benefit spending that moves with caseload rather than policy alone. The £297 billion AME envelope covers the State Pension, Pension Credit, Universal Credit, Personal Independence Payment, child benefit, statutory sick pay, housing benefit, attendance allowance, carer's allowance and the rest of working age and disability benefits. The £10 billion DEL line covers DWP's own administration, the Jobcentre Plus network and discretionary employment programmes.",
  },
  health: {
    resourceDel: 198.5, capitalDel: 15.0, year: '2025/26',
    prose:
      "NHS England, plus the part of the budget that funds NHS Scotland, NHS Wales and Health and Social Care Northern Ireland through Barnett consequentials, plus public health, the NHS workforce, prescription drugs, mental health services and the medicines regulator. The figure rose by £10.9 billion between the Main and Supplementary Estimates as Labour's first full year settled the NHS England spending pressure. The largest single department by DEL and the most politically exposed.",
  },
  education: {
    resourceDel: 100.6, capitalDel: 6.8, year: '2025/26',
    prose:
      "Schools, sixth forms, further education colleges, apprenticeships, early years (the so called free hours), tuition fee support and the student loan book including the RAB charge, the portion of student loans expected never to be repaid, accounted for as resource spending up front. The 10.7% drop in Resource DEL between 2024/25 and 2025/26 is driven entirely by a £17.9 billion reduction in the RAB charge, not by an underlying cut to schools funding.",
  },
  defence: {
    resourceDel: 47.4, capitalDel: 23.1, year: '2025/26',
    prose:
      "Armed forces personnel and equipment, MOD operations, the AUKUS submarine programme, the Trident nuclear deterrent and military, financial and intelligence support to Ukraine. The unusually high Capital DEL share, about a third of the total, reflects the equipment programme, particularly Dreadnought, F-35, the Type 26 frigate programme and the British Army's Ajax. Set to rise sharply through the parliament as the 2.5% of GDP commitment comes forward to 2027.",
  },
  transport: {
    resourceDel: 20.4, capitalDel: 10.0, year: '2025/26',
    prose:
      "Roads, the rail network subsidy (now including the renationalised train operators), HS2, local authority transport grants, aviation oversight, ports, cycling and walking infrastructure. HS2 alone accounts for most of the Capital DEL increase. The recurring rail subsidy is the largest annual cost. Most local transport funding flows through this line via grants to councils and combined authorities.",
  },
  'science-tech': {
    resourceDel: 15.5, capitalDel: 12.5, year: '2025/26',
    prose:
      "Created in February 2023 by carving science, AI, telecoms and digital policy out of BEIS and DCMS. The dominant line is UK Research and Innovation, the £8.8 billion umbrella that funds the seven research councils plus Innovate UK and Research England. Capital DEL includes £1 billion of Horizon and Copernicus contributions following UK re-entry. Smaller administration budget of £377 million for the department itself.",
  },
  'home-office': {
    resourceDel: 19.7, capitalDel: 1.5, year: '2025/26',
    prose:
      "Police funding, immigration enforcement, asylum and asylum accommodation, counter terrorism, the Border Security Command, passports and the security and intelligence agencies. The asylum accommodation overspend was the largest source of in year pressure through 2024/25 and remains the single biggest political risk inside this budget.",
  },
  energy: {
    resourceDel: 8.0, capitalDel: 10.0, year: '2025/26',
    prose:
      "Created in 2023. Funds the energy market regulator framework, the Warm Homes Plan, the Great British Energy capitalisation (£8.3 billion over the parliament), Sizewell C, Small Modular Reactors, carbon capture clusters, hydrogen and the nuclear decommissioning authority. Capital DEL is unusually large for the policy spend involved because GB Energy is structured as an investment vehicle. Resource DEL excluding ODA is £1.8 billion.",
  },
  justice: {
    resourceDel: 13.0, capitalDel: 2.0, year: '2025/26',
    prose:
      "HM Prison and Probation Service (£7.8 billion of Resource DEL), HM Courts and Tribunal Service (£3 billion), the Legal Aid Agency (£2.2 billion) and the Crown Prosecution Service contribution. Capital DEL rose 21% on 2024/25 to fund new prison capacity following the late 2024 capacity crisis. The asylum and court backlogs sit inside this brief.",
  },
  'foreign-office': {
    resourceDel: 8.0, capitalDel: 3.2, year: '2025/26',
    prose:
      "Diplomatic posts and embassies, foreign policy, multilateral organisations including the United Nations, plus the official development assistance (ODA) aid budget. ODA was cut from 0.7% of GNI to 0.5% in 2021 by Sunak, and cut again to 0.3% of GNI by Starmer in February 2025 to fund the defence spending uplift. The £438 million ODA reduction in 2025/26 is roughly 4% of the FCDO DEL budget.",
  },
  housing: {
    resourceDel: 4.7, capitalDel: 2.0, year: '2025/26',
    prose:
      "Departmental DEL covers central housing policy, the Building Safety Regulator (set up after Grenfell), planning system funding, the homelessness prevention grant, the rough sleeping initiative and the Integrated Settlements pilot for combined authorities. The much larger £78 billion Local Government Finance Settlement is administered through MHCLG but goes to English councils rather than to the department itself.",
  },
  environment: {
    resourceDel: 4.4, capitalDel: 2.4, year: '2025/26',
    prose:
      "Environmental Land Management Scheme payments to farmers (the post Brexit replacement for the EU Common Agricultural Policy), the Environment Agency, Natural England, flood defence, food standards, the Animal and Plant Health Agency and the Marine Management Organisation. Roughly half of Defra's Resource DEL is direct payments and farm support; flood defence is the largest line on the Capital side.",
  },
  culture: {
    resourceDel: 3.5, capitalDel: 1.0, year: '2025/26',
    prose:
      "Arts Council England, Sport England and UK Sport, museums and heritage (Tate, V&A, British Museum, the Royal Collection), public broadcasting policy framework (the BBC is licence fee funded but DCMS administers the agreement), gambling regulation and the National Lottery distributors. The film and TV production tax credits sit on the HMRC side but are larger in cash than the direct arts grant.",
  },
  'business-trade': {
    resourceDel: 1.8, capitalDel: 1.0, year: '2025/26',
    prose:
      "Industrial strategy, trade policy and trade negotiations, business support schemes, the Post Office, the Insolvency Service and sectoral subsidies for steel, automotive and semiconductors. The £2.5 billion British Steel arrangement in 2025/26 sits inside this line. Smaller than its political weight suggests because most of the levers it pulls, R&D, energy and planning, are owned by other departments.",
  },
  'cabinet-office': {
    resourceDel: 1.1, capitalDel: 0.4, year: '2025/26',
    prose:
      "Central coordination of government, the National Security Secretariat, the propriety and ethics function, the Civil Service People Group, the Office for Veterans' Affairs, the Government Communication Service, the Geospatial Commission and the Crown Commercial Service. Effectively the Prime Minister's department for cross government delivery, even though the Prime Minister's Office is technically a separate ministerial line.",
  },
  treasury: {
    resourceDel: 0.43, capitalDel: 0.1, year: '2025/26',
    prose:
      "Treasury's own running costs: the staff, the policy teams, the Debt Management Office, the Government Internal Audit Agency. £433 million for the department that decides where most of the rest of the budget goes. The £1.3 trillion of total managed expenditure is allocated by Treasury but spent by everyone else. Net debt interest of around £100 billion sits against the consolidated fund and is managed by HMT but does not count as departmental spending.",
  },
  'northern-ireland-office': {
    resourceDel: 0.064, capitalDel: 0, year: '2025/26',
    prose:
      "The UK government's interface with Stormont. £64 million covers the Secretary of State's office, the Belfast Good Friday Agreement architecture, security cooperation with the Garda and the legacy of the Troubles work. The Northern Ireland Executive itself receives a separate block grant of £19.3 billion through the Barnett formula.",
  },
  'scotland-office': {
    resourceDel: 0.016, capitalDel: 0, year: '2025/26',
    prose:
      "The UK government's interface with Holyrood. £16 million for staff and office costs. The Scottish Government itself receives a separate block grant of £29.9 billion. The Office of the Advocate General for Scotland (the UK government's law officer for Scots law) has a tiny separate budget; see advocate-general.",
  },
  'wales-office': {
    resourceDel: 0.007, capitalDel: 0, year: '2025/26',
    prose:
      "The UK government's interface with the Senedd. £7 million for office costs. The Welsh Government itself receives a separate block grant of £21.8 billion.",
  },
  'attorney-general': {
    resourceDel: 0.045, capitalDel: 0, year: '2025/26',
    prose:
      "The Attorney General's Office and Solicitor General's Office. Around £45 million covers the Law Officers, the Government Legal Department's senior interface and the Crown Prosecution Service oversight (the CPS itself has its own £700 million budget under the MoJ family). Among the smallest ministerial departments.",
  },
  'advocate-general': {
    resourceDel: 0.015, capitalDel: 0, year: '2025/26',
    prose:
      "The Office of the Advocate General for Scotland, the UK government's law officer for Scots law and constitutional matters affecting Scotland. Around £15 million covers a small specialist legal team. Closely linked to the Scotland Office in practice.",
  },
  'commons-leader': {
    resourceDel: 0.005, capitalDel: 0, year: '2025/26',
    prose:
      "The Office of the Leader of the House of Commons. Around £5 million covers the Leader, the business of the House team, the Government Whips' Office support and the Office of the Leader's policy and communications staff. Coordinates government business in the Commons rather than spending on policy delivery.",
  },
  'lords-leader': {
    resourceDel: 0.005, capitalDel: 0, year: '2025/26',
    prose:
      "The Office of the Leader of the House of Lords. Around £5 million for an equivalent function to the Commons Leader: coordinating government business and managing the Lords procedural relationship between government and the Upper House.",
  },
  ukef: {
    resourceDel: 0.1, capitalDel: 0, year: '2025/26',
    prose:
      "UK Export Finance, the UK's export credit agency. The £100 million Resource DEL covers UKEF's own running costs. The much larger figure (around £30 billion of available export guarantees and direct lending) sits on the Contingent Liability side of the public finances and only crystallises as spending when a guarantee is called. Backs UK exporters whose deals private insurance markets will not cover at acceptable rates.",
  },
};

export function totalSpend(b: DepartmentBudget): number {
  return b.resourceDel + b.capitalDel + (b.ame || 0);
}

export function fmtBn(n: number): string {
  if (n < 0.01) return `£${Math.round(n * 1000)}m`;
  if (n < 0.1) return `£${(n * 1000).toFixed(0)}m`;
  if (n < 1) return `£${n.toFixed(2)}bn`;
  if (n < 10) return `£${n.toFixed(1)}bn`;
  return `£${Math.round(n)}bn`;
}
