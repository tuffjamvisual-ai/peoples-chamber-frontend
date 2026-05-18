# The People's Chamber - Project Summary

## Overview
The People's Chamber is a UK government transparency platform providing real-time data on MPs, bills, expenses, departments, and political activity. The site uses a distinctive typewriter/newspaper magazine aesthetic with cream backgrounds and hand-drawn elements.

**Live URL:** https://www.thepeopleschamber.uk
**Repository:** github.com/tuffjamvisual-ai/peoples-chamber-frontend
**Working Directory:** ~/peoples-chamber-frontend
**Tech Stack:** Next.js 16.2.0, React, TypeScript, Supabase (PostgreSQL), Vercel deployment

---

## Design System

### Colors
- **Paper:** #f4e8d4 (main background)
- **Ink:** #14100d (primary text)
- **Accent Red:** #7a1612 (headlines, emphasis)
- **Aged Cream:** #ebe5d8 (cards, boxes)
- **Yellow:** #e5b92f (highlight boxes)
- **Deep Paper:** #2a1810 (magazine shell background with paper grain)

### Typography
**Current fonts (loaded via next/font/google in app/layout.tsx):**
- **Playfair Display** (400, 700) - Logo, secondary headlines
- **Anton** (400) - Main impact headlines
- **Oswald** (400, 600) - Navigation, buttons, labels
- **Special Elite** (self-hosted) - Body typewriter copy

**CSS Variables:**
- `--font-playfair` → Playfair Display
- `--font-anton` → Anton
- `--font-headline` → Anton
- `--font-oswald` → Oswald
- `--font-label` → Oswald
- `--font-typewriter` → Special Elite

**Font rollback tag available:** `pre-font-update` (commit 0ee78f7) - reverts to Raleway + Geist Mono if needed

### Visual Style
- Hand-drawn borders using SVG `feTurbulence` displacement filters
- Paper grain texture overlays on cards
- Slight rotation on boxes (-0.5deg to 0.5deg)
- Drop shadows for depth
- Polaroid-style photo frames (220×220px, -2.3deg rotation)

---

## Page Structure

### Magazine Template Pages (Converted)
15 pages use shared components: `MagazineNav.tsx` and `magazine-layout.css`

**✅ Completed:**
- `/` - Landing page (flat home.png with 30 hotspots - NOT magazine template yet)
- `/mps` - MP listing (party-grouped, 21 per page, alphabetical pagination)
- `/mps/[id]` - Individual MP profiles (8 conditional sidebar sections)
- `/departments` - Department listing with polaroid frames
- `/departments/[slug]` - Individual departments (all 24 prerendered)
- `/bills` - Bills listing
- `/laws` - Laws listing (20 per page pagination)
- `/expenses` - Top spenders with cream cards, party-color borders
- `/about` - About page
- `/people/[slug]` - Civil servants/peers (supports political_bio column)
- `/unite-kingdom` - Editorial article (2-column magazine layout with embedded photos)

**Pending:**
- `/polls` - Needs magazine template conversion
- Landing page (`/`) - Could be converted to magazine template with link cards

### Shared Components

**app/components/MagazineNav.tsx**
- 8-hotspot navigation overlay for painted chrome header
- Hotspot positions (final calibrated):
  - HOME: 7%, 6% width
  - BILLS: 18%, 6.5%
  - LAWS: 27%, 6.5%
  - PEOPLES POLLS: 37%, 15%
  - MPS: 55%, 5.5%
  - DEPARTMENTS: 63.5%, 16%
  - LOGIN: 82%, 6.5%
  - ABOUT: 90.5%, 6.5%

**app/components/magazine-layout.css**
- 21 lines — responsive padding utilities only
- `.magazine-content-spacing` - viewport-scaled padding (the only class defined here)
- Per-page styling lives inline in each page's TSX (cream/ink palette, hand-drawn borders, paper grain) rather than in this file

### Chrome Assets
**Header:** `public/preview-header.webp` (24KB, 1023×330px)
**Middle:** `public/preview-middle.webp` (41KB)
**Footer:** `public/preview-footer.webp` (32KB)

**Responsive padding formula:**
```css
.magazine-content-spacing {
  padding-top: min(400px, calc(32.3vw + 50px));
  padding-bottom: min(200px, calc(16vw + 25px));
  padding-left: clamp(16px, 7vw, 80px);
  padding-right: clamp(16px, 7vw, 80px);
}
```
Maintains 50px gap below painted header at all viewport widths (1086px → 375px).

