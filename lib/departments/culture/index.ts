import type { DepartmentData } from '../types';
import meta from './meta';
import bbcBroadcasting from './bbc-broadcasting';
import pressRegulation from './press-regulation';
import artsFunding from './arts-funding';
import sportFunding from './sport-funding';
import olympics from './olympics';
import gamblingRegulation from './gambling-regulation';
import tourism from './tourism';
import heritageMuseums from './heritage-museums';
import creativeIndustries from './creative-industries';
import filmTv from './film-tv';
import musicIndustry from './music-industry';
import libraries from './libraries';
import gaming from './gaming';
import esports from './esports';
import nationalLottery from './national-lottery';
import footballRegulation from './football-regulation';
import internetSafety from './internet-safety';
import onlineHarms from './online-harms';
import copyright from './copyright';
import publicMonuments from './public-monuments';

const culture: DepartmentData = {
  ...meta,
  partyPositions: [],
  controlZonePositions: [
    bbcBroadcasting,
    pressRegulation,
    artsFunding,
    sportFunding,
    olympics,
    gamblingRegulation,
    tourism,
    heritageMuseums,
    creativeIndustries,
    filmTv,
    musicIndustry,
    libraries,
    gaming,
    esports,
    nationalLottery,
    footballRegulation,
    internetSafety,
    onlineHarms,
    copyright,
    publicMonuments,
  ],
};

export default culture;
