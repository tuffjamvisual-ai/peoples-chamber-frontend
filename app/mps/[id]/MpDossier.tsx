import Image from 'next/image';
import StandardsCasesLine from '../../components/StandardsCasesLine';
import Link from 'next/link';
import MagazineProfileSections from './MagazineProfileSections';
import OpenGovShell from '../../components/OpenGovShell';
import { phoneUpTo, wideFrom } from '@/lib/breakpoints';

import BackLink from '@/app/components/BackLink';
// Rubber-stamp distress texture (patchy ink), matching the OpenGovShell stamps.
const STAMP_DISTRESS = `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='340' height='150'><filter id='d'><feTurbulence type='fractalNoise' baseFrequency='0.55' numOctaves='2' seed='6' stitchTiles='stitch'/><feColorMatrix type='matrix' values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 -0.4 1.12'/></filter><rect width='100%' height='100%' filter='url(%23d)'/></svg>")`;

// MPs who have resigned their seat — renders a "Resigned" rubber stamp on the
// bottom-left of the profile photo. Add member_ids here as needed.
// Nigel Farage (5091) removed 17 Oct 2026: he resigned Clacton in July 2026 but won the by-election on
// 13 August 2026 and is a sitting MP again.
const RESIGNED_MEMBER_IDS = new Set<number>([4514]); // Sir Keir Starmer (Holborn and St Pancras, resigned 1 Sep 2026)

// An MP profile rendered into the shared dossier shell: the folder holds the MP's polaroid
// header + the full interactive profile sections. The newspaper masthead / folder frame all
// come from <DossierShell>.
//
// History note: a server-rendered "At a glance" fact strip lived between the
// polaroid header and the sections from 2026-06-04 to address the GSC Soft
// 404 signal on MPs without bios. Removed same evening (commit history holds
// the implementation) once the user confirmed every MP will have a bio
// shortly — the strip became redundant against ~500-word bio prose.

interface MpDossierProps {
  memberId: number;
  fullName: string;
  constituency: string | null;
  /** The seat's /constituencies page, for a current MP. */
  constituencySlug?: string | null;
  /** True when the MP has left the Commons (mps.current_member = false). The
      heading then reads "Former MP for X (2015–2026)" instead of "MP for X". */
  formerMember?: boolean;
  servedFromYear?: number | null;
  servedToYear?: number | null;
  partyDisplay: string | null;
  partyExpand: string; // value for the back-to-list ?expand= link
  partyColour: string;
  partyIsCoop: boolean;
  photoUrl: string | null;
  sections: React.ComponentProps<typeof MagazineProfileSections>;
  /** Optional footer slot rendered inside the dossier folder (e.g. RelatedLinks).
      Pages used to render this OUTSIDE the dossier — that worked fine when
      voting records were 999 items long because the folder always stretched
      past it. Now that votes paginate at 20/page the folder ends quickly and
      anything placed outside floated on the dossier shell's dark background. */
  footer?: React.ReactNode;
  /** Show Follow this MP in the sections sidebar (job 74): the real profile pages only, so the /landing-pca demo stays as it was. */
  followable?: boolean;
}

