// MP names as shown to readers (24 Oct 2026). Parliament's display name (nameDisplayAs) carries a courtesy title for
// some MPs only ("Mrs Kemi Badenoch", "Ms Diane Abbott", "Mr David Lammy") while most have none, so names read
// unevenly side by side. displayMpName drops a leading "Mr ", "Mrs ", "Miss " or "Ms " and nothing else: "Dr", "Sir",
// "Dame", "Lord", "Lady" and every other part of the name stay exactly as Parliament writes them. Stored data is not
// changed; use this only where a name is shown, never where a name is matched against other records.
const COURTESY = /^(?:Mr|Mrs|Miss|Ms) /;

export function displayMpName(name: string): string;
export function displayMpName(name: string | null | undefined): string | null | undefined;
export function displayMpName(name: string | null | undefined): string | null | undefined {
  return typeof name === 'string' ? name.replace(COURTESY, '') : name;
}
