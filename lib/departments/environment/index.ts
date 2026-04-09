import type { DepartmentData } from '../types';
import meta from './meta';
import farmingSubsidies from './farming-subsidies';
import foodStandards from './food-standards';
import waterQuality from './water-quality';
import airQuality from './air-quality';
import biodiversity from './biodiversity';
import rewilding from './rewilding';
import floodDefence from './flood-defence';
import fishingFisheries from './fishing-fisheries';
import animalWelfare from './animal-welfare';
import pesticides from './pesticides';
import wasteRecycling from './waste-recycling';
import plasticPollution from './plastic-pollution';
import nationalParks from './national-parks';
import treePlanting from './tree-planting';
import inheritanceTaxOnFarms from './inheritance-tax-on-farms';
import sewageWaterCompanies from './sewage-water-companies';
import ruralAffairs from './rural-affairs';
import foodSecurity from './food-security';
import veterinaryServices from './veterinary-services';
import climateAdaptation from './climate-adaptation';

const environment: DepartmentData = {
  ...meta,
  partyPositions: [],
  controlZonePositions: [
    farmingSubsidies,
    foodStandards,
    waterQuality,
    airQuality,
    biodiversity,
    rewilding,
    floodDefence,
    fishingFisheries,
    animalWelfare,
    pesticides,
    wasteRecycling,
    plasticPollution,
    nationalParks,
    treePlanting,
    inheritanceTaxOnFarms,
    sewageWaterCompanies,
    ruralAffairs,
    foodSecurity,
    veterinaryServices,
    climateAdaptation,
  ],
};

export default environment;
