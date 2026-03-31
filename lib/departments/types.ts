export type CurrentIssue = {
  title: string;
  description: string;
  hot: boolean;
};

export type PartyPosition = {
  partyId: string;
  headline: string;
  position: string;
};

export type ControlZoneData = {
  zone: string;
  context: string;
  positions: PartyPosition[];
};

export type DepartmentMeta = {
  slug: string;
  name: string;
  shortName: string;
  minister: string;
  ministerParty: string;
  ministerPhoto: string;
  controlZones: string[];
  description: string;
  streetContext: string;
  currentIssues: CurrentIssue[];
};

export type DepartmentData = DepartmentMeta & {
  partyPositions: PartyPosition[];
  controlZonePositions?: ControlZoneData[];
};