---

## Database Architecture

### Supabase Configuration
- **Compute:** MICRO tier (2-core ARM, 1GB RAM, $9.68/month)
- **Region:** Washington DC (iad1) - cannot be changed
- **Connection:** Via `DATABASE_URL` in `.env.local`

### Key Tables

**mps**
- `member_id` (PK) - Parliament API ID
- `display_name` - Full name
- `party` - Political party
- `constituency` - Constituency name
- `current_member` - Boolean
- `political_bio` - Long-form editorial biography (AGO house style)
- Note: "Labour and Co-operative" merged into Labour section (403 total MPs)

**mp_biography**
- Links to `mps.member_id`
- Structured biographical data from Parliament API

**mp_registered_interests**
- `member_id`, `interest_id` (composite PK)
- `category_name` - Interest category (1-10)
- `interest_text` - Declaration text
- `created_when`, `last_amended_when`, `deleted_when`
- Daily sync keeps data current

**dept_ministers**
- `member_id` - Links to mps table
- `dept_slug` - Links to departments
- `ministerial_post` - Job title
- `resigned` - Boolean (triggers resigned stamp overlay)

**person_cache**
- Civil servants, peers, non-MP officials
- `political_bio` column for editorial content

**Indexes Added (performance optimization):**
```sql
CREATE INDEX CONCURRENTLY idx_dept_ministers_member_id ON dept_ministers(member_id);
CREATE INDEX CONCURRENTLY idx_dept_ministers_dept_slug ON dept_ministers(dept_slug);
CREATE INDEX CONCURRENTLY idx_dept_officials_dept_slug ON dept_officials(dept_slug);
CREATE INDEX CONCURRENTLY idx_dept_agencies_dept_slug ON dept_agencies(dept_slug);
CREATE INDEX CONCURRENTLY idx_mp_interests_member_slug ON mp_interests(member_slug);
```

**RLS Security:** 6 tables hardened (user, legislation, mp_interests, mp_votes, mp_questions, mp_expenses)

---

## Data Sync System

### Daily Cron Jobs (vercel.json)
All scheduled for 2am:

1. `/api/sync-registered-interests` - MP financial interests (NEW - May 2026)
2. `/api/sync-bill-stages` - Bill progress + current_stage/stage_date (FIXED - May 2026)
3. `/api/sync-agency-cache`
4. `/api/sync-department-contacts`
5. `/api/sync-govuk-data`
6. `/api/sync-ministers-hospitality`
7. `/api/sync-ministers-meetings`
8. `/api/sync-person-cache`
9. `/api/sync-press-releases`
10. `/api/sync-revolving-door`

**⚠️ Critical:** `SUPABASE_SERVICE_ROLE_KEY` must be set in Vercel environment variables for crons to work.

### Recent Fixes

**Registered Interests Sync (May 2026)**
- **Problem:** Table was frozen snapshot from March 22, 2026. No sync route existed.
- **Solution:** Created `/api/sync-registered-interests/route.ts`
- **Backfill:** 650/650 MPs processed, 3,358 interests, 594 MPs with data
- **Result:** 100% match with Parliament API, most recent amendment now 2026-05-08

**Bill Stages Sync Enhancement (May 2026)**
- **Problem:** Sync existed but never populated `current_stage` or `stage_date` columns
- **Solution:** Enhanced to derive current_stage from freshest dated stage in JSON
- **Backfill:** 3,889/3,889 bills updated

---

## Performance Optimizations

### Asset Optimization
- Template PNGs → WebP: 1014KB → 97KB (-91%)
- Fonts trimmed: saved 763KB
- Total page weight: 2.1MB → 330KB (-84%)
- Photo prewarming: `scripts/prewarm-mp-photos.js` (3,900 cache entries)

### Build Performance
- Selective prerendering: 20 cabinet ministers only (PM + Secretaries of State)
- Build time: 60-120s (failing) → 38s (passing)
- Heavy pages set to `force-dynamic`: /departments, /earnings, /expenses, /bills
- Total static pages: 124

### Query Optimization
- Parallelized MP profile queries into single `Promise.all`
- MP expenses trimmed: `.range(0,199)` → `.range(0,49)`
- ISR cache: 6h revalidation
- Cold SSR: 3.68s → 500-800ms

