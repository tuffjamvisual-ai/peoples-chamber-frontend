// Headline aggregator with People's Chamber commentary.
//
// Fetches RSS from critical UK outlets, deduplicates against the
// uk_political_news table by source_url, and (for new items only)
// generates a 2-3 sentence wry commentary via Claude Haiku, grounded
// in the actual transparency-data context block built from our own
// tables. Stores headline + outlet + timestamp + commentary +
// outbound link to source.
//
// Usage:
//   node scripts/sync-political-news.js                  # fetch, generate, write
//   node scripts/sync-political-news.js --dry-run        # fetch, build the prompts, do NOT call Anthropic, do NOT write
//   node scripts/sync-political-news.js --limit=2        # cap items per source for cheap testing
//
// Required env: ANTHROPIC_API_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, DATABASE_URL.

require('dotenv').config({ path: '.env.local' })
const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')
const { createClient } = require('@supabase/supabase-js')

const DRY_RUN = process.argv.includes('--dry-run')
const LIMIT = (() => {
  const a = process.argv.find((a) => a.startsWith('--limit='))
  return a ? Math.max(1, parseInt(a.split('=')[1], 10) || 5) : 5
})()

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const DATABASE_URL = process.env.DATABASE_URL
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY

if (!SUPABASE_URL || !ANON_KEY) { console.error('Supabase env missing'); process.exit(1) }
if (!DATABASE_URL) { console.error('DATABASE_URL required (psql writes bypass anon RLS)'); process.exit(1) }
if (!DRY_RUN && !ANTHROPIC_API_KEY) { console.error('ANTHROPIC_API_KEY required for live mode (use --dry-run to skip)'); process.exit(1) }

const sb = createClient(SUPABASE_URL, ANON_KEY)

// Haiku 4.5 pricing (Nov 2025): $1.00 / 1M input tokens, $5.00 / 1M output tokens.
const HAIKU_MODEL = 'claude-haiku-4-5-20251001'
const PRICE_IN_PER_TOK  = 1.00 / 1_000_000
const PRICE_OUT_PER_TOK = 5.00 / 1_000_000

const SOURCES = [
  { outlet: 'The Guardian',    rss: 'https://www.theguardian.com/politics/rss' },
  { outlet: 'The Independent', rss: 'https://www.independent.co.uk/news/uk/politics/rss' },
]

const ALLOWED_RELATED_LINKS = new Set([
  '/transparency/contracts',
  '/transparency/donations',
  '/transparency/revolving-door',
  '/earnings',
  '/expenses',
  '/bills',
  '/mps',
])

// ─────────────────────────────────────────────────────────────────────────────
// RSS — small dependency-free parser. RSS 2.0 from these outlets is well-formed.
// ─────────────────────────────────────────────────────────────────────────────

const stripHtml  = (s) => s ? s.replace(/<[^>]+>/g, '').trim() : ''
const decode     = (s) => s ? s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&apos;/g,"'").replace(/&nbsp;/g,' ') : ''
const unwrapCdata = (s) => s ? s.replace(/^\s*<!\[CDATA\[/,'').replace(/\]\]>\s*$/,'') : ''
const tag = (item, name) => {
  const m = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i').exec(item)
  return m ? decode(stripHtml(unwrapCdata(m[1]))).trim() : ''
}

async function fetchRss(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'PeoplesChamber/1.0 (UK political transparency aggregator)', Accept: 'application/rss+xml,application/xml,text/xml,*/*' } })
  if (!res.ok) throw new Error(`RSS fetch ${res.status} ${url}`)
  return res.text()
}

function parseRss(xml) {
  const items = []
  const re = /<item>([\s\S]*?)<\/item>/g
  let m
  while ((m = re.exec(xml))) {
    const item = m[1]
    const link = tag(item, 'link') || tag(item, 'guid')
    const title = tag(item, 'title')
    const pubDate = tag(item, 'pubDate')
    const description = tag(item, 'description').slice(0, 500)
    if (link && title) items.push({ link, title, pubDate, description })
  }
  return items
}

