import ExpandingFolder from './ExpandingFolder';
import HotspotDropdown from './HotspotDropdown';

// The reusable "dossier" page shell: dark backdrop → People's Chamber newspaper masthead
// (image + %-positioned nav hotspots + weekly issue line) → an empty expanding manila
// folder. Drop any content into `children` and it renders inside the folder. Used by the
// MP profile pages (MpDossier) and any other page that wants this look.

// `children` is optional. When present, the hotspot becomes a dropdown
// trigger (via HotspotDropdown) instead of a plain link. The top-level
// href stays clickable as the canonical destination for that nav item;
// the dropdown is a hover/focus shortcut to specific sub-pages.
type SubItem = { label: string; href: string };
type Hotspot = {
  label: string;
  href: string;
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
  children?: SubItem[];
};
const HOTSPOTS: Hotspot[] = [
  // Top nav row — coordinates from ChatGPT hotspots.json (2026-06-03)
  // matched to the new landing101 masthead artwork. LAWS is gone, PARTIES
  // is new. PEOPLES POLLS href forced to /polls (the JSON came back with
  // /peoples-polls which doesn't exist as a route).
  { label: 'HOME', href: '/', xPct: 5.2, yPct: 21.3, wPct: 5.0, hPct: 2.8 },
  {
    label: 'BILLS',
    href: '/bills',
    xPct: 13.0, yPct: 21.3, wPct: 5.5, hPct: 2.8,
    children: [
      // Parliament processing routes. /laws is the Acts surface.
      // 'Departments' removed 2026-06-05 (its own top level masthead
      // tab makes the dropdown entry redundant).
      { label: 'All Bills',            href: '/bills' },
      { label: 'Acts of Parliament',   href: '/laws' },
    ],
  },
  {
    label: 'PEOPLES POLLS',
    href: '/polls',
    xPct: 20.5, yPct: 21.3, wPct: 12.0, hPct: 2.8,
    children: [
      // Polls + the two adjacent "what voters care about" surfaces
      // (tax pound, budget trade-offs). All thematic neighbours of
      // public-priority polling.
      { label: 'All Polls',            href: '/polls' },
      { label: 'Your Tax Pound',       href: '/your-tax-pound' },
      { label: 'Budget Trade-Offs',    href: '/budget-trade-offs' },
    ],
  },
  {
    label: 'PARTIES',
    href: '/parties',
    xPct: 35.0, yPct: 21.3, wPct: 7.0, hPct: 2.8,
    children: [
      // Manifesto Comparisons → comparison grid (/parties).
      // Individual party links → bio page (/parties/<slug>/bio), which
      // shows the People's Verdict critique without the 11-theme
      // manifesto grid (that's still at /parties/<slug>). 2026-06-03.
      // MP-count desc order, matches the vertical stack on /parties.
      { label: 'Manifesto Comparisons', href: '/parties' },
      { label: 'Labour',                href: '/parties/labour/bio' },
      { label: 'Conservative',          href: '/parties/conservative/bio' },
      { label: 'Liberal Democrats',     href: '/parties/liberal-democrats/bio' },
      { label: 'SNP',                   href: '/parties/snp/bio' },
      { label: 'Reform UK',             href: '/parties/reform-uk/bio' },
      { label: 'Sinn Féin',             href: '/parties/sinn-fein/bio' },
      { label: 'Green Party',           href: '/parties/green/bio' },
      { label: 'DUP',                   href: '/parties/dup/bio' },
      { label: 'Plaid Cymru',           href: '/parties/plaid-cymru/bio' },
      { label: 'SDLP',                  href: '/parties/sdlp/bio' },
      { label: 'Alliance',              href: '/parties/alliance/bio' },
      { label: 'UUP',                   href: '/parties/uup/bio' },
      { label: 'TUV',                   href: '/parties/tuv/bio' },
      { label: 'Restore Britain',       href: '/parties/restore-britain/bio' },
      { label: 'Your Party',            href: '/parties/your-party/bio' },
    ],
  },
  {
    label: 'MPS',
    href: '/mps',
    xPct: 44.5, yPct: 21.3, wPct: 4.5, hPct: 2.8,
    children: [
      // All MPs index + the two MP money pages that are linked from
      // the landing page bottom left card but had no masthead entry
      // until 2026-06-03. /expenses metadata title is 'Top Spenders';
      // /earnings is 'MP Earnings & Public Spend'.
      // Local Councils + Top Council Tax moved into TRANSPARENCY on
      // 2026-06-05 (they sit alongside the other government datasets).
      { label: 'All MPs',         href: '/mps' },
      { label: 'Top Spenders',    href: '/expenses' },
      { label: 'Earnings & Pay',  href: '/earnings' },
    ],
  },
  { label: 'DEPARTMENTS', href: '/departments', xPct: 51.0, yPct: 21.3, wPct: 11.5, hPct: 2.8 },
  {
    label: 'TRANSPARENCY',
    href: '/transparency',
    xPct: 64.5, yPct: 21.3, wPct: 12.5, hPct: 2.8,
    children: [
      // Hub + datasets from app/transparency/page.tsx.
      // 'lobbyists' removed 2026-06-02, 'companies' removed 2026-06-03.
      // 'MPs’ Second Jobs' added 2026-06-03 — Register of Members'
      // Financial Interests, full page at /second-jobs.
      // 'Press Releases' added 2026-06-04 — daily GOV.UK feed at
      // /transparency/press-releases, individual pages at /news/[slug].
      { label: 'All Datasets',          href: '/transparency' },
      { label: 'Editorials',            href: '/editorials' },
      { label: 'MPs’ Second Jobs',      href: '/second-jobs' },
      { label: 'Ministers’ Meetings',   href: '/transparency/ministers-meetings' },
      { label: 'APPGs',                 href: '/transparency/appgs' },
      { label: 'Ministers’ Hospitality', href: '/transparency/hospitality' },
      { label: 'Revolving Door',        href: '/transparency/revolving-door' },
      { label: 'Political Donations',   href: '/transparency/donations' },
      { label: 'Government Contracts',  href: '/transparency/contracts' },
      { label: 'Press Releases',        href: '/transparency/press-releases' },
      { label: 'Local Councils',        href: '/councils' },
      { label: 'Top Council Tax',       href: '/council-tax' },
    ],
  },
  { label: 'CONTACT', href: '/contact', xPct: 77.0, yPct: 21.3, wPct: 7.0, hPct: 2.8 },
  { label: 'LOGIN/SIGNUP', href: '/login', xPct: 86.0, yPct: 21.3, wPct: 10.0, hPct: 2.8 },
  { label: 'Top Content Area', href: '/bills', xPct: 6.0, yPct: 24.0, wPct: 88.0, hPct: 39.0 },
  { label: 'Bottom Left Area', href: '/mps', xPct: 6.0, yPct: 75.0, wPct: 27.0, hPct: 14.0 },
  { label: 'Bottom Centre Area', href: '/polls', xPct: 37.0, yPct: 75.0, wPct: 27.0, hPct: 14.0 },
  { label: 'Bottom Right Area', href: '/departments', xPct: 68.0, yPct: 75.0, wPct: 26.0, hPct: 14.0 },
  // Social media hotspots (X, Facebook, Instagram, YouTube, LinkedIn)
  // removed 2026-06-05. They pointed at the bare social-site homepages
  // (https://x.com etc.) rather than at real Peoples Chamber accounts,
  // so they were inactive placeholders that shipped on every page as
  // external outbound links. Restore here with proper account URLs when
  // the accounts exist.
  { label: 'SUPPORT US', href: '/support', xPct: 49.0, yPct: 95.5, wPct: 10.0, hPct: 3.0 },
  { label: 'ACCOUNT/INFO', href: '/login', xPct: 68.0, yPct: 95.5, wPct: 14.0, hPct: 3.0 },
];

