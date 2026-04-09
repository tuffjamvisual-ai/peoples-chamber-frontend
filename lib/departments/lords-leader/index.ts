import type { DepartmentData } from '../types';
import meta from './meta';
import lordsBusiness from './lords-business';
import lordsReform from './lords-reform';
import hereditaryPeers from './hereditary-peers';
import lifePeersAppointments from './life-peers-appointments';
import lordsProcedure from './lords-procedure';
import governmentBillsInLords from './government-bills-in-lords';
import lordsAmendments from './lords-amendments';
import lordsCommittees from './lords-committees';
import lordsAttendance from './lords-attendance';
import lordsExpenses from './lords-expenses';

const lordsLeader: DepartmentData = {
  ...meta,
  partyPositions: [],
  controlZonePositions: [
    lordsBusiness,
    lordsReform,
    hereditaryPeers,
    lifePeersAppointments,
    lordsProcedure,
    governmentBillsInLords,
    lordsAmendments,
    lordsCommittees,
    lordsAttendance,
    lordsExpenses,
  ],
};

export default lordsLeader;
