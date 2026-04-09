import type { DepartmentData } from '../types';
import meta from './meta';
import smallBoats from './small-boats';
import immigration from './immigration';
import policing from './policing';
import counterTerrorism from './counter-terrorism';
import drugs from './drugs';
import passportsVisas from './passports-visas';
import prisons from './prisons';
import crime from './crime';
import borders from './borders';
import asylum from './asylum';
import firearms from './firearms';
import organisedCrime from './organised-crime';
import humanTrafficking from './human-trafficking';
import identityBiometrics from './identity-biometrics';
import fireService from './fire-service';
import emergencyServices from './emergency-services';
import extremismRadicalisation from './extremism-radicalisation';
import gchqOversight from './gchq-oversight';
import mi5Oversight from './mi5-oversight';
import deportationPolicy from './deportation-policy';

const homeOffice: DepartmentData = {
  ...meta,
  partyPositions: [],
  controlZonePositions: [
    smallBoats,
    immigration,
    policing,
    counterTerrorism,
    drugs,
    passportsVisas,
    prisons,
    crime,
    borders,
    asylum,
    firearms,
    organisedCrime,
    humanTrafficking,
    identityBiometrics,
    fireService,
    emergencyServices,
    extremismRadicalisation,
    gchqOversight,
    mi5Oversight,
    deportationPolicy,
  ],
};

export default homeOffice;