// Weekly issue line. Anchor: Issue 23 = week beginning Fri 16 May 2025; Fri–Thu weeks.
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
function computeIssue(now: Date) {
  const ANCHOR = new Date(2025, 4, 16);
  const ANCHOR_ISSUE = 23;
  const WEEK_START_DOW = 5; // 0=Sun … 5=Fri
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const back = (today.getDay() - WEEK_START_DOW + 7) % 7;
  const start = new Date(today);
  start.setDate(today.getDate() - back);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const issue = ANCHOR_ISSUE + Math.round((start.getTime() - ANCHOR.getTime()) / 6048e5);
  const sm = MONTHS[start.getMonth()], em = MONTHS[end.getMonth()];
  const dateRange =
    start.getFullYear() !== end.getFullYear()
      ? `${sm} ${start.getDate()}, ${start.getFullYear()} - ${em} ${end.getDate()}, ${end.getFullYear()}`
      : start.getMonth() !== end.getMonth()
        ? `${sm} ${start.getDate()} - ${em} ${end.getDate()}, ${end.getFullYear()}`
        : `${sm} ${start.getDate()}-${end.getDate()}, ${end.getFullYear()}`;
  return { issue, dateRange };
}

// `children` = the folder contents. Omit it (e.g. the home page) to render just the
// newspaper front page with no folder.
export default function DossierShell({
  children,
  overlay,
}: {
  children?: React.ReactNode;
  overlay?: React.ReactNode;
}) {
  const { issue } = computeIssue(new Date());

  return (
    <>
      <style>{`
        /* Folder placement: centred horizontally on all screen sizes. Built from
           3 image slices (top/mid/bottom) so it stretches to any height. -114.2%
           top margin = -(1 - 0.24) * (1537/1023), overlaps the masthead at ~24%
           so the folder hugs the nav bar tightly.
           Horizontal: was 1.5% right / 3.5% left for an intentional off-centre
           bias toward the right side. User flagged the left whitespace as too
           heavy; centred to 2.5% each side on 2026-06-02. The folder is now
           visually balanced left and right at 95% width. */
        .pca-folder {
          position: relative;
          width: 95%;
          margin: -114.2% 1.5% 0 3.5%;
          transform: none;
          font-family: 'Special Elite', monospace;
          color: #14100d;
        }
        @media (max-width: 640px) {
          .pca-folder { width: 92%; margin-left: 4%; margin-right: 4%; }
        }
      `}</style>

      <div
        style={{
          minHeight: '100vh',
          margin: 0,
          backgroundColor: '#140d07',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '3vh 0 8vh',
        }}
      >
        {/* Folders-pile backdrop, pinned to the viewport. */}
        <div
          aria-hidden
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: '#140d07',
            backgroundImage: 'url(/bg-folders.webp)',
            backgroundSize: '150%',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            zIndex: 0,
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1, width: 'min(94vw, 1144px)' }}>
          {/* Newspaper (masthead + nav), fixed aspect; hotspots are %-based over it.
              container-type makes cqw units available to the overlay so its text
              scales WITH the newspaper image (no px floors overflowing on mobile). */}
          <div style={{ position: 'relative', width: '100%', aspectRatio: '1023 / 1537', containerType: 'inline-size' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/pca-art.webp"
              alt="opengovt"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'fill',
                userSelect: 'none',
                pointerEvents: 'none',
                filter: 'drop-shadow(0 18px 38px rgba(0,0,0,0.55))',
              }}
            />
            {HOTSPOTS.map((h) => {
              // Dropdown variant: hotspot becomes a hover/focus trigger
              // with a panel of sub-links. Top-level href stays clickable.
              if (h.children && h.children.length > 0) {
                return (
                  <HotspotDropdown
                    key={h.label}
                    href={h.href}
                    label={h.label}
                    xPct={h.xPct}
                    yPct={h.yPct}
                    wPct={h.wPct}
                    hPct={h.hPct}
                    children={h.children}
                  />
                );
              }
              const external = h.href.startsWith('http');
              return (
                <a
                  key={h.label}
                  href={h.href}
                  aria-label={h.label}
                  className="no-hover-scale"
                  {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  style={{
                    position: 'absolute',
                    left: `${h.xPct}%`,
                    top: `${h.yPct}%`,
                    width: `${h.wPct}%`,
                    height: `${h.hPct}%`,
                    display: 'block',
                    cursor: 'pointer',
                    borderRadius: 4,
                  }}
                />
              );
            })}

            {/* Live, weekly-updating issue line on the cleared top-left of the masthead. */}
            <div
              style={{
                position: 'absolute',
                left: '3%',
                top: '6.4%',
                width: '21%',
                textAlign: 'center',
                fontFamily: 'var(--font-abril), Georgia, serif',
                color: '#6b2417',
                lineHeight: 1.1,
                pointerEvents: 'none',
              }}
            >
              <div style={{ color: '#2b2722', fontSize: 'clamp(17px, 2.85vw, 41px)', letterSpacing: '0.01em' }}>
                ISSUE {issue}
              </div>
            </div>

            {/* Optional front-page content, %-positioned over the newspaper body
                (used by the home page; profiles cover this area with the folder). */}
            {overlay}
          </div>

          {children != null && (
          <ExpandingFolder defaultHeightCss="calc(min(94vw, 1144px) * 1.18)" className="pca-folder">
            {/* Folder image as 3 stacked layers: top piece, repeating middle, bottom piece. */}
            <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 0, display: 'flex', flexDirection: 'column' }}>
              <div style={{ width: '100%', aspectRatio: '1023 / 160', backgroundImage: 'url(/folder-top.webp)', backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat' }} />
              <div style={{ flex: '1 1 auto', backgroundImage: 'url(/folder-mid.webp)', backgroundRepeat: 'repeat-y', backgroundSize: '100% auto' }} />
              <div style={{ width: '100%', aspectRatio: '1023 / 157', backgroundImage: 'url(/folder-bottom.webp)', backgroundSize: '100% 100%', backgroundRepeat: 'no-repeat', marginTop: '-5%', WebkitMaskImage: 'linear-gradient(180deg, transparent 0%, #000 34%)', maskImage: 'linear-gradient(180deg, transparent 0%, #000 34%)' }} />
            </div>

            {/* Content slot — whatever the page puts in the folder.
                Overflow protection lives here so every page benefits:
                  overflowWrap/wordBreak  - long names, URLs, role titles
                                            wrap rather than crash into
                                            the folder edge.
                  minWidth: 0            - flex/grid children stop refusing
                                            to shrink below their content's
                                            intrinsic width.
                  maxWidth: 100%         - the wrapper itself cannot exceed
                                            its parent (defensive).
                The scoped <style> caps descendant images, tables, pre
                blocks, and absolutely-positioned children so even raw
                <img>/<table> dumped onto a page can't punch through the
                safe area. Replaces the per-page overflow patches that
                DepartmentClient previously carried alone. */}
            <div
              className="pca-folder-content"
              style={{
                position: 'relative',
                zIndex: 1,
                // Horizontal padding restored to 11% on 2026-06-03 after a
                // brief drop to 6% widened every page in the shell, not
                // just the parchment-wrapped ones. The parchment article
                // now achieves its extra width via negative horizontal
                // margins applied at the article level on the pages that
                // use it (parties, bills, budget-trade-offs, councils).
                padding: '10% 11% 6%',
                overflowWrap: 'anywhere',
                wordBreak: 'break-word',
                minWidth: 0,
                maxWidth: '100%',
              }}
            >
              <style>{`
                .pca-folder-content img,
                .pca-folder-content video,
                .pca-folder-content iframe { max-width: 100%; height: auto; }
                .pca-folder-content table { max-width: 100%; display: block; overflow-x: auto; }
                .pca-folder-content pre { max-width: 100%; overflow-x: auto; white-space: pre-wrap; }
              `}</style>
              {children}
            </div>
          </ExpandingFolder>
          )}
        </div>
      </div>
    </>
  );
}
