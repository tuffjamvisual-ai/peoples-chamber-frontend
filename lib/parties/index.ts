export type Party = {
  id: string;
  name: string;
  colour: string;
  textColour: string;
  leader: string;
  description: string;
  hasMP: boolean;
};

export const parties: Party[] = [
  { id: 'labour', name: 'Labour', colour: '#d50000', textColour: '#ffffff', leader: 'Keir Starmer', description: 'Centre-left governing party', hasMP: true },
  { id: 'conservative', name: 'Conservative', colour: '#0087dc', textColour: '#ffffff', leader: 'Kemi Badenoch', description: 'Centre-right main opposition', hasMP: true },
  { id: 'reform', name: 'Reform UK', colour: '#12b6cf', textColour: '#ffffff', leader: 'Nigel Farage', description: 'Right-wing populist party', hasMP: true },
  { id: 'libdem', name: 'Liberal Democrat', colour: '#faa61a', textColour: '#ffffff', leader: 'Ed Davey', description: 'Centrist party', hasMP: true },
  { id: 'green', name: 'Green Party', colour: '#02a95b', textColour: '#ffffff', leader: 'Zack Polanski', description: 'Left-wing environmentalist party', hasMP: true },
  { id: 'snp', name: 'Scottish National Party', colour: '#fff200', textColour: '#000000', leader: 'John Swinney', description: 'Scottish nationalist party', hasMP: true },
  { id: 'plaid', name: 'Plaid Cymru', colour: '#005b54', textColour: '#ffffff', leader: 'Rhun ap Iorwerth', description: 'Welsh nationalist party', hasMP: true },
  { id: 'yourparty', name: 'Your Party', colour: '#8b0000', textColour: '#ffffff', leader: 'Jeremy Corbyn', description: 'Socialist left party', hasMP: true },
  { id: 'dup', name: 'Democratic Unionist Party', colour: '#d46a4c', textColour: '#ffffff', leader: 'Gavin Robinson', description: 'Northern Ireland unionist party', hasMP: true },
  { id: 'sinnfein', name: 'Sinn Féin', colour: '#326760', textColour: '#ffffff', leader: 'Michelle O\'Neill', description: 'Irish republican party. Sinn Féin MPs do not take their seats in Westminster as part of their abstentionist policy, refusing to swear allegiance to the British monarch.', hasMP: true },
  { id: 'sdlp', name: 'Social Democratic & Labour Party', colour: '#2aa82c', textColour: '#ffffff', leader: 'Colum Eastwood', description: 'Nationalist social democratic party', hasMP: true },
  { id: 'alliance', name: 'Alliance', colour: '#f6cb2f', textColour: '#000000', leader: 'Naomi Long', description: 'Cross-community centrist party', hasMP: true },
  { id: 'tuv', name: 'Traditional Unionist Voice', colour: '#0c3a6e', textColour: '#ffffff', leader: 'Jim Allister', description: 'Traditional unionist party', hasMP: true },
  { id: 'uup', name: 'Ulster Unionist Party', colour: '#48a5ee', textColour: '#ffffff', leader: 'Doug Beattie', description: 'Ulster unionist party', hasMP: true },
  { id: 'restore', name: 'Restore Britain', colour: '#1a1a2e', textColour: '#ffffff', leader: 'Rupert Lowe', description: 'Right-wing populist party', hasMP: true },
  { id: 'labour-coop', name: 'Labour (Co-op)', colour: '#d50000', textColour: '#ffffff', leader: 'Keir Starmer', description: 'Centre-left governing party. Labour MPs additionally affiliated with the Co-operative Party — a longstanding sister party of Labour representing the co-operative movement.', hasMP: true },
  { id: 'independent', name: 'Independent', colour: '#888888', textColour: '#ffffff', leader: 'None', description: 'MPs not affiliated with any political party — typically after losing or resigning the whip from a major party, or elected on a non-party platform.', hasMP: true },
  { id: 'speaker', name: 'Speaker', colour: '#1a1a1a', textColour: '#ffffff', leader: 'Sir Lindsay Hoyle', description: 'The Speaker of the House of Commons presides over debates with strict political neutrality and traditionally does not vote or participate in party politics, despite being elected to Parliament under a party banner.', hasMP: true },
  { id: 'others', name: 'Others', colour: '#555555', textColour: '#ffffff', leader: 'Various', description: 'UKIP, Alba and other parties with published policies', hasMP: false },
];