// ─────────────────────────────────────────────────────────────────────────────
// Transparency context — pull a small, current snapshot from our own tables
// so Haiku can ground its commentary in real numbers, not invented ones.
// ─────────────────────────────────────────────────────────────────────────────

async function buildContextBlock() {
  // Over-fetch then dedupe — government_contracts has multiple rows per contract,
  // political_donations has many entries per donor; we want 5 distinct items each.
  const [
    { data: rawContracts },
    { data: rawDonations },
    { data: revolving },
    { data: outsideTop },
    { data: spendTop },
  ] = await Promise.all([
    sb.from('government_contracts').select('title, supplier, value').not('value','is',null).order('value', { ascending: false }).limit(50),
    sb.from('political_donations').select('donor_name, recipient_name, amount').not('amount','is',null).order('amount', { ascending: false }).limit(50),
    sb.from('revolving_door').select('person_name, previous_role, organisation').order('id', { ascending: false }).limit(5),
    sb.from('mp_outside_earnings_summary').select('member_id, total_extracted').order('total_extracted', { ascending: false }).limit(5),
    sb.from('mp_expenses_summary').select('member_id, total_spend').eq('year', '24_25').order('total_spend', { ascending: false }).limit(5),
  ])

  // Dedupe contracts on (supplier, title) keeping the highest value
  const contractsMap = new Map()
  for (const c of rawContracts || []) {
    const key = `${(c.supplier || '').trim().toLowerCase()}|${(c.title || '').trim().toLowerCase()}`
    const cur = contractsMap.get(key)
    if (!cur || Number(c.value) > Number(cur.value)) contractsMap.set(key, c)
  }
  const contracts = [...contractsMap.values()].sort((a, b) => Number(b.value) - Number(a.value)).slice(0, 5)

  // Dedupe donations on normalised donor name keeping their largest single donation
  const donationsMap = new Map()
  for (const d of rawDonations || []) {
    const key = (d.donor_name || '').trim().toLowerCase().replace(/^(mr|mrs|ms|sir|dr|lord|baroness|dame)\s+/, '')
    const cur = donationsMap.get(key)
    if (!cur || Number(d.amount) > Number(cur.amount)) donationsMap.set(key, d)
  }
  const donations = [...donationsMap.values()].sort((a, b) => Number(b.amount) - Number(a.amount)).slice(0, 5)

  const idsForOutsideAndSpend = [
    ...(outsideTop || []).map((r) => r.member_id),
    ...(spendTop || []).map((r) => r.member_id),
  ]
  const { data: mpsForLookup } = idsForOutsideAndSpend.length
    ? await sb.from('mps').select('member_id, display_name, party').in('member_id', idsForOutsideAndSpend)
    : { data: [] }
  const mpName = new Map((mpsForLookup || []).map((m) => [m.member_id, `${m.display_name} (${m.party || ''})`.trim()]))

  const fmt = (n) => '£' + Math.round(Number(n) || 0).toLocaleString('en-GB')

  const lines = []
  lines.push('TOP CONTRACTS BY VALUE (gov_contracts):')
  for (const c of contracts || []) lines.push(`  - ${fmt(c.value)} to ${c.supplier || 'undisclosed'} for ${c.title || 'untitled'}`)
  lines.push('TOP DECLARED DONATIONS BY AMOUNT (political_donations):')
  for (const d of donations || []) lines.push(`  - ${fmt(d.amount)} from ${d.donor_name} to ${d.recipient_name}`)
  lines.push('RECENT REVOLVING-DOOR MOVES (revolving_door):')
  for (const r of revolving || []) lines.push(`  - ${r.person_name} (${r.previous_role}) → ${r.organisation || 'private sector'}`)
  lines.push('TOP MP OUTSIDE EARNINGS, last 12mo (mp_outside_earnings_summary):')
  for (const r of outsideTop || []) lines.push(`  - ${mpName.get(r.member_id) || `member_id ${r.member_id}`}: ${fmt(r.total_extracted)}`)
  lines.push('TOP MP EXPENSES SPEND 2024-25 (mp_expenses_summary):')
  for (const r of spendTop || []) lines.push(`  - ${mpName.get(r.member_id) || `member_id ${r.member_id}`}: ${fmt(r.total_spend)}`)

  return lines.join('\n')
}

