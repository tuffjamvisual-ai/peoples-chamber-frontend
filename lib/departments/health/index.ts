import type { DepartmentData } from '../types';
import meta from './meta';
import nhsFunding from './nhs-funding';
import nhsWaitingLists from './nhs-waiting-lists';
import socialCare from './social-care';
import mentalHealth from './mental-health';
import gpServices from './gp-services';
import hospitals from './hospitals';
import dentistry from './dentistry';
import medicinesPharmacy from './medicines-pharmacy';
import publicHealth from './public-health';
import cancerTreatment from './cancer-treatment';
import ambulanceServices from './ambulance-services';
import careHomes from './care-homes';
import disabilitySupport from './disability-support';
import vaccines from './vaccines';
import obesityStrategy from './obesity-strategy';
import alcoholDrugTreatment from './alcohol-drug-treatment';
import womenSHealth from './women-s-health';
import childrenSHealth from './children-s-health';
import nhsWorkforce from './nhs-workforce';
import patientSafety from './patient-safety';

const health: DepartmentData = {
  ...meta,
  partyPositions: [],
  controlZonePositions: [
    nhsFunding,
    nhsWaitingLists,
    socialCare,
    mentalHealth,
    gpServices,
    hospitals,
    dentistry,
    medicinesPharmacy,
    publicHealth,
    cancerTreatment,
    ambulanceServices,
    careHomes,
    disabilitySupport,
    vaccines,
    obesityStrategy,
    alcoholDrugTreatment,
    womenSHealth,
    childrenSHealth,
    nhsWorkforce,
    patientSafety,
  ],
};

export default health;
