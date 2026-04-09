import type { DepartmentData } from '../types';
import meta from './meta';
import welshDevolution from './welsh-devolution';
import walesAct from './wales-act';
import barnettFormulaWales from './barnett-formula-wales';
import seneddRelations from './senedd-relations';
import reservedMattersWales from './reserved-matters-wales';
import welshBudget from './welsh-budget';
import crossBorderIssuesWales from './cross-border-issues-wales';
import walesInTheUnion from './wales-in-the-union';
import welshLanguagePolicy from './welsh-language-policy';
import infrastructureInWales from './infrastructure-in-wales';

const walesOffice: DepartmentData = {
  ...meta,
  partyPositions: [],
  controlZonePositions: [
    welshDevolution,
    walesAct,
    barnettFormulaWales,
    seneddRelations,
    reservedMattersWales,
    welshBudget,
    crossBorderIssuesWales,
    walesInTheUnion,
    welshLanguagePolicy,
    infrastructureInWales,
  ],
};

export default walesOffice;