// ─────────────────────────────────────────────────────────────────────────────
// Commentary generation
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the editorial voice of "The People's Chamber", a UK political transparency project.

Your job: write a 2-3 sentence wry, dry, tongue-in-cheek commentary on a UK political news headline.

STRICT RULES:
- Use English understatement, raised eyebrows, knowing observations. NOT angry, NOT preachy, NOT shouting.
- If, and only if, ONE specific number or fact from the supplied transparency context is genuinely relevant to the headline, weave it in naturally.
- NEVER invent figures, names, or events. If no transparency fact is genuinely relevant, write generic wry commentary using only what's in the headline itself.
- 2-3 sentences maximum. Sharp.
- No accusations of crime or specific wrongdoing against named living individuals. Aim at the system / the institutional pattern, not the person's character.
- Optionally, suggest ONE related transparency page from this whitelist: /transparency/contracts, /transparency/donations, /transparency/revolving-door, /earnings, /expenses, /bills, /mps. Only if the link genuinely connects to your commentary.

OUTPUT: a single JSON object, no surrounding text.
Schema: { "commentary": string (2-3 sentences), "related_link": one of the whitelist values OR null }`

function buildUserPrompt({ outlet, title, description, context }) {
  return `HEADLINE: ${title}
PUBLISHER: ${outlet}
EXCERPT: ${description || '(none provided)'}

TRANSPARENCY CONTEXT (use ONLY if a specific fact below is genuinely relevant — never invent):
${context}

