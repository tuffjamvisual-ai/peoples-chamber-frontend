import Link from 'next/link';
import { type DepartmentBudget, fmtBn, totalSpend } from '@/lib/department-budgets';

// Server-rendered department masthead — Secretary of State block + Budget
// panel — lifted out of DepartmentClient on 2026-06-04 so they sit above
// the descriptive content (dept.description label + Institutional
// Performance Report) rather than below it.
//
// Both blocks are pure display: photo + name + role + bio link, plus the
// budget envelope. No hooks, no state, no handlers — same lift pattern as
// the streetContext paragraphs earlier today. Means they also ship in the
// static HTML, which helps the per-department first-paint and the GSC
// indexable-content surface on smaller / no-budget departments.

const ACCENT = '#7a1612';

type SoS = {
  name: string;
  photo: string;
  role: string;
  url?: string;
  slug?: string;
  member_id?: number | null;
  resigned?: boolean;
};

interface Props {
  sos: SoS;
  budget: DepartmentBudget | null;
}

export default function DepartmentMasthead({ sos, budget }: Props) {
  return (
    <>
      {/* Department head — title shown under the name (sos.role), so no separate label. */}
      <section className=" pb-8 mb-8">
        <div className="flex flex-wrap items-center gap-8" style={{ minWidth: 0 }}>
          <div
            style={{
              position: 'relative',
              background: '#ebe5d8',
              padding: '12px 12px 48px 12px',
              width: '284px',
              transform: 'rotate(-2deg)',
              boxShadow: '0 4px 8px rgba(0,0,0,0.2), inset 0 0 30px rgba(0,0,0,0.03)',
              filter: 'contrast(1.05) brightness(0.98)',
              flexShrink: 0,
            }}
          >
            {sos.photo ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={sos.photo}
                alt={sos.name}
                style={{ display: 'block', width: '260px', height: '260px', objectFit: 'cover', filter: 'contrast(1.1) sepia(0.05)' }}
              />
            ) : (
              <div
                aria-hidden
                style={{
                  width: '260px',
                  height: '260px',
                  background: '#d6cdb8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '64px',
                  color: ACCENT,
                  fontFamily: 'Special Elite, monospace',
                }}
              >
                {sos.name.charAt(0)}
              </div>
            )}
            {sos.resigned && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src="/resigned-stamp.png"
                alt="Resigned"
                aria-hidden
                style={{
                  position: 'absolute',
                  bottom: '-80px',
                  right: '-40px',
                  width: '220px',
                  height: 'auto',
                  transform: 'rotate(-10deg)',
                  transformOrigin: 'center',
                  opacity: 0.9,
                  pointerEvents: 'none',
                  zIndex: 3,
                }}
              />
            )}
          </div>
          <div style={{ minWidth: 0, flex: '1 1 220px' }}>
            <h2 className="text-[#14100d] text-xl sm:text-2xl font-black tracking-tight mb-1" style={{ overflowWrap: 'anywhere' }}>{sos.name}</h2>
            <p className="text-[#14100d] text-[16px] leading-[1.7] mb-2" style={{ overflowWrap: 'anywhere' }}>{sos.role}</p>
            {sos.member_id ? (
              <Link
                href={`/mps/${sos.member_id}`}
                className="inline-block text-[14px] uppercase tracking-[0.2em] hover:underline font-semibold"
                style={{ color: ACCENT }}
              >
                View bio →
              </Link>
            ) : sos.slug ? (
              <Link
                href={`/people/${sos.slug}`}
                className="inline-block text-[14px] uppercase tracking-[0.2em] hover:underline font-semibold"
                style={{ color: ACCENT }}
              >
                View bio →
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {/* Budget panel — only renders when we have budget data for this slug. */}
      {budget && (
        <section
          aria-label="Department budget"
          className="mb-8"
          style={{
            padding: '4px 0 4px 18px',
            borderLeft: '4px solid #6b2417',
            maxWidth: '760px',
          }}
        >
          <div
            style={{
              fontFamily: 'Special Elite, monospace',
              fontSize: '13px',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              opacity: 0.6,
              marginBottom: '8px',
            }}
          >
            Budget · {budget.year}
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              gap: '18px',
              flexWrap: 'wrap',
              marginBottom: '10px',
            }}
          >
            <div
              style={{
                fontFamily: 'Special Elite, monospace',
                fontSize: '30px',
                fontWeight: 'bold',
                color: '#6b2417',
                lineHeight: 1,
              }}
            >
              {fmtBn(totalSpend(budget))}
            </div>
            <div
              style={{
                fontFamily: 'Special Elite, monospace',
                fontSize: '13px',
                opacity: 0.75,
              }}
            >
              Resource DEL {fmtBn(budget.resourceDel)} · Capital DEL {fmtBn(budget.capitalDel)}
              {budget.ame !== undefined && ` · AME ${fmtBn(budget.ame)}`}
            </div>
          </div>
          <p
            style={{
              fontFamily: 'Special Elite, monospace',
              fontSize: '15px',
              lineHeight: 1.65,
              color: '#14100d',
              margin: 0,
            }}
          >
            {budget.prose}
          </p>
        </section>
      )}
    </>
  );
}
