// Steps for the no-JavaScript "Show more" chain (owner rule, Cowork ENTRY 539 and 542, 23 Nov 2026): 25 rows a press,
// fewer where rows are tall, so one press adds no more than about 1,450px at 375 wide. Each figure is 1,450 divided by
// the list's row height as measured on 23 Nov 2026 (local build of main 6a6d4767 with this change, 375 x 812, JavaScript
// off; audit/folds-539), at least 2. A list not named here steps by 25. With JavaScript nothing here is used.
export const JS_OFF_STEP = 25;
const STEPS: [RegExp, number][] = [
  [/^laws-rows$/, 2],                             // /laws: rows about 565px
  [/^div-days$/, 4],                              // /divisions: rows about 312px
  [/^treaties-rows$/, 4],                         // /treaties: rows about 333px
  [/^earnings$/, 5],                              // /earnings: rows about 260px
  [/^mwv-rows$/, 5],                              // /laws/made-without-a-vote: rows about 250px
  [/^polls-archive$/, 5],                         // /polls/archive: rows about 264px
  [/^pq-day$/, 4],                                // /pmqs/1945-to-1961/1945-08-21: rows about 261 to 301px
  [/^press-releases$/, 5],                        // /transparency/press-releases: rows about 246px
  [/^roi-rows$/, 5],                              // /transparency/register-of-interests: rows about 248px
  [/^rg-\d{4}-\d{2}$/, 5],                       // /reports month cards (JavaScript off): rows about 278px
  [/^petitions-local$/, 6],                        // /mps/<id>, local petitions: rows about 233px (JavaScript on)
  [/^edms-(open-)?motions/, 9],                    // /mps/<id>, early day motions: rows about 131 to 158px
  [/^house-debates$/, 8],                          // /mps/<id>, debates: rows about 134 to 168px
  [/^diary-meetings$/, 9],                         // /mps/<id>, ministers' diary meetings: rows about 108 to 147px
  [/^q-meets$/, 13],                               // /transparency/special-advisers quarter, media meetings: rows about 106px
  [/^q-hosp$/, 18],                                // /transparency/special-advisers quarter, hospitality: rows about 80px
  [/^q-active$/, 22],                              // /transparency/special-advisers quarter, most active: rows about 63px
  [/^cpov-a$/, 6],                                // /councils/child-poverty: rows about 226px
  [/^fsm-a$/, 7],                                 // /councils/free-school-meals: rows about 204px
  [/^topic-reports$/, 7],                         // /topics/climate-and-energy: rows about 207px
  [/^tr-appgs$/, 7],                              // /transparency/appgs: rows about 203px
  [/^trustf-0$/, 7],                              // /donations/trust-funded: rows about 193px
  [/^donors-rows$/, 8],                           // /donors: rows about 178px
  [/^manifesto-policy$/, 8],                      // /parties/manifestos: rows about 168px
  [/^yj-a$/, 8],                                  // /councils/youth-justice: rows about 175px
  [/^bb-a$/, 9],                                  // /councils/blue-badges: rows about 151px
  [/^cic-a$/, 9],                                 // /councils/children-in-care: rows about 151px
  [/^bill-sessions$/, 10],                         // /bills/sessions: rows about 132px
  [/^questions-list$/, 11],                        // /questions: rows about 121px
  [/^dm-rows$/, 12],                               // /divisions/year/2004/10: rows about 118px
  [/^dy-rows$/, 12],                               // /divisions/year/2004: rows about 115px
  [/^edms-list$/, 12],                             // /edms: rows about 115px
  [/^mpa$/, 12],                                   // /transparency/mp-activity: rows about 119px
  [/^committees(-[\d-]+)?$/, 14],                  // /committees: rows about 101px
  [/^dcs-rows$/, 15],                              // /donations/constituencies: rows about 96px
  [/^foreig-\d+$/, 15],                            // /donations/foreign: rows about 91px
  [/^orgs-rows$/, 15],                             // /organisations: rows about 91px
  [/^pmqs-year-days$/, 15],                        // /pmqs/year/1945: rows about 92px
  [/^bills-az$/, 16],                              // /bills: rows about 90px
  [/^lb-rank$/, 16],                               // /lobbying: rows about 88px
  [/^pmqs-found$/, 16],                            // /pmqs: rows about 89px
  [/^bequest-recipients$/, 16],                    // /donations/bequest: rows about 84 to 89px
  [/^foi$/, 19],                                   // /transparency/freedom-of-information: rows about 75px
  [/^sew-league$/, 20],                            // /sewage: rows about 72px
  [/^div-\d{4}-\d{2}-\d{2}$/, 21],                 // /divisions: rows about 69px
  [/^bequest-donors$/, 24],                        // /donations/bequest: rows about 59px
];
export function jsOffStepFor(id: string): number {
  for (const [re, step] of STEPS) if (re.test(id)) return step;
  return JS_OFF_STEP;
}

