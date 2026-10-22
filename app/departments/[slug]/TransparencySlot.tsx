// Transparency tab on department pages (owner's decisions, 20 Oct 2026):
//   - "Freedom of Information": the latest quarter of the Cabinet Office's FOI statistics (lib/foi-statistics.ts):
//     requests received; answered within 20 working days "N of BASE (X%)" with the published percentage rounded;
//     permitted extensions and late replies; granted in full / partly withheld / fully withheld "N of RESOLVABLE"; the
//     change on the same quarter a year earlier in counts (a percentage only from a base of 20 or more); internal
//     reviews and complaints to the Information Commissioner for the calendar year, labelled as such.
//   - "Ministers' meetings": the latest return in ministers_meetings and any quarter with none (lib/ministers-meetings-status.ts).
import Link from 'next/link';
import { FOI_PAGE, foiSource, periodName, type DeptFoi } from '@/lib/foi-statistics';
import type { MeetingsStatus } from '@/lib/ministers-meetings-status';

const fmt = (n: number) => n.toLocaleString('en-GB');
const MIN_BASE_FOR_PCT = 20;
function change(cur: number | null, prev: number | null): string | null {
  if (cur == null || prev == null) return null;
  const d = cur - prev;
  if (d === 0) return 'the same';
  const pct = prev >= MIN_BASE_FOR_PCT ? ` (${d > 0 ? 'up' : 'down'} ${(Math.abs(d) / prev * 100).toFixed(1)}%)` : '';
  return `${fmt(Math.abs(d))} ${d > 0 ? 'more' : 'fewer'}${pct}`;
}
const of = (n: number | null, base: number | null) => (n == null || base == null ? null : `${fmt(n)} of ${fmt(base)}`);

const H3 = ({ children }: { children: React.ReactNode }) => (
  <h3 className="text-[#14100d] text-[15px] uppercase tracking-[0.2em] font-bold mb-3 mt-1">{children}</h3>
);
const P = ({ children, small }: { children: React.ReactNode; small?: boolean }) => (
  <p className={`text-[#14100d] ${small ? 'text-[14px] leading-[1.6]' : 'text-[16px] leading-[1.7]'} mb-3`}>{children}</p>
);

function FoiBody({ f, showLabel }: { f: DeptFoi; showLabel: boolean }) {
  const l = f.latest, e = f.yearEarlier, a = f.annual;
  const q = periodName(l.period);
  const changes = e && ([
    ['requests received', change(l.received, e.received)],
    ['answered within 20 working days', change(l.met_20_days, e.met_20_days)],
    ['late', change(l.late, e.late)],
    ['granted in full', change(l.granted_full, e.granted_full)],
    ['fully withheld', change(l.fully_withheld, e.fully_withheld)],
  ].filter(([, t]) => t) as [string, string][]);
  return (
    <div className="mb-5">
      {showLabel && <p className="text-[#14100d] text-[16px] font-bold mb-2">{f.label}</p>}
      <P>
        Requests received in {q}: <strong>{l.received != null ? fmt(l.received) : 'not published'}</strong>.
        {l.met_20_days != null && l.received_ex != null && (
          <> Answered within 20 working days: <strong>{of(l.met_20_days, l.received_ex)}</strong>
            {l.pct_met_20_days != null ? ` (${Math.round(l.pct_met_20_days)}%)` : ''}.</>
        )}
        {l.permitted_extension != null && <> With a permitted extension: {fmt(l.permitted_extension)}.</>}
        {l.late != null && <> Late: {fmt(l.late)}.</>}
      </P>
      {l.resolvable != null && (
        <P>
          Granted in full: <strong>{of(l.granted_full, l.resolvable)}</strong> resolvable requests; partly withheld:{' '}
          <strong>{of(l.partially_withheld, l.resolvable)}</strong>; fully withheld: <strong>{of(l.fully_withheld, l.resolvable)}</strong>.
        </P>
      )}
      {changes && changes.length > 0 && (
        <P>Change on {periodName(e!.period)}: {changes.map(([label, t]) => `${label} ${t}`).join('; ')}.</P>
      )}
      {a && (a.internal_reviews != null || a.ico_complaints != null) && (
        <P>
          {a.internal_reviews != null && (
            <>Internal reviews in {a.period}: <strong>{fmt(a.internal_reviews)}</strong>
              {a.ir_outcome_known && a.ir_upheld_full != null && a.ir_upheld_part != null && a.ir_overturned != null
                ? ` (${fmt(a.ir_outcome_known)} with an outcome: original decision upheld in full ${fmt(a.ir_upheld_full)}, upheld in part ${fmt(a.ir_upheld_part)}, overturned ${fmt(a.ir_overturned)})`
                : ''}.{' '}</>
          )}
          {a.ico_complaints != null && <>Complaints to the Information Commissioner in {a.period}: <strong>{fmt(a.ico_complaints)}</strong>.</>}
        </P>
      )}
    </div>
  );
}

export function TransparencySlot({ foi, meetings }: { foi: DeptFoi[]; meetings: MeetingsStatus[] }) {
  return (
    <section>
      {foi.length > 0 && (
        <>
          <H3>Freedom of Information</H3>
          {foi.map((f) => <FoiBody key={f.body} f={f} showLabel={foi.length > 1} />)}
          <P small>
            The 20 day figure is out of the requests received, leaving out any put on hold or lapsed; the percentage is the
            Cabinet Office&rsquo;s own, rounded. Resolvable requests are those not answered with advice alone or with
            &ldquo;information not held&rdquo;; any not granted or withheld had no response yet. Internal reviews and complaints to the
            Information Commissioner are published for whole years only.
          </P>
          <P small>
            <Link href={FOI_PAGE} className="underline">All 39 bodies in the statistics, {periodName(foi[0].latest.period)} →</Link>
          </P>
          <p className="text-[#14100d] text-[13px] leading-[1.6] mb-6 opacity-85">
            Source: <a href={foiSource(foi[0].latest).url} target="_blank" rel="noopener noreferrer" className="underline">{foiSource(foi[0].latest).label}</a>.
            Contains public sector information licensed under the Open Government Licence v3.0.
          </p>
        </>
      )}
      {meetings.length > 0 && (
        <>
          <H3>Ministers&rsquo; meetings</H3>
          {meetings.map((m, i) => (
            <div key={i} className="mb-3">
              {m.label && <p className="text-[#14100d] text-[16px] font-bold mb-1">{m.label}</p>}
              <P>
                {m.latestQuarter
                  ? <>Latest ministers&rsquo; meetings return: {m.latestQuarter}{m.publishedOn ? `, published ${m.publishedOn}` : ''}.
                      {m.gaps.map((g) => <span key={g.quarter}> {g.text}</span>)}</>
                  : <>No ministers&rsquo; meetings return found on GOV.UK for any quarter since January 2025.</>}
              </P>
            </div>
          ))}
          <p className="text-[#14100d] text-[13px] leading-[1.6] mb-2 opacity-85">
            Departments publish a quarterly return of ministers&rsquo; meetings with outside organisations on GOV.UK. A quarter
            is listed as missing once it ended more than three months ago; returns from January 2025 are checked.
          </p>
        </>
      )}
    </section>
  );
}
