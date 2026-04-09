import type { DepartmentData } from '../types';
import meta from './meta';
import parliamentaryBusiness from './parliamentary-business';
import legislativeProgramme from './legislative-programme';
import commonsProcedure from './commons-procedure';
import governmentBillsTimetable from './government-bills-timetable';
import oppositionDayDebates from './opposition-day-debates';
import selectCommittees from './select-committees';
import parliamentaryQuestions from './parliamentary-questions';
import recessDates from './recess-dates';
import commonsReform from './commons-reform';
import speakerRelations from './speaker-relations';

const commonsLeader: DepartmentData = {
  ...meta,
  partyPositions: [],
  controlZonePositions: [
    parliamentaryBusiness,
    legislativeProgramme,
    commonsProcedure,
    governmentBillsTimetable,
    oppositionDayDebates,
    selectCommittees,
    parliamentaryQuestions,
    recessDates,
    commonsReform,
    speakerRelations,
  ],
};

export default commonsLeader;
