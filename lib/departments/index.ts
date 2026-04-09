import type { DepartmentData } from './types';
import treasury from './treasury';
import homeOffice from './home-office';
import health from './health';
import energy from './energy';
import education from './education';
import workPensions from './work-pensions';
import transport from './transport';
import environment from './environment';
import businessTrade from './business-trade';
import scienceTech from './science-tech';
import housing from './housing';
import justice from './justice';
import defence from './defence';
import culture from './culture';
import cabinetOffice from './cabinet-office';
import foreignOffice from './foreign-office';
import attorneyGeneral from './attorney-general';
import scotlandOffice from './scotland-office';
import walesOffice from './wales-office';
import northernIrelandOffice from './northern-ireland-office';
import commonsLeader from './commons-leader';
import lordsLeader from './lords-leader';
import advocateGeneral from './advocate-general';
import ukef from './ukef';

export const departments: DepartmentData[] = [
  treasury,
  homeOffice,
  health,
  energy,
  education,
  workPensions,
  transport,
  environment,
  businessTrade,
  scienceTech,
  housing,
  justice,
  defence,
  culture,
  cabinetOffice,
  foreignOffice,
  attorneyGeneral,
  scotlandOffice,
  walesOffice,
  northernIrelandOffice,
  commonsLeader,
  lordsLeader,
  advocateGeneral,
  ukef,
];

export type { DepartmentData };
