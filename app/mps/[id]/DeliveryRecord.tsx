// The MP delivery record under the biography (owner approved the format, 8 Nov 2026, DR1): "Record in numbers", worked
// out with computePanel() and leaving out any figure we do not hold; the "Delivery record" table, grouped Delivered, then
// Committed and in development, then Not established; and the pledges. A server component: the page passes it into the
// biography section as a node. Desktop has an ordinary table; under 640px each row is a stacked card (CSS only, so it is
// the same with JavaScript off, and marked data-pt-table="keep" so the phone script leaves it alone). More than 10 rows:
// the first 10, and the rest in a native <details>. On phones the numbers, each group of the table and the pledges are
// each a sub-fold of the biography's fold (SubFold, as PF3), so no single open fold passes 10,000px; from 640px up they
// show as one panel, one table and one list.
import {
  computePanel, displayGroups, itemDates, ATTRIBUTIONS, ATTRIBUTION_LABEL, STAGE_LABEL, SCOPE_LABEL,
  type DeliveryRecord as Record_, type DeliveryItem, type ParliamentFigures, type DeliveryAttribution,
} from '@/lib/delivery-record';
import { SubFold } from '@/app/components/PhoneFolds';

const SHOWN = 10;
const n0 = (n: number) => n.toLocaleString('en-GB');
const h3: React.CSSProperties = { fontSize: '18px', fontWeight: 'bold', margin: '28px 0 12px', color: '#14100d', fontFamily: 'var(--font-special-elite), monospace' };
const link: React.CSSProperties = { color: '#7a1612', textDecoration: 'underline', textUnderlineOffset: '3px' };

// One line of description for each attribution figure.
const ATTRIBUTION_NOTE: Record<DeliveryAttribution, string> = {
  direct_responsibility: 'held by the MP as a minister',
  documented_contribution: 'the delivering body credits the MP',
  campaign_claim: "claimed by the MP's own campaign, not by the delivering body",
  no_established_contribution: 'no role for the MP found in the sources',
};

const CSS = `
.dr-figs { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px 18px; margin: 0; padding: 0; list-style: none; }
.dr-figs li { padding: 8px 0; border-top: 1px solid rgba(20,16,13,0.25); font-size: 15px; line-height: 1.5; }
.dr-figs strong { display: block; font-size: 16px; }
.dr-table { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 15px; line-height: 1.5; }
.dr-table th, .dr-table td { text-align: left; vertical-align: top; padding: 8px 4px; border-bottom: 1px dotted rgba(20,16,13,0.3); overflow-wrap: break-word; letter-spacing: -0.02em; }
.dr-table thead th { border-bottom: 2px solid #14100d; font-size: 15px; }
.dr-table .dr-group th { padding-top: 16px; font-size: 15px; text-transform: uppercase; letter-spacing: 0.08em; color: #7a1612; border-bottom: 1px solid rgba(20,16,13,0.4); }
.dr-tag { display: inline-block; margin-left: 6px; padding: 0 6px; border: 1px solid #14100d; font-size: 15px; line-height: 1.4; white-space: nowrap; }
.dr-src { margin: 0; padding: 0; list-style: none; }
.dr-src li { margin: 0 0 4px; }
.dr-more > summary { cursor: pointer; display: flex; align-items: center; min-height: 44px; padding: 0 14px; margin: 12px 0; border: 1px solid #14100d; font-size: 15px; font-weight: bold; width: fit-content; }
.dr-pledges { margin: 0; padding: 0; list-style: none; }
.dr-pledges li { padding: 8px 0; border-bottom: 1px dotted rgba(20,16,13,0.3); font-size: 15px; line-height: 1.5; }
@media (max-width: 639.98px) {
  .dr-table, .dr-table tbody, .dr-table tr, .dr-table td, .dr-table th { display: block; width: auto !important; }
  .dr-table thead, .dr-table colgroup { display: none; }
  .dr-table tr { padding: 10px 0; border-bottom: 1px solid rgba(20,16,13,0.35); }
  .dr-table td, .dr-table th { padding: 2px 0; border: 0; letter-spacing: normal; }
  .dr-table .dr-group th { padding-top: 14px; border: 0; }
  .dr-infold .dr-group { display: none; }
  .dr-table td[data-label]::before { content: attr(data-label) ": "; font-weight: bold; }
  .dr-table td.dr-what { font-size: 16px; }
  .dr-src li { display: inline-block; margin: 0 14px 0 0; }
  .dr-src a { display: inline-flex; align-items: center; min-height: 44px; }
  .dr-pledges a { display: inline-flex; align-items: center; min-height: 44px; }
}
`;

// "GOV.UK" from "GOV.UK: Emergency alert, 7 September 2025": the publisher, for a short link text; the full title is the
// link's accessible name.
const publisher = (title: string) => (title.includes(': ') ? title.slice(0, title.indexOf(': ')) : title);

function Row({ item }: { item: DeliveryItem }) {
  const dates = itemDates(item);
  return (
    <tr>
      <td className="dr-what">
        <strong>{item.claim}</strong>
        <span className="dr-tag">{SCOPE_LABEL[item.scope]}</span>
        <div>{item.detail}</div>
      </td>
      <td data-label="Stage">{STAGE_LABEL[item.stage]}</td>
      <td data-label="MP's role">
        {item.attribution && <strong>{ATTRIBUTION_LABEL[item.attribution]}. </strong>}
        {item.mp_role}
      </td>
      <td data-label="Delivered by">{item.delivered_by}</td>
      <td data-label="Dates">{dates || 'Not given'}</td>
      <td data-label="Sources">
        <ol className="dr-src">
          {item.sources.map((s, i) => (
            <li key={i}><a href={s.url} target="_blank" rel="noopener noreferrer" style={link} aria-label={s.title}>{publisher(s.title)}</a></li>
          ))}
        </ol>
      </td>
    </tr>
  );
}

