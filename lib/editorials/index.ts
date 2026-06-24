// Editorial registry. Add new pieces here as ./<slug>.ts files exported
// as default, then list them below. The route at app/editorials/[slug]
// reads from this map.

import type { EditorialRegistry } from './types';
import tenWorstCouncils from './ten-worst-performing-councils-england';
import biggestWestminsterScandals from './kxlkhj1jgj';
import powerForSale from './power-for-sale-20-politicians-who-cashed-in';
import whenDidPoliticiansStop from './when-did-politicians-stop-taking-responsibility';
import theRevolvingDoor from './the-revolving-door';
import mostDisgracedPoliticians from './britains-most-disgraced-politicians';
import burnhamRecord from './andy-burnham-the-record-behind-the-reputation';
import labourBrokenPromises from './whr8acs2gf';
import councilTaxProblem from './awsucrmvr1';

export const editorials: EditorialRegistry = {
  [councilTaxProblem.slug]: councilTaxProblem,
  [labourBrokenPromises.slug]: labourBrokenPromises,
  [tenWorstCouncils.slug]: tenWorstCouncils,
  [biggestWestminsterScandals.slug]: biggestWestminsterScandals,
  [powerForSale.slug]: powerForSale,
  [whenDidPoliticiansStop.slug]: whenDidPoliticiansStop,
  [theRevolvingDoor.slug]: theRevolvingDoor,
  [mostDisgracedPoliticians.slug]: mostDisgracedPoliticians,
  [burnhamRecord.slug]: burnhamRecord,
};
