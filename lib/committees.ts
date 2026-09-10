// The 29 public-facing select committee IDs — chosen 2026-09-10.
// Review after any machinery-of-government change (new department →
// new departmental select committee). Same convention as DEPT_ORG_TO_SLUG
// in app/page.tsx and the CVA PAGE cap in sync-commons-votes-api/route.ts.
//
// Composition: 22 departmental select (committeeType 1) + 5 cross-cutting
// select (committeeType 22) + 2 prominent domestic select (committeeType 3:
// Liaison 103, Standards 290).
//
// Known flag: 783 (Business and Trade Sub-Committee on Economic Security,
// Arms and Export Controls) is a sub-committee, not a standalone body.
// Monitor for dissolution; replace with Privileges (289) if wound up.
export const COMMITTEE_IDS: number[] = [
  // Departmental select committees
  17, 24, 52, 78, 81, 83, 98, 102, 120, 135, 136, 153, 158, 162, 164, 203,
  326, 328, 365, 378, 664, 783,
  // Cross-cutting select committees
  62, 93, 111, 127, 327,
  // Prominent domestic select committees
  103, 290,
];
