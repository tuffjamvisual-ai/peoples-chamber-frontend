// The 93 former MPs with a basic profile built from Parliament's member record (owner, 6 Nov 2026; /mps/<id>, lib/former-mps.ts memberRecord). They appear in
// Hansard at PMQs but Parliament holds no Commons history for them, so which members they are can't be worked out when the sitemap is built without
// one Members API call per member. The list comes from the build's own check of each page, and the records are historic, so it is not expected to change.
export const FORMER_MP_PROFILE_IDS: readonly number[] = [
  30, 110, 137, 212, 293, 378, 511, 587, 612, 614, 653, 739, 758, 764, 769, 793, 818, 826, 828, 844, 850, 884,
  904, 920, 923, 927, 929, 934, 948, 960, 984, 988, 990, 1001, 1078, 1095, 1105, 1112, 1300, 1303, 1351, 1356,
  1359, 1450, 1677, 1718, 1781, 1814, 1815, 1926, 1968, 1996, 2224, 2243, 2286, 2300, 2311, 2324, 2340, 2345,
  2348, 2366, 2386, 2397, 2416, 2426, 2565, 2630, 2676, 2684, 2750, 2821, 2844, 2894, 2938, 2984, 3005, 3024,
  3026, 3027, 3037, 3049, 3055, 3075, 3181, 3219, 3232, 3297, 3315, 3415, 3441, 3598, 4261,
];
