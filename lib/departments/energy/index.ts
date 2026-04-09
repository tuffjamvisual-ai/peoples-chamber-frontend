import type { DepartmentData } from '../types';
import meta from './meta';
import energyBills from './energy-bills';
import netZero from './net-zero';
import renewableEnergy from './renewable-energy';
import nuclearPower from './nuclear-power';
import northSeaOilGas from './north-sea-oil-gas';
import energyPriceCap from './energy-price-cap';
import solarWind from './solar-wind';
import homeInsulation from './home-insulation';
import heatPumps from './heat-pumps';
import carbonTargets from './carbon-targets';
import hydrogenStrategy from './hydrogen-strategy';
import electricityGrid from './electricity-grid';
import energyStorage from './energy-storage';
import smartMeters from './smart-meters';
import fuelPoverty from './fuel-poverty';
import carbonCapture from './carbon-capture';
import evInfrastructure from './ev-infrastructure';
import greenJobs from './green-jobs';
import energySecurity from './energy-security';
import internationalClimateFinance from './international-climate-finance';

const energy: DepartmentData = {
  ...meta,
  partyPositions: [],
  controlZonePositions: [
    energyBills,
    netZero,
    renewableEnergy,
    nuclearPower,
    northSeaOilGas,
    energyPriceCap,
    solarWind,
    homeInsulation,
    heatPumps,
    carbonTargets,
    hydrogenStrategy,
    electricityGrid,
    energyStorage,
    smartMeters,
    fuelPoverty,
    carbonCapture,
    evInfrastructure,
    greenJobs,
    energySecurity,
    internationalClimateFinance,
  ],
};

export default energy;
