// Companies House public API client, shared by scripts/sync-companies-house.js and
// scripts/fetch-companies-house-profiles.js (3 Nov 2026; moved here unchanged from sync-companies-house.js).
// Auth: HTTP Basic with the API key as the username and an empty password; the key comes from the caller (the
// COMPANIES_HOUSE_API_KEY env var) and is never logged. Rate limit: 600 requests / 5 minutes per key. On 429 it backs
// off 2, 4, 8, 16, 32 then 64 seconds; a 404 returns null ("no record"); a 401 or any other error throws.
const API_BASE = 'https://api.company-information.service.gov.uk';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function makeClient(apiKey, { log = console.warn } = {}) {
  if (!apiKey) throw new Error('COMPANIES_HOUSE_API_KEY is not set');
  const AUTH_HEADER = 'Basic ' + Buffer.from(apiKey + ':').toString('base64');
  return async function fetchCH(path) {
    for (let attempt = 0; attempt < 6; attempt++) {
      const res = await fetch(API_BASE + path, { headers: { Authorization: AUTH_HEADER, Accept: 'application/json' } });
      if (res.status === 429) {
        const wait = 2000 * Math.pow(2, attempt); // 2s, 4s, 8s, 16s, 32s, 64s
        log(`  CH rate limited, sleeping ${wait}ms`);
        await sleep(wait);
        continue;
      }
      if (res.status === 404) return null;
      if (res.status === 401) throw new Error('CH 401 — API key rejected');
      if (!res.ok) throw new Error(`CH HTTP ${res.status} on ${path}`);
      return res.json();
    }
    throw new Error('CH rate limit exceeded after 6 retries');
  };
}

module.exports = { API_BASE, makeClient, sleep };
