import type { DepartmentData } from '../types';
import meta from './meta';
import scotsLawAdvice from './scots-law-advice';
import scottishLegalIssues from './scottish-legal-issues';
import ukLegislationInScotland from './uk-legislation-in-scotland';
import devolutionLegalQuestions from './devolution-legal-questions';
import treatyLawScotland from './treaty-law-scotland';
import scottishCourtsLiaison from './scottish-courts-liaison';
import lawReformScotland from './law-reform-scotland';
import publicInquiriesScotland from './public-inquiries-scotland';
import scottishBarRelations from './scottish-bar-relations';
import constitutionalLawScotland from './constitutional-law-scotland';

const advocateGeneral: DepartmentData = {
  ...meta,
  partyPositions: [],
  controlZonePositions: [
    scotsLawAdvice,
    scottishLegalIssues,
    ukLegislationInScotland,
    devolutionLegalQuestions,
    treatyLawScotland,
    scottishCourtsLiaison,
    lawReformScotland,
    publicInquiriesScotland,
    scottishBarRelations,
    constitutionalLawScotland,
  ],
};

export default advocateGeneral;
