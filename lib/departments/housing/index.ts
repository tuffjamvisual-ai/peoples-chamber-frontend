import type { DepartmentData } from '../types';
import meta from './meta';
import housebuildingTargets from './housebuilding-targets';
import planningReform from './planning-reform';
import affordableHousing from './affordable-housing';
import socialHousing from './social-housing';
import rentersRights from './renters-rights';
import leaseholdReform from './leasehold-reform';
import localGovernmentFunding from './local-government-funding';
import councilTax from './council-tax';
import roughSleeping from './rough-sleeping';
import homelessness from './homelessness';
import buildingSafety from './building-safety';
import grenfellLegacy from './grenfell-legacy';
import devolution from './devolution';
import mayoralAuthorities from './mayoral-authorities';
import communityCohesion from './community-cohesion';
import levellingUp from './levelling-up';
import emptyHomes from './empty-homes';
import greenBelt from './green-belt';
import firstHomesScheme from './first-homes-scheme';
import housingBenefitsOversight from './housing-benefits-oversight';

const housing: DepartmentData = {
  ...meta,
  partyPositions: [],
  controlZonePositions: [
    housebuildingTargets,
    planningReform,
    affordableHousing,
    socialHousing,
    rentersRights,
    leaseholdReform,
    localGovernmentFunding,
    councilTax,
    roughSleeping,
    homelessness,
    buildingSafety,
    grenfellLegacy,
    devolution,
    mayoralAuthorities,
    communityCohesion,
    levellingUp,
    emptyHomes,
    greenBelt,
    firstHomesScheme,
    housingBenefitsOversight,
  ],
};

export default housing;
