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

export type ControlZonePosition = {
  zone: string;
  context: string;
  positions: PartyPosition[];
};

export type DepartmentData = {
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
  partyPositions: PartyPosition[];
  controlZonePositions?: ControlZonePosition[];
};
