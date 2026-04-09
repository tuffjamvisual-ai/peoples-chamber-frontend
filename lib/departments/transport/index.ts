import type { DepartmentData } from '../types';
import meta from './meta';
import rail from './rail';
import roadsMotorways from './roads-motorways';
import hs2 from './hs2';
import aviation from './aviation';
import drivingLicencesDvla from './driving-licences-dvla';
import roadTax from './road-tax';
import busServices from './bus-services';
import activeTravel from './active-travel';
import electricVehicles from './electric-vehicles';
import freightLogistics from './freight-logistics';
import maritimePorts from './maritime-ports';
import roadSafety from './road-safety';
import speedLimits from './speed-limits';
import transportForLondon from './transport-for-london';
import northernPowerhouseRail from './northern-powerhouse-rail';
import cyclingInfrastructure from './cycling-infrastructure';
import motVehicleStandards from './mot-vehicle-standards';
import autonomousVehicles from './autonomous-vehicles';
import drones from './drones';
import transportDecarbonisation from './transport-decarbonisation';

const transport: DepartmentData = {
  ...meta,
  partyPositions: [],
  controlZonePositions: [
    rail,
    roadsMotorways,
    hs2,
    aviation,
    drivingLicencesDvla,
    roadTax,
    busServices,
    activeTravel,
    electricVehicles,
    freightLogistics,
    maritimePorts,
    roadSafety,
    speedLimits,
    transportForLondon,
    northernPowerhouseRail,
    cyclingInfrastructure,
    motVehicleStandards,
    autonomousVehicles,
    drones,
    transportDecarbonisation,
  ],
};

export default transport;