### Current Metrics
- Cabinet MPs: ~120ms (prerendered)
- Non-cabinet MPs (cold): 500-800ms, then instant for 6h
- Photo load: 68ms
- Departments: instant (prerendered)
- CPU: 20-30% (was 100% before indexes)

---

## Content & Editorial

### Writing Style (AGO House)
Sharp, satirical, fact-dense political analysis. Examples:

**Department Explainers:**
- Treasury: "Institutional 'no' machine"
- Home Office: "Permanent panic button"
- AGO: "Smoke alarm...deep fry constitutional principles"

**MP Biographies:**
Recently added/sharpened bios for:
- Wes Streeting, James Murray, Heidi Alexander, Andrew Pakes, Andrew Western, Andrew MacNae, Peter Kyle, Anneliese Dodds, Charlotte Cane, Dan Norris, Ellie Reeves, Andy Slaughter, Andy McDonald, Alex Easton, Blake Stephenson

**Editorial Content:**
- `/unite-kingdom` - 2-column magazine article about May 16, 2026 march (100,000+ attendees per Met Police FOI October 2025: 110,000–150,000)
- Sympathetic tone toward protesters' concerns
- Hand-drawn photo cards embedded in flowing text
- No footer, no sources line

### Bio Update Process
User handles via psql + base64 due to script bugs (anon key RLS blocks, column name mismatches)

---

## Scripts & Utilities

### Data Management
- `scripts/backfill-dept-minister-member-ids.js` - Ministerial salary matching
- `scripts/sync-outside-earnings.js` - MP earnings updates
- `scripts/remove-all-hyphens.js` - Typography cleanup
- `scripts/backfill-bill-stages.js` - Current stage population
- `scripts/clean-ai-tells-from-bills.js` - Remove em-dashes, smart quotes
- `scripts/add-critical-indexes.sql` - Database performance
- `scripts/fact-check-recent-bios.js` - Accuracy verification

### Photo Management
- `scripts/prewarm-mp-photos.js` - Cache 3,900 images
- `scripts/upload-mp-photo.js` - Photo uploads

### Backups
- `scripts/backups/` - Timestamped JSON snapshots

---

## Known Issues & Limitations

### Cannot Fix
- Vercel region stuck in Washington DC iad1 (manual selection removed)
- Script bugs for bio updates (user handles via psql)

### Design Decisions
- No boxes/borders on MP cards (per user request)
- All party sections collapsed by default on /mps
- Earnings tab for ALL 650 MPs (even £0)
- 6h cache balance
- 21 MPs per page pagination

### Pending Work

**High Priority:**
- Rewrite remaining 19 department explainers in AGO satirical style
- Magazine template for /polls page
- Consider converting landing page to magazine template with link cards

**Medium Priority:**
- Parliamentary career (representations) rendering
- Party history rendering
- Constituency office postal address display
- Fallback handling for missing department staff photos
- Server-side pagination for /transparency/[section]

**Low Priority:**
- Smart back-arrow (return to specific party on /mps)
- OAuth wiring on login (buttons styled but disabled)
- Forgot password flow
- GitHub Actions for photo prewarm automation
- Bundle analysis + split MPProfileClient.tsx if needed
- Clean up preview-2, 3, 4, 5 directories (~14MB unused assets)

---

## Link Card System (Landing Page Potential)

### Available Assets
**Location:** `public/link-cards/` (12 PNGs, ~2.7MB total)

**Cards:**
- hero_power.png (400×385)
- hero_illustration.png (560×385) - Westminster protest scene
- cover_story.png (460×305)
- street_view.png (250×305)
- bills_to_watch.png (250×420)
- follow_money.png (465×187)
- whos_who.png (380×150)
- poll_strip.png (835×82)
- see_all_bills_button.png (132×74)

**Grid Layout Pattern (if converting landing page):**
```javascript
// 12-column responsive grid
md:col-span-5 md:row-span-2  // Hero left
md:col-span-7 md:row-span-2  // Hero right
md:col-span-6                 // Regular cards
md:col-span-3 md:row-span-2  // Tall cards
md:col-span-9                 // Wide strip
```

---

## Deployment