function Table({ groups, head, inFold = false }: { groups: Array<{ key: string; heading: string; items: DeliveryItem[] }>; head: boolean; inFold?: boolean }) {
  return (
    <table className={`dr-table${inFold ? ' dr-infold' : ''}`} data-pt-table="keep">
      <colgroup>
        <col style={{ width: '22%' }} /><col style={{ width: '15%' }} /><col style={{ width: '22%' }} />
        <col style={{ width: '15%' }} /><col style={{ width: '13%' }} /><col style={{ width: '13%' }} />
      </colgroup>
      {head && (
        <thead>
          <tr><th scope="col">What</th><th scope="col">Stage</th><th scope="col">MP&rsquo;s role</th><th scope="col">Delivered by</th><th scope="col">Dates</th><th scope="col">Sources</th></tr>
        </thead>
      )}
      {groups.map((g) => (
        <tbody key={g.key}>
          <tr className="dr-group"><th colSpan={6} scope="colgroup">{g.heading}</th></tr>
          {g.items.map((item, i) => <Row key={i} item={item} />)}
        </tbody>
      ))}
    </table>
  );
}

export default function DeliveryRecord({ record, parliament }: { record: Record_; parliament: Partial<ParliamentFigures> }) {
  const p = computePanel(record, parliament);
  const roleItems = ATTRIBUTIONS.reduce((a, k) => a + p.attribution[k], 0);
  const figures: Array<{ label: string; value: number; note: string }> = [
    { label: 'Delivered and in use', value: p.delivered, note: `${n0(p.delivered_with_role)} with a recorded role for the MP, ${n0(p.delivered - p.delivered_with_role)} without` },
    { label: 'Committed or in development', value: p.in_development, note: `${n0(p.in_development_with_role)} with a recorded role for the MP, ${n0(p.in_development - p.in_development_with_role)} without` },
    ...(roleItems > 0 ? ATTRIBUTIONS.map((k) => ({ label: ATTRIBUTION_LABEL[k], value: p.attribution[k], note: ATTRIBUTION_NOTE[k] })) : []),
    { label: 'Pledges recorded', value: p.pledges, note: p.pledges === 1 ? 'listed below with its status' : 'listed below with their status' },
  ];
  if (p.bills_introduced !== null) figures.push({ label: 'Bills introduced', value: p.bills_introduced, note: p.bills_passed !== null ? `${n0(p.bills_passed)} became law, from Parliament's bill records` : "as sponsor, from Parliament's bill records" });
  else if (p.bills_passed !== null) figures.push({ label: 'Bills that became law', value: p.bills_passed, note: "from Parliament's bill records" });
  if (p.minister_written_answers !== null) figures.push({ label: 'Written answers as a minister', value: p.minister_written_answers, note: "answers to written questions, from Parliament's records" });
  if (p.minister_written_statements !== null) figures.push({ label: 'Written statements as a minister', value: p.minister_written_statements, note: "from Parliament's records" });

  // Rows in display order; the first 10 in the table, the rest in a fold, each part keeping its group headings.
  const groups = displayGroups(record);
  let left = SHOWN;
  const first: typeof groups = [], rest: typeof groups = [];
  for (const g of groups) {
    const take = g.items.slice(0, Math.max(0, left));
    left -= take.length;
    if (take.length) first.push({ ...g, items: take });
    if (g.items.length > take.length) rest.push({ ...g, items: g.items.slice(take.length) });
  }
  const restCount = rest.reduce((a, g) => a + g.items.length, 0);

  return (
    <section className="mp-delivery" aria-labelledby="mp-delivery-numbers" style={{ marginTop: '24px', color: '#14100d' }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <SubFold label="Record in numbers" summary={`${n0(p.delivered)} delivered, ${n0(p.in_development)} committed or in development`}>
        <h3 id="mp-delivery-numbers" style={h3}>Record in numbers</h3>
        <ul className="dr-figs">
          {figures.map((f) => (
            <li key={f.label}><strong>{f.label}: {n0(f.value)}</strong>{f.note}</li>
          ))}
        </ul>
        <p style={{ fontSize: '15px', margin: '10px 0 0' }}>These figures overlap and are not added together.</p>
      </SubFold>

      {groups.length > 0 && (
        <>
          <h3 style={h3}>Delivery record</h3>
          {/* Each group folds on its own on phones (its heading row is then the fold's summary); from 640px up the groups
              read as one table, with the column headings once. */}
          {first.map((g, gi) => (
            <SubFold key={g.key} label={g.heading} summary={`${n0(g.items.length)} ${g.items.length === 1 ? 'item' : 'items'}`}>
              <Table groups={[g]} head={gi === 0} inFold />
            </SubFold>
          ))}
          {restCount > 0 && (
            <details className="dr-more">
              <summary>Show {n0(restCount)} more</summary>
              <Table groups={rest} head={false} />
            </details>
          )}
        </>
      )}

      {record.pledges.length > 0 && (
        <SubFold label="Pledges" summary={`${n0(record.pledges.length)} ${record.pledges.length === 1 ? 'pledge' : 'pledges'}`}>
          <h3 style={h3}>Pledges</h3>
          <ul className="dr-pledges">
            {record.pledges.map((pl, i) => (
              <li key={i}>
                <strong>{pl.wording}</strong> ({pl.made}). {pl.status}.{' '}
                <a href={pl.source.url} target="_blank" rel="noopener noreferrer" style={link} aria-label={pl.source.title}>Source: {publisher(pl.source.title)}</a>
              </li>
            ))}
          </ul>
        </SubFold>
      )}
    </section>
  );
}
