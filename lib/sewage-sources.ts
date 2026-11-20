import { MEASURE_SOURCE_URLS } from '@/lib/council-league';

// Where the storm overflow figures come from (Cowork ENTRY 410: listed in the Sources fold, not in the text). England:
// the Environment Agency's annual returns on data.gov.uk (the league table's address); Scotland: Scottish Water's page
// the import reads (scripts/import-sewage-scotland.js); Northern Ireland: NI Water's spreadsheet the import reads
// (scripts/import-sewage.js). Licences: OGL v3.0 for the Environment Agency and Scottish Water; none stated by NI Water.
export const SEWAGE_SOURCES = {
  England: { label: 'Environment Agency, Event Duration Monitoring storm overflow annual returns', href: MEASURE_SOURCE_URLS.sewage },
  Scotland: { label: 'Scottish Water, Reported and Non-Reported Overflow Event Data', href: 'https://www.scottishwater.co.uk/Help-and-Resources/Document-Hub/Key-Publications/Urban-Waters-Improvements' },
  'Northern Ireland': { label: 'NI Water, Event Duration Monitor data (spreadsheet)', href: 'https://www.niwater.com/media/3mwndn2k/event-duration-monitor-data-august-2026.xlsx' },
} as const;
