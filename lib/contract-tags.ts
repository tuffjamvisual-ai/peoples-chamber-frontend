// Cache tags for contract pages (A16, owner rule 15 Nov 2026, COWORK-TO-T1 ENTRY 129): every read on /contracts/[ocid]
// carries 'contract-notices' (all contract pages) and contract:<ocid> (that procurement's page). sync-government-contracts
// refreshes contract:<ocid> only for procurements that got a new notice or a newer lot.
export const CONTRACT_NOTICES_TAG = 'contract-notices';
export const contractTag = (ocid: string) => `contract:${ocid}`;
