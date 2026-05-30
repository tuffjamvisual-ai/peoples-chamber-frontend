// Curated mapping from our department slug to the data.gov.uk
// organogram dataset URL. Each department publishes their Senior
// Civil Servant pay disclosure as a quarterly CSV; the listing page
// at https://www.data.gov.uk/dataset/<uuid>/organogram-<dept-slug>
// shows every historical CSV.
//
// To add a new department: search https://www.data.gov.uk/search?q=organogram+<dept>
// for "organogram-<dept-slug>", drop the dataset page URL here.
// Smaller offices (Lords Leader, Advocate General etc.) don't
// publish organograms and are intentionally omitted.

export const ORGANOGRAM_DATASET_URL: Record<string, string> = {
  treasury: 'https://www.data.gov.uk/dataset/a5ffd07c-e31e-47c8-b343-1bcd9b5e3fe1/organogram-hm-treasury',
  'home-office': 'https://www.data.gov.uk/dataset/d4faa1cb-edf8-4d28-9d0b-3a44ce7a6648/organogram-home-office',
  'work-pensions': 'https://www.data.gov.uk/dataset/9b62b94e-d5cd-4a8b-ad6f-7e9b1cefcf12/organogram-department-for-work-and-pensions',
  defence: 'https://www.data.gov.uk/dataset/5dcf1a8e-4bad-4d9c-b90b-41f1a3dce03b/organogram-ministry-of-defence',
  education: 'https://www.data.gov.uk/dataset/5a1f3831-86d6-4979-9164-99e982361ca4/organogram-department-for-education',
  culture: 'https://www.data.gov.uk/dataset/14218517-ef18-40ea-9ad1-aa637174c372/organogram-department-for-culture-media-and-sport',
  'attorney-general': 'https://www.data.gov.uk/dataset/cb421a5e-aff6-421f-abcb-ae5be278f575/organogram-attorney-generals-office',
  ukef: 'https://www.data.gov.uk/dataset/1b81e88b-a1c4-4068-a354-e3394b0ba4d1/organogram-uk-export-finance',
  // Pending discovery (or no dataset published):
  //   health, energy, transport, environment, business-trade,
  //   science-tech, housing, justice, cabinet-office, foreign-office,
  //   scotland-office, wales-office, northern-ireland-office,
  //   commons-leader, lords-leader, advocate-general
};