### Vercel Configuration
- **Build Command:** `npm run build`
- **Output:** `.next/`
- **Environment Variables Required:**
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY` (for crons)
  - `DATABASE_URL` (for direct DB access)

### Build Process
1. `npm run build` - Generate static pages
2. Vercel deploys to production
3. Edge caching: 6h revalidation
4. Incremental Static Regeneration for dynamic pages

### Monitoring
- Build time: ~38s
- Deploy time: ~30s after push
- Check: https://www.thepeopleschamber.uk

---

## File Structure
```
app/
├── components/
│   ├── MagazineNav.tsx          # Shared 8-hotspot navigation
│   ├── magazine-layout.css      # 21 lines — responsive padding only
├── mps/
│   ├── [id]/
│   │   ├── page.tsx             # Server component
│   │   ├── MagazineProfileSections.tsx  # 8 sections
│   │   └── page.tsx.old-dark-theme      # Backup
│   └── MagazineMPsClient.tsx    # Party grouping, pagination
├── departments/[slug]/
│   ├── page.tsx                 # Prerendered all 24
│   └── DepartmentClient.tsx     # Ministers + explainer
├── bills/, laws/, expenses/, about/, people/[slug]/
│   └── page.tsx                 # Magazine template applied
├── unite-kingdom/
│   └── page.tsx                 # 2-column editorial with photos
└── page.tsx                     # Current landing (flat image + hotspots)

public/
├── preview-header.webp          # 24KB magazine chrome
├── preview-middle.webp          # 41KB
├── preview-footer.webp          # 32KB
├── resigned-stamp.png           # Minister overlay
├── link-cards/                  # 12 card images
└── home.png                     # 2.9MB current landing page

scripts/
├── backfills/                   # Data population scripts
├── prewarm-mp-photos.js         # Cache warmup
└── backups/                     # JSON snapshots
```

---

## Git & Version Control

### Important Commits
- `0ee78f7` - Pre-font-update backup tag (Raleway/Geist Mono)
- `89c07e7` - Magazine navigation component extraction
- `fc333bb` - Magazine shell revert
- `45d1259` - Link card landing (reverted)

### Rollback Commands
**Font system:**
```bash
git reset --hard pre-font-update && git push --force-with-lease origin main
```

**Magazine shell landing:**
Already reverted, preserved at `app/page.tsx.old-current-landing`

---

## User Preferences & Communication

### Writing Approach
- Never make assumptions, always verify
- No apologies for errors - just fixes
- No code changes without approval
- No summaries unless requested
- Never question decisions
- Sessions end only when user says
- No shortcuts, no compromises
- Proactive not reactive
- Extremely concise responses

### Bio Writing Style
- Sharp, satirical AGO house style
- Fact-dense, no fluff
- Critical but fair
- 5-8 paragraphs typical
- No bullet points in bios
- Always sharpen before finalizing

---

## Next Session Checklist

**When starting new session:**
1. Check dev server status: `lsof -i :3000`
2. Verify database connection: `echo $DATABASE_URL`
3. Check for uncommitted changes: `git status`
4. Review any pending PRs or issues
5. Check Vercel deployment status

**Common Tasks:**
- MP bios: Write → sharpen → save to `/tmp/[name]-bio.txt` → user adds via psql
- Magazine conversions: Read SKILL.md → backup old → apply template → test → commit
- Data fixes: Identify issue → write script → test on dev → backfill → verify

**Key Locations:**
- Working dir: `~/peoples-chamber-frontend`
- Database: Via `$DATABASE_URL`
- Live site: https://www.thepeopleschamber.uk
- Dev server: http://localhost:3000

---

## Recent Accomplishments (May 2026)

✅ Magazine template applied to 10+ pages
✅ Registered interests sync fixed (3,358 interests, 100% accurate)
✅ Bill stages sync enhanced
✅ Font system updated (Playfair/Anton/Oswald)
✅ Responsive padding fixed (50px gap maintained across viewports)
✅ Database indexed (5 critical indexes, CPU 100% → 20-30%)
✅ Performance optimized (2.1MB → 330KB, 84% reduction)
✅ Navigation hotspots calibrated
✅ 15+ MP bios written in AGO style
✅ Unite the Kingdom editorial created (2-column magazine layout)
✅ Service role key configured for crons

**The platform is production-ready with magazine aesthetic, accurate data sync, and strong performance.**

---

End of summary. This document provides complete context for continuing The People's Chamber project.
