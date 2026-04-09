import type { DepartmentData } from '../types';
import meta from './meta';
import prisons from './prisons';
import probation from './probation';
import courtsTribunals from './courts-tribunals';
import legalAid from './legal-aid';
import sentencingPolicy from './sentencing-policy';
import youthJustice from './youth-justice';
import rehabilitation from './rehabilitation';
import prisonOvercrowding from './prison-overcrowding';
import paroleBoard from './parole-board';
import judicialAppointments from './judicial-appointments';
import humanRightsAct from './human-rights-act';
import echr from './echr';
import victimsRights from './victims-rights';
import familyCourts from './family-courts';
import civilCourts from './civil-courts';
import magistrates from './magistrates';
import communitySentences from './community-sentences';
import reoffendingRates from './reoffending-rates';
import prisonStaff from './prison-staff';
import crownProsecutionServiceLiaison from './crown-prosecution-service-liaison';

const justice: DepartmentData = {
  ...meta,
  partyPositions: [],
  controlZonePositions: [
    prisons,
    probation,
    courtsTribunals,
    legalAid,
    sentencingPolicy,
    youthJustice,
    rehabilitation,
    prisonOvercrowding,
    paroleBoard,
    judicialAppointments,
    humanRightsAct,
    echr,
    victimsRights,
    familyCourts,
    civilCourts,
    magistrates,
    communitySentences,
    reoffendingRates,
    prisonStaff,
    crownProsecutionServiceLiaison,
  ],
};

export default justice;
