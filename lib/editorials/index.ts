// Editorial registry. Add new pieces here as ./<slug>.ts files exported
// as default, then list them below. The route at app/editorials/[slug]
// reads from this map.

import type { EditorialRegistry } from './types';
import tenWorstCouncils from './ten-worst-performing-councils-england';
import biggestWestminsterScandals from './biggest-westminster-scandals-among-serving-mps-2026';
import powerForSale from './power-for-sale-20-politicians-who-cashed-in';
import whenDidPoliticiansStop from './when-did-politicians-stop-taking-responsibility';
import theRevolvingDoor from './the-revolving-door';

export const editorials: EditorialRegistry = {
  [tenWorstCouncils.slug]: tenWorstCouncils,
  [biggestWestminsterScandals.slug]: biggestWestminsterScandals,
  [powerForSale.slug]: powerForSale,
  [whenDidPoliticiansStop.slug]: whenDidPoliticiansStop,
  [theRevolvingDoor.slug]: theRevolvingDoor,
};
