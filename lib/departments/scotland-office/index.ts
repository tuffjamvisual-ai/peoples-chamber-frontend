import type { DepartmentData } from '../types';
import meta from './meta';
import scottishDevolution from './scottish-devolution';
import scotlandAct from './scotland-act';
import barnettFormula from './barnett-formula';
import independenceReferendum from './independence-referendum';
import ukScotlandRelations from './uk-scotland-relations';
import reservedMatters from './reserved-matters';
import scottishParliamentLiaison from './scottish-parliament-liaison';
import scotlandSBudget from './scotland-s-budget';
import crossBorderIssues from './cross-border-issues';
import scotlandInTheUnion from './scotland-in-the-union';

const scotlandOffice: DepartmentData = {
  ...meta,
  partyPositions: [],
  controlZonePositions: [
    scottishDevolution,
    scotlandAct,
    barnettFormula,
    independenceReferendum,
    ukScotlandRelations,
    reservedMatters,
    scottishParliamentLiaison,
    scotlandSBudget,
    crossBorderIssues,
    scotlandInTheUnion,
  ],
};

export default scotlandOffice;