// With JavaScript (Cowork ENTRY 542 item 6, 23 Nov 2026): the phone script steps every list by 10 a press; a list whose rows
// are tall carries a smaller step (data-step-n), 1,450px divided by its row height as measured at 375 with JavaScript on
// (the ENTRY 539 audit and this branch's), at least 2. A list not named here steps by 10, as before.
export const JS_ON_STEP = 10;
const JS_STEPS: [RegExp, number][] = [
  [/^laws-rows$/, 2],                             // /laws: rows about 604px
  [/^polls$/, 3],                                 // /polls: rows about 373px
  [/^div-days$/, 4],                              // /divisions: rows about 341px
  [/^pq-day$/, 4],                                // /pmqs/1945-to-1961/1945-08-21: rows about 342px
  [/^treaties-rows$/, 4],                         // /treaties: rows about 314px
  [/^mwv-rows$/, 5],                              // /laws/made-without-a-vote: rows about 260px
  [/^polls-archive$/, 5],                         // /polls/archive: rows about 274px
  [/^press-releases$/, 5],                        // /transparency/press-releases: rows about 251px
  [/^roi-rows$/, 5],                              // /transparency/register-of-interests: rows about 244px
  [/^q-meets$/, 6],                               // /transparency/special-advisers quarter, media meetings: rows about 241px
  [/^petitions-local$/, 6],                        // /mps/<id>, local petitions: rows about 233px
  [/^house-debates$/, 8],                          // /mps/<id>, debates: rows about 168px
  [/^diary-meetings$/, 9],                         // /mps/<id>, ministers' diary meetings: rows about 160px
  [/^edms-(open-)?motions/, 9],                    // /mps/<id>, early day motions: rows about 151 to 158px                               // /transparency/special-advisers quarter, media meetings: rows about 241px
  [/^dcs-rows$/, 6],                              // /donations/constituencies: rows about 216px
  [/^earnings$/, 6],                              // /earnings: rows about 235px
  [/^foi$/, 6],                                   // /transparency/freedom-of-information: rows about 227px
  [/^topic-reports$/, 6],                         // /topics/climate-and-energy: rows about 214px
  [/^tr-appgs$/, 6],                              // /transparency/appgs: rows about 210px
  [/^q-hosp$/, 7],                                // /transparency/special-advisers quarter, hospitality: rows about 191px
  [/^contractors-matched$/, 7],                   // /donations/government-contractors: rows about 185px
  [/^cpov-a$/, 7],                                // /councils/child-poverty: rows about 199px
  [/^foreig-\d+$/, 7],                            // /donations/foreign: rows about 185px
  [/^mpa$/, 7],                                   // /transparency/mp-activity: rows about 204px
  [/^departments-grid$/, 8],                      // /departments: rows about 162px
  [/^fsm-a$/, 8],                                 // /councils/free-school-meals: rows about 176px
  [/^manifesto-policy$/, 8],                      // /parties/manifestos: rows about 176px
  [/^trustf-0$/, 8],                              // /donations/trust-funded: rows about 172px
  [/^q-active$/, 9],                               // /transparency/special-advisers quarter, most active: rows about 155px
];
export function jsOnStepFor(id: string): number {
  for (const [re, step] of JS_STEPS) if (re.test(id)) return step;
  return JS_ON_STEP;
}
