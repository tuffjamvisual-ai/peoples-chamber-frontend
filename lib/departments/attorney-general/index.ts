import type { DepartmentData } from '../types';
import meta from './meta';
import legalAdviceToGovernment from './legal-advice-to-government';
import crownProsecutionService from './crown-prosecution-service';
import seriousFraudOffice from './serious-fraud-office';
import governmentLitigation from './government-litigation';
import publicInterestImmunity from './public-interest-immunity';
import treatyObligations from './treaty-obligations';
import internationalLaw from './international-law';
import contemptOfCourt from './contempt-of-court';
import undulyLenientSentences from './unduly-lenient-sentences';
import lawOfficers from './law-officers';

const attorneyGeneral: DepartmentData = {
  ...meta,
  partyPositions: [],
  controlZonePositions: [
    legalAdviceToGovernment,
    crownProsecutionService,
    seriousFraudOffice,
    governmentLitigation,
    publicInterestImmunity,
    treatyObligations,
    internationalLaw,
    contemptOfCourt,
    undulyLenientSentences,
    lawOfficers,
  ],
};

export default attorneyGeneral;
