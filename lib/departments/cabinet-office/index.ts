import type { DepartmentData } from '../types';
import meta from './meta';
import civilServiceReform from './civil-service-reform';
import governmentEfficiency from './government-efficiency';
import constitutionDemocracy from './constitution-democracy';
import electionsVoting from './elections-voting';
import nationalSecurity from './national-security';
import emergencyPlanning from './emergency-planning';
import governmentDigitalService from './government-digital-service';
import publicProcurement from './public-procurement';
import honoursSystem from './honours-system';
import cabinetCommittees from './cabinet-committees';
import ministerialCode from './ministerial-code';
import unionPolicy from './union-policy';
import devolutionOversight from './devolution-oversight';
import governmentCommunications from './government-communications';
import centralGovernmentPay from './central-government-pay';
import counterCorruption from './counter-corruption';
import lobbyingRegulation from './lobbying-regulation';
import freedomOfInformation from './freedom-of-information';
import dataSharing from './data-sharing';
import aiInGovernment from './ai-in-government';

const cabinetOffice: DepartmentData = {
  ...meta,
  partyPositions: [],
  controlZonePositions: [
    civilServiceReform,
    governmentEfficiency,
    constitutionDemocracy,
    electionsVoting,
    nationalSecurity,
    emergencyPlanning,
    governmentDigitalService,
    publicProcurement,
    honoursSystem,
    cabinetCommittees,
    ministerialCode,
    unionPolicy,
    devolutionOversight,
    governmentCommunications,
    centralGovernmentPay,
    counterCorruption,
    lobbyingRegulation,
    freedomOfInformation,
    dataSharing,
    aiInGovernment,
  ],
};

export default cabinetOffice;
