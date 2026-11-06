// Dates with a short month, the same on the server and in every browser. Safari writes September as "Sep" where Node and Chrome write "Sept", and a Safari
// reader's page then fails to hydrate (React error #418, /mps/206, 6 Nov 2026). The wording stays as the server has always written it.
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', day: 'numeric', month: 'numeric', year: 'numeric' });

function read(v: string | Date) {
  const got = Object.fromEntries(parts.formatToParts(new Date(v)).map((p) => [p.type, p.value]));
  return { day: Number(got.day), month: MONTHS[Number(got.month) - 1], year: got.year };
}
export const shortMonthYear = (v: string | Date) => { const d = read(v); return `${d.month} ${d.year}`; };
export const shortDayMonthYear = (v: string | Date) => { const d = read(v); return `${d.day} ${d.month} ${d.year}`; };