Respond with JSON only.`
}

async function callHaiku(systemPrompt, userPrompt) {
  const Anthropic = require('@anthropic-ai/sdk').default
  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY })
  const r = await client.messages.create({
    model: HAIKU_MODEL,
    max_tokens: 250,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })
  const text = r.content.find((b) => b.type === 'text')?.text || ''
  return { text, usage: r.usage }
}

function parseJsonFromHaiku(text) {
  // Defensive: model may wrap in ```json fences or add stray prose.
  const m = text.match(/\{[\s\S]*\}/)
  if (!m) return null
  try { return JSON.parse(m[0]) } catch { return null }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Mode: ${DRY_RUN ? 'DRY-RUN' : 'LIVE'}    Per-source limit: ${LIMIT}`)

  // 1. Fetch all RSS sources
  const candidates = []
  for (const src of SOURCES) {
    try {
      const xml = await fetchRss(src.rss)
      const items = parseRss(xml).slice(0, LIMIT)
      console.log(`  ${src.outlet}: ${items.length} candidate items`)
      for (const it of items) candidates.push({ outlet: src.outlet, ...it })
    } catch (e) {
      console.error(`  ${src.outlet}: RSS fetch failed: ${e.message}`)
    }
  }
  if (!candidates.length) { console.log('Nothing to do.'); return }

  // 2. Skip ones already in DB
  const urls = candidates.map((c) => c.link)
  const { data: existing } = await sb.from('uk_political_news').select('source_url').in('source_url', urls)
  const seen = new Set((existing || []).map((r) => r.source_url))
  const fresh = candidates.filter((c) => !seen.has(c.link))
  console.log(`  ${fresh.length} new of ${candidates.length} candidates`)
  if (!fresh.length) { console.log('Nothing new to process.'); return }

  // 3. Build the transparency context block once per run
  console.log('Building transparency context block from our tables...')
  const context = await buildContextBlock()
  if (DRY_RUN) {
    console.log('\n──── CONTEXT BLOCK ────')
    console.log(context)
    console.log('───────────────────────\n')
  }

  // 4. For each fresh story, build prompt + (live) call Haiku + collect
  const writes = []
  let totalIn = 0, totalOut = 0
  for (const c of fresh) {
    const userPrompt = buildUserPrompt({ outlet: c.outlet, title: c.title, description: c.description, context })

    if (DRY_RUN) {
      console.log(`\n────────────────────────────────────────`)
      console.log(`[${c.outlet}] ${c.title}`)
      console.log(`URL:  ${c.link}`)
      console.log(`Date: ${c.pubDate}`)
      console.log(`(dry-run: would call Haiku with the prompt above + system prompt; no API call made)`)
      continue
    }

    try {
      const { text, usage } = await callHaiku(SYSTEM_PROMPT, userPrompt)
      const parsed = parseJsonFromHaiku(text)
      const tokensIn = usage?.input_tokens || 0
      const tokensOut = usage?.output_tokens || 0
      totalIn += tokensIn
      totalOut += tokensOut

      const commentary = (parsed && typeof parsed.commentary === 'string') ? parsed.commentary.trim() : null
      let related = (parsed && typeof parsed.related_link === 'string') ? parsed.related_link.trim() : null
      if (related && !ALLOWED_RELATED_LINKS.has(related)) related = null
      const relatedLabel = related ? `See ${related.replace('/transparency/','').replace('/', '')}` : null

      writes.push({
        ...c,
        commentary,
        related,
        relatedLabel,
        tokensIn,
        tokensOut,
      })
      console.log(`  ✓ [${c.outlet}] ${c.title.slice(0, 60)}…  (${tokensIn}+${tokensOut} tokens)`)
    } catch (e) {
      console.error(`  ✗ [${c.outlet}] ${c.title.slice(0, 60)}…  ${e.message}`)
    }
  }

  // 5. Cost report
  const inCost = totalIn * PRICE_IN_PER_TOK
  const outCost = totalOut * PRICE_OUT_PER_TOK
  const totalCost = inCost + outCost
  console.log(`\nHaiku usage this run: ${totalIn} in + ${totalOut} out tokens`)
  console.log(`Cost: $${inCost.toFixed(4)} (in) + $${outCost.toFixed(4)} (out) = $${totalCost.toFixed(4)}`)
  if (writes.length) console.log(`Per-story average: $${(totalCost / writes.length).toFixed(5)}`)

  if (DRY_RUN || !writes.length) return

  // 6. Write to DB via psql (RLS bypass)
  const sqlPath = path.join(__dirname, '.sync-political-news.sql')
  const esc = (v) => v == null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`
  const lines = ['BEGIN;']
  for (const w of writes) {
    const pubAt = w.pubDate ? new Date(w.pubDate).toISOString() : null
    lines.push(
      `INSERT INTO uk_political_news (source_url, source_outlet, source_title, source_excerpt, published_at,
         commentary, commentary_model, commentary_tokens_in, commentary_tokens_out, related_link_href, related_link_label)
       VALUES (${esc(w.link)}, ${esc(w.outlet)}, ${esc(w.title)}, ${esc(w.description || null)}, ${pubAt ? esc(pubAt) : 'NULL'},
               ${esc(w.commentary)}, ${esc(HAIKU_MODEL)}, ${w.tokensIn}, ${w.tokensOut}, ${esc(w.related)}, ${esc(w.relatedLabel)})
       ON CONFLICT (source_url) DO NOTHING;`
    )
  }
  lines.push('COMMIT;')
  fs.writeFileSync(sqlPath, lines.join('\n') + '\n')
  execFileSync('psql', [DATABASE_URL, '-v', 'ON_ERROR_STOP=1', '-f', sqlPath], { stdio: 'inherit' })
  fs.unlinkSync(sqlPath)
  console.log('\nDone.')
}

main().catch((e) => { console.error(e); process.exit(1) })
