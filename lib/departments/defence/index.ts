import type { DepartmentData } from '../types';
import meta from './meta';
import defenceBudget from './defence-budget';
import armedForces from './armed-forces';
import nuclearDeterrent from './nuclear-deterrent';
import natoCommitment from './nato-commitment';
import ukraineSupport from './ukraine-support';
import army from './army';
import royalNavy from './royal-navy';
import raf from './raf';
import veteransSupport from './veterans-support';
import defenceProcurement from './defence-procurement';
import cyberWarfare from './cyber-warfare';
import intelligenceServices from './intelligence-services';
import reserveForces from './reserve-forces';
import militaryHousing from './military-housing';
import defenceIndustry from './defence-industry';
import spaceDefence from './space-defence';
import droneWarfare from './drone-warfare';
import specialForces from './special-forces';
import militaryJustice from './military-justice';
import overseasBases from './overseas-bases';

const defence: DepartmentData = {
  ...meta,
  partyPositions: [],
  controlZonePositions: [
    defenceBudget,
    armedForces,
    nuclearDeterrent,
    natoCommitment,
    ukraineSupport,
    army,
    royalNavy,
    raf,
    veteransSupport,
    defenceProcurement,
    cyberWarfare,
    intelligenceServices,
    reserveForces,
    militaryHousing,
    defenceIndustry,
    spaceDefence,
    droneWarfare,
    specialForces,
    militaryJustice,
    overseasBases,
  ],
};

export default defence;
