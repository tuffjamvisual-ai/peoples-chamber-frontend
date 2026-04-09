import type { DepartmentData } from '../types';
import meta from './meta';
import tradeDeals from './trade-deals';
import exportSupport from './export-support';
import businessRegulation from './business-regulation';
import workersRights from './workers-rights';
import minimumWage from './minimum-wage';
import employmentLaw from './employment-law';
import smallBusinessSupport from './small-business-support';
import competitionPolicy from './competition-policy';
import postOffice from './post-office';
import companiesHouse from './companies-house';
import intellectualProperty from './intellectual-property';
import consumerRights from './consumer-rights';
import productSafety from './product-safety';
import usTariffs from './us-tariffs';
import investInGreatBritain from './invest-in-great-britain';
import industrialStrategy from './industrial-strategy';
import freePorts from './free-ports';
import steelIndustry from './steel-industry';
import automotiveSector from './automotive-sector';
import techSectorSupport from './tech-sector-support';

const businessTrade: DepartmentData = {
  ...meta,
  partyPositions: [],
  controlZonePositions: [
    tradeDeals,
    exportSupport,
    businessRegulation,
    workersRights,
    minimumWage,
    employmentLaw,
    smallBusinessSupport,
    competitionPolicy,
    postOffice,
    companiesHouse,
    intellectualProperty,
    consumerRights,
    productSafety,
    usTariffs,
    investInGreatBritain,
    industrialStrategy,
    freePorts,
    steelIndustry,
    automotiveSector,
    techSectorSupport,
  ],
};

export default businessTrade;
