// Polite fetching for the Parliament API scripts: robots.txt is read first for each host (a 404 means no rules),
// one request at a time with a pause after each (1 second by default), and a redirect is only followed after its
// target has been checked against robots.txt too. --cache=dir in the calling script keeps every response so a
// re-run (for example the write after a dry run) makes no new requests.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const UA = 'opengovt.uk-bills/1.0 (https://opengovt.uk; UK Parliament bill data; one request a second)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function makePoliteFetch({ cacheDir = null, delayMs = 1000, log = (m) => console.error(m) } = {}) {
  const robots = new Map();
  let requests = 0;
  if (cacheDir) fs.mkdirSync(cacheDir, { recursive: true });

  async function allowed(url) {
    const u = new URL(url);
    if (!robots.has(u.host)) {
      const r = await fetch(`${u.protocol}//${u.host}/robots.txt`, { headers: { 'User-Agent': UA }, redirect: 'manual' });
      const text = r.ok ? await r.text() : r.status === 404 ? '' : 'User-agent: *\nDisallow: /';
      let star = false; const rules = [];
      for (const line of text.split(/\r?\n/)) {
        const m = line.replace(/#.*/, '').trim().match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
        if (!m) continue;
        const k = m[1].toLowerCase(); const v = m[2].trim();
        if (k === 'user-agent') star = v === '*';
        else if (star && (k === 'disallow' || k === 'allow') && v) rules.push({ allow: k === 'allow', path: v });
      }
      robots.set(u.host, rules);
      log(`robots.txt ${u.host}: HTTP ${r.status}, ${rules.length} rules for *`);
      await sleep(delayMs);
    }
    const p = u.pathname + u.search;
    let best = { len: -1, allow: true };
    for (const rule of robots.get(u.host)) {
      const re = new RegExp('^' + rule.path.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\\\$$/, '$'));
      if (re.test(p) && rule.path.length > best.len) best = { len: rule.path.length, allow: rule.allow };
    }
    return best.allow;
  }

  // Returns { status, json } (json null unless status 200). Throws on robots refusal or network failure.
  async function getJson(url, hops = 3) {
    const file = cacheDir ? path.join(cacheDir, crypto.createHash('sha1').update(url).digest('hex') + '.json') : null;
    if (file && fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!(await allowed(url))) throw new Error(`robots.txt disallows ${url}`);
    const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, redirect: 'manual', signal: AbortSignal.timeout(60000) });
    requests++;
    await sleep(delayMs);
    if ([301, 302, 303, 307, 308].includes(r.status) && hops) return getJson(new URL(r.headers.get('location'), url).href, hops - 1);
    const out = { status: r.status, json: r.status === 200 ? await r.json() : null };
    if (file && (out.status === 200 || out.status === 404)) fs.writeFileSync(file, JSON.stringify(out));
    return out;
  }

  // Raw bytes (for CSV files): same robots check, pause and redirect handling; not cached.
  async function getBytes(url, hops = 3) {
    if (!(await allowed(url))) throw new Error(`robots.txt disallows ${url}`);
    const r = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'manual', signal: AbortSignal.timeout(120000) });
    requests++;
    await sleep(delayMs);
    if ([301, 302, 303, 307, 308].includes(r.status) && hops) return getBytes(new URL(r.headers.get('location'), url).href, hops - 1);
    return { status: r.status, bytes: r.status === 200 ? Buffer.from(await r.arrayBuffer()) : null };
  }

  return { getJson, getBytes, requestCount: () => requests };
}

module.exports = { makePoliteFetch, UA };
