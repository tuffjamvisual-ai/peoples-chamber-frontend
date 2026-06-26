import Image from 'next/image';
import MagazineProfileSections from './MagazineProfileSections';
import OpenGovShell from '../../components/OpenGovShell';
import BackLink from '../../components/BackLink';
import ScrollToTopButton from '../../components/ScrollToTopButton';

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
}

export default function MpDossier({
  memberId,
  fullName,
  constituency,
  partyDisplay,
  partyExpand,
  partyColour,
  partyIsCoop,
  photoUrl,
  sections,
  footer,
}: MpDossierProps) {
  const backHref = `/mps?expand=${encodeURIComponent(partyExpand)}#mps-list`;

  return (
    <OpenGovShell pageStamp="MP Profile">
      <style>{`
        /* Long strings (URLs/emails) wrap so they can't overflow the folder; the section
           nav is nudged down off the name text. Scoped to the MP sections only. */
        .pca-sections a, .pca-sections li { overflow-wrap: anywhere; }
        .pca-sections aside { margin-top: 48px; }
      `}</style>

      {/* Back-to-party link above the header. Uses the shared BackLink
          client component so it honours browser history (router.back())
          and only falls through to the /mps?expand=<party> destination
          if the user landed here directly. Previously this was a plain
          <a> that always dumped the user on /mps regardless of where
          they came from. */}
      <BackLink
        fallbackHref={backHref}
        label="← Back"
        className="no-hover-scale"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '-6%', marginBottom: '12px', color: '#14100d', textDecoration: 'none', fontSize: 'clamp(18px, 2.2vw, 28px)', transform: 'rotate(-0.2deg)' }}
      />

      {/* Header: polaroid (flat frame) + name / constituency / party */}
      <div style={{ display: 'flex', flexDirection: 'row-reverse', alignItems: 'flex-start', gap: '5%', marginBottom: '6%' }}>
        <div
          style={{
            position: 'relative',
            flex: '0 0 auto',
            marginTop: '-7%',
            marginRight: '-10%',
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
              sizes="260px"
              style={{ display: 'block', width: '260px', height: '260px', objectFit: 'cover', filter: 'contrast(1.1) sepia(0.05)' }}
            />
          ) : (
            <div aria-hidden style={{ width: '260px', height: '260px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#d6cdb8', color: '#14100d', fontSize: '64px', fontFamily: 'Special Elite, monospace' }}>
              {fullName.charAt(0) || '?'}
            </div>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/paperclip.webp" alt="" aria-hidden style={{ position: 'absolute', top: '-30px', right: '-5px', width: '65px', height: 'auto', transform: 'rotate(180deg)', transformOrigin: 'center', pointerEvents: 'none', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.35))' }} />
        </div>
        <div style={{ flex: '1 1 auto', marginTop: '6%', marginLeft: '-4%' }}>
          <div style={{ fontSize: 'clamp(22px, 3.4vw, 46px)', fontWeight: 'bold', letterSpacing: '-0.02em', textShadow: '1px 1px 0 rgba(0,0,0,0.1)', lineHeight: 1.05, marginBottom: '4%' }}>{fullName}</div>
          {constituency && (
            <div style={{ fontSize: 'clamp(13px, 1.9vw, 25px)', marginBottom: '3%' }}>MP for {constituency}</div>
          )}
          {partyDisplay && (
            <div style={{ fontSize: 'clamp(13px, 1.9vw, 25px)' }}>
              <span style={{ display: 'inline-block', width: '0.7em', height: '0.7em', borderRadius: '50%', background: partyColour, marginRight: '0.4em', verticalAlign: 'middle' }} />
              {partyDisplay}
              {partyIsCoop && (
                <span style={{ fontSize: '0.55em', marginLeft: '0.5em', opacity: 0.7, textTransform: 'uppercase', letterSpacing: '0.08em', verticalAlign: 'middle' }}>(Lab &amp; Co-op)</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Full interactive profile sections (scaled up via zoom to restore text size). */}
      <div className="pca-sections" style={{ zoom: 1.18 }}>
        <MagazineProfileSections {...sections} memberId={memberId} jsSticky stickyScale={1.18} compactExpenses />
      </div>

      {footer && <div style={{ marginTop: '48px' }}>{footer}</div>}

      <ScrollToTopButton />
    </DossierShell>
  );
}
