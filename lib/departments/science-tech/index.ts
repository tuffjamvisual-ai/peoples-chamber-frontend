import type { DepartmentData } from '../types';
import meta from './meta';
import aiStrategy from './ai-strategy';
import rDFunding from './r-d-funding';
import broadbandDigitalInfrastructure from './broadband-digital-infrastructure';
import onlineSafety from './online-safety';
import cybersecurity from './cybersecurity';
import space from './space';
import lifeSciences from './life-sciences';
import quantumComputing from './quantum-computing';
import dataPrivacy from './data-privacy';
import techRegulation from './tech-regulation';
import ukri from './ukri';
import universityResearchFunding from './university-research-funding';
import digitalGovernment from './digital-government';
import semiconductors from './semiconductors';
import techVisas from './tech-visas';
import scienceDiplomacy from './science-diplomacy';
import nuclearResearch from './nuclear-research';
import robotics from './robotics';
import digitalIdentity from './digital-identity';
import techSkills from './tech-skills';

const scienceTech: DepartmentData = {
  ...meta,
  partyPositions: [],
  controlZonePositions: [
    aiStrategy,
    rDFunding,
    broadbandDigitalInfrastructure,
    onlineSafety,
    cybersecurity,
    space,
    lifeSciences,
    quantumComputing,
    dataPrivacy,
    techRegulation,
    ukri,
    universityResearchFunding,
    digitalGovernment,
    semiconductors,
    techVisas,
    scienceDiplomacy,
    nuclearResearch,
    robotics,
    digitalIdentity,
    techSkills,
  ],
};

export default scienceTech;
