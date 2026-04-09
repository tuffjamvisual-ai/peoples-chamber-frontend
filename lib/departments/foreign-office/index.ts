import type { DepartmentData } from '../types';
import meta from './meta';
import ukEuRelations from './uk-eu-relations';
import usRelations from './us-relations';
import chinaPolicy from './china-policy';
import russiaSanctions from './russia-sanctions';
import ukraineDiplomacy from './ukraine-diplomacy';
import middleEastPolicy from './middle-east-policy';
import unSecurityCouncil from './un-security-council';
import nato from './nato';
import commonwealth from './commonwealth';
import foreignAid from './foreign-aid';
import consularServices from './consular-services';
import britishOverseasTerritories from './british-overseas-territories';
import tradeDiplomacy from './trade-diplomacy';
import climateDiplomacy from './climate-diplomacy';
import humanRightsPolicy from './human-rights-policy';
import sanctions from './sanctions';
import counterTerrorismOverseas from './counter-terrorism-overseas';
import refugeeAsylumDiplomacy from './refugee-asylum-diplomacy';
import gibraltar from './gibraltar';
import falklands from './falklands';

const foreignOffice: DepartmentData = {
  ...meta,
  partyPositions: [],
  controlZonePositions: [
    ukEuRelations,
    usRelations,
    chinaPolicy,
    russiaSanctions,
    ukraineDiplomacy,
    middleEastPolicy,
    unSecurityCouncil,
    nato,
    commonwealth,
    foreignAid,
    consularServices,
    britishOverseasTerritories,
    tradeDiplomacy,
    climateDiplomacy,
    humanRightsPolicy,
    sanctions,
    counterTerrorismOverseas,
    refugeeAsylumDiplomacy,
    gibraltar,
    falklands,
  ],
};

export default foreignOffice;