export default function MpDossier({
  memberId,
  fullName,
  constituency,
  constituencySlug,
  formerMember = false,
  servedFromYear = null,
  servedToYear = null,
  partyDisplay,
  partyExpand,
  partyColour,
  partyIsCoop,
  photoUrl,
  sections,
  footer,
  followable = false,
}: MpDossierProps) {
  const backHref = `/mps?expand=${encodeURIComponent(partyExpand)}#mps-list`;

  return (
    <OpenGovShell pageStamp="MP Profile">
      <style>{`
        /* Long strings (URLs/emails) wrap so they can't overflow the folder; the section
           nav is nudged down off the name text. Scoped to the MP sections only. */
        .pca-sections a, .pca-sections li { overflow-wrap: anywhere; }
        .pca-sections aside { margin-top: 48px; }

        /* Mobile (2026-06): the desktop profile uses zoom: 1.18 plus negative
           margins that push the photo off the right edge and the sidebar off the
           left. On phones, drop the zoom, stack the header (centred photo above
           the name) and pull the sidebar/photo back on-page. */
        @media ${phoneUpTo(760)} {
          .pca-sections { zoom: 1 !important; }
          /* The grid's -80px desktop nudge drags the stacked sidebar up into the
             header text on mobile; neutralise it so sections start cleanly below. */
          .mp-sections-grid { margin-top: 16px !important; }
          .pca-sections aside { margin-left: 0 !important; margin-top: 0; }
          .pca-mp-header { flex-direction: column !important; align-items: stretch !important; gap: 16px !important; }
          .pca-mp-photo { margin: 0 auto !important; transform: rotate(2deg) !important; }
          .pca-mp-photo img, .pca-mp-photo > div { width: 200px !important; height: 200px !important; }
          .pca-mp-photo .mp-resigned-stamp { width: auto !important; height: auto !important; font-size: 30px !important; bottom: -18px !important; }
          .pca-paperclip { display: none !important; }
          .pca-mp-bio { margin: 0 !important; }
        }
        /* Phones under 480px (owner, 3 Nov 2026): the photo, with its frame, at most 40 per cent of the screen height,
           so the name and party show on the first screen. */
        @media ${phoneUpTo(479)} {
          .pca-mp-photo img, .pca-mp-photo > div { width: min(180px, calc(30vh - 60px)) !important; height: min(180px, calc(30vh - 60px)) !important; }
          .pca-mp-header { margin-bottom: 12px !important; gap: 8px !important; }
        }
        /* Under 640px (owner, 4 Nov 2026): a small photo, then name, party and constituency, so the headline figures below
           show on the first screen. */
        @media ${phoneUpTo(767.98)} {
          .pca-mp-header { flex-direction: row !important; align-items: center !important; gap: 12px !important; margin-bottom: 12px !important; }
          .pca-mp-photo { margin: 0 !important; padding: 4px !important; transform: none !important; }
          .pca-mp-photo img, .pca-mp-photo > div { width: 72px !important; height: 72px !important; }
          .pca-mp-photo .mp-resigned-stamp { width: auto !important; height: auto !important; font-size: 15px !important; bottom: -6px !important; border-width: 2px !important; }
          .pca-mp-bio { display: flex; flex-direction: column; gap: 4px; flex: 1 1 0 !important; min-width: 0; margin: 0 !important; }
          .pca-mp-bio h1 { font-size: 24px !important; margin: 0 !important; }
          .pca-mp-party { order: 2; }
          .pca-mp-constituency { order: 3; margin: 0 !important; }
          .pca-mp-constituency a { display: inline-flex; align-items: center; min-height: 44px; }
        }
        /* Desktop (owner, 7 Nov 2026, PF3 and PF4): the profile sections are pulled up 80px over the space below the header,
           so the Standards cases line would sit under the Background heading and the tab list. It keeps its place in the
           page, so nothing else moves, and is drawn one line higher (56px, a 44px line and its 12px gap), into the free
           space under the party name. */
        @media ${wideFrom(761)} {
          .mp-standards-line { position: relative; top: -56px; }
        }
        /* T1-MPH (Cowork, 11 Nov 2026): from 768px up the Standards cases line is in the header's left column, under the
           party line; under 768px it stays below the header, as before. */
        .mp-std-head { display: none; }
        @media ${wideFrom(768)} {
          .mp-std-head { display: block; margin-top: 6px; }
          .mp-std-head .mp-standards-line { position: static; top: auto; margin: 0 !important; }
          .mp-std-page { display: none; }
        }
        /* T1-SIDE (owner approved, 12 Nov 2026): from 1024px a tighter header, so the first section's first lines start on
           the first screen at 1280 x 720 and 1024 x 768: the photo about a fifth smaller (208px, 16px higher than T1-MPH put
           it and still clear of the MP PROFILE stamp, its paperclip scaled with it) and smaller gaps between the name,
           constituency and party. */
        @media (min-width: 1024px) {
          .pca-mp-photo { padding: 10px 10px 30px 10px !important; margin-top: calc(-7% + 48px) !important; }
          .pca-mp-photo .pca-paperclip { width: 52px !important; height: auto !important; top: -24px !important; right: -4px !important; }
          .pca-mp-photo img:not(.pca-paperclip), .pca-mp-photo > div { width: 208px !important; height: 208px !important; }
          .pca-mp-header { margin-bottom: calc(1% + 46px) !important; }
          .pca-mp-bio { margin-top: 3% !important; }
          .pca-mp-bio h1 { margin: 0 0 2% !important; }
          .pca-mp-constituency { margin-bottom: 1.5% !important; }
        }
      `}</style>

      {/* "All MPs" above the header (UX1f, 9 Nov 2026): the list of MPs with this MP's party open. It was "← Back", which
          went back in the browser's history or, with no history (a link from elsewhere, JavaScript off), to this same
          list, so the label did not say where it led. The browser's own Back button still goes back. */}
      <BackLink fallbackHref={backHref} />

      {/* Header: polaroid (flat frame) + name / constituency / party */}
      <div className="pca-mp-header" style={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'flex-start', gap: '5%', marginBottom: '6%' }}>
        <div
          className="pca-mp-photo"
          style={{
            position: 'relative',
            flex: '0 0 auto',
            // 64px lower than before (T1-MPH, Cowork 11 Nov 2026), so the folder's MP PROFILE stamp covers none of the photo
            // from 768px up (it overlapped by 12px at 768 and 53px at 1280 and 1920). Phones set their own margin below.
            marginTop: 'calc(-7% + 64px)',
            marginRight: '-8%',
            background: '#ebe5d8',
            padding: '12px 12px 48px 12px',
            transform: 'rotate(12deg)',
            boxShadow: '0 4px 8px rgba(0,0,0,0.2), inset 0 0 30px rgba(0,0,0,0.03)',
            filter: 'contrast(1.05) brightness(0.98)',
          }}
        >
          {photoUrl ? (
            <Image
              src={photoUrl}
              alt={fullName}
              width={260}
              height={260}
              priority
              // The width it shows at (owner, 7 Nov 2026, Z2), so phones fetch a small copy: 72px under 640px, 200px to 760px,
              // 260px above (turned 12 degrees there, so it measures about 308px across). Keep in step with the media rules above.
              sizes="(max-width: 767.98px) 72px, (max-width: 760px) 200px, (min-width: 1024px) 208px, 260px"
              style={{ display: 'block', width: '260px', height: '260px', objectFit: 'cover', filter: 'contrast(1.1) sepia(0.05)' }}
            />
          ) : (
            <div aria-hidden style={{ width: '260px', height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#d6cdb8', color: '#14100d', fontSize: '64px', fontFamily: 'var(--font-special-elite), monospace' }}>
              {fullName.charAt(0) || '?'}
            </div>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="pca-paperclip" src="/paperclip.webp" loading="lazy" alt="" aria-hidden style={{ position: 'absolute', top: '-30px', right: '-5px', width: '65px', height: 'auto', transform: 'rotate(180deg)', transformOrigin: 'center', pointerEvents: 'none', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))' }} />
          {RESIGNED_MEMBER_IDS.has(memberId) && (
            <div
              className="mp-resigned-stamp"
              aria-label="Resigned"
              style={{
                position: 'absolute',
                bottom: '-22px',
                left: '0px',
                zIndex: 6,
                pointerEvents: 'none',
                transform: 'rotate(-9deg)',
                border: '4px solid #7a1612',
                borderRadius: '6px',
                padding: '2px 10px 0',
                color: '#7a1612',
                fontFamily: "var(--font-bebas), 'Bebas Neue', Impact, 'Arial Narrow', sans-serif",
                fontWeight: 400,
                fontSize: '40px',
                lineHeight: 1,
                letterSpacing: '0.09em',
                textTransform: 'uppercase',
                boxShadow: 'inset 0 0 8px rgba(122,22,18,0.3)',
                WebkitMaskImage: STAMP_DISTRESS,
                maskImage: STAMP_DISTRESS,
                WebkitMaskSize: 'cover',
                maskSize: 'cover',
              }}
            >
              Resigned
            </div>
          )}
        </div>
        <div className="pca-mp-bio" style={{ flex: '1 1 auto', marginTop: '6%', marginLeft: '-4%' }}>
          <h1 style={{ fontSize: 'clamp(22px, 3.4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', textShadow: '1px 1px 0 rgba(0,0,0,0.1)', lineHeight: 1.05, margin: '0 0 4%' }}>{fullName}</h1>
          {constituency && (
            <div className="pca-mp-constituency" style={{ fontSize: 'clamp(15px, 1.9vw, 25px)', marginBottom: '3%' }}>
              {formerMember
                ? `Former MP for ${constituency}${servedFromYear && servedToYear ? ` (${servedFromYear} to ${servedToYear})` : ''}`
                : constituencySlug
                  ? <>MP for <Link href={`/constituencies/${constituencySlug}`} prefetch={false} style={{ color: 'inherit', textDecoration: 'underline' }}>{constituency}</Link></>
                  : `MP for ${constituency}`}
            </div>
          )}
          {partyDisplay && (
            <div className="pca-mp-party" style={{ fontSize: 'clamp(15px, 1.9vw, 25px)' }}>
              <span style={{ display: 'inline-block', width: '0.7em', height: '0.7em', borderRadius: '50%', background: partyColour, marginRight: '0.4em', verticalAlign: 'middle' }} />
              {partyDisplay}
              {partyIsCoop && (
                <span style={{ fontSize: 'max(15px, 0.55em)', marginLeft: '0.5em', textTransform: 'uppercase', letterSpacing: '0.08em', verticalAlign: 'middle' }}>(Lab &amp; Co-op)</span>
              )}
            </div>
          )}
          <div className="mp-std-head"><StandardsCasesLine memberId={memberId} /></div>
        </div>
      </div>

      {/* Commissioner for Standards cases (owner, 7 Nov 2026, T1): one line, at every width, for a member with any. From
          768px up it is shown in the header instead (T1-MPH). */}
      <div className="mp-std-page"><StandardsCasesLine memberId={memberId} /></div>

      {/* Full interactive profile sections (scaled up via zoom to restore text size). */}
      <div className="pca-sections" style={{ zoom: 1.18 }}>
        <MagazineProfileSections {...sections} memberId={memberId} followable={followable} formerMember={formerMember} fullName={fullName} jsSticky stickyScale={1.18} compactExpenses />
      </div>

      {footer && <div style={{ marginTop: '48px' }}>{footer}</div>}

    </OpenGovShell>
  );
}
