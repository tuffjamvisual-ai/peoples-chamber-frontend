import type { DepartmentData } from '../types';
import meta from './meta';
import stormont from './stormont';
import windsorFramework from './windsor-framework';
import goodFridayAgreement from './good-friday-agreement';
import niProtocol from './ni-protocol';
import crossBorderRelations from './cross-border-relations';
import niBudget from './ni-budget';
import legacyIssues from './legacy-issues';
import victimsIssues from './victims-issues';
import niSecurity from './ni-security';
import niInTheUnion from './ni-in-the-union';

const northernIrelandOffice: DepartmentData = {
  ...meta,
  partyPositions: [],
  controlZonePositions: [
    stormont,
    windsorFramework,
    goodFridayAgreement,
    niProtocol,
    crossBorderRelations,
    niBudget,
    legacyIssues,
    victimsIssues,
    niSecurity,
    niInTheUnion,
  ],
};

export default northernIrelandOffice;
