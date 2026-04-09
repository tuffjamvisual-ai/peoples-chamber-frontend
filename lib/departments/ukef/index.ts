import type { DepartmentData } from '../types';
import meta from './meta';
import exportGuarantees from './export-guarantees';
import exportInsurance from './export-insurance';
import tradeFinance from './trade-finance';
import overseasInvestment from './overseas-investment';
import defenceExports from './defence-exports';
import infrastructureExports from './infrastructure-exports';
import greenExportFinance from './green-export-finance';
import fossilFuelExportFinance from './fossil-fuel-export-finance';
import smeExportSupport from './sme-export-support';
import directLending from './direct-lending';

const ukef: DepartmentData = {
  ...meta,
  partyPositions: [],
  controlZonePositions: [
    exportGuarantees,
    exportInsurance,
    tradeFinance,
    overseasInvestment,
    defenceExports,
    infrastructureExports,
    greenExportFinance,
    fossilFuelExportFinance,
    smeExportSupport,
    directLending,
  ],
};

export default ukef;
