// The MP delivery record under the biography (owner approved the format, 8 Nov 2026, DR1): "Record in numbers", worked
// out with computePanel() and leaving out any figure we do not hold; the "Delivery record", grouped Delivered, then
// Committed and in development, then Not established; and the pledges. A server component: the page passes it into the
// biography section as a node. Each item is a stacked card at every width (owner, 8 Nov 2026, DR2): its title with the
// Local or National tag, then Stage, MP's role, Delivered by, Dates and Sources, each on its own line. More than 10
// items: the first 10, and the rest in a native <details>. On phones the numbers, each group and the pledges are each a
// sub-fold of the biography's fold (SubFold, as PF3), so no single open fold passes 10,000px; from 640px up they show
// as one panel, the groups under their headings and one list.
import {
  computePanel, displayGroups, itemDates, sourceLinkTexts, ATTRIBUTIONS, ATTRIBUTION_LABEL, STAGE_LABEL, SCOPE_LABEL,
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
  documented_contribution: 'a council or the delivering body credits the MP',
  campaign_claim: "claimed by the MP's own campaign, not by the delivering body",
  no_established_contribution: 'no role for the MP found in the sources',
};

const CSS = `
.dr-figs { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px 18px; margin: 0; padding: 0; list-style: none; }
.dr-figs li { padding: 8px 0; border-top: 1px solid rgba(20,16,13,0.25); font-size: 15px; line-height: 1.5; }
.dr-figs strong { display: block; font-size: 16px; }
.dr-group { margin: 18px 0 0; padding: 0 0 6px; font-size: 15px; text-transform: uppercase; letter-spacing: 0.08em; color: #7a1612; border-bottom: 1px solid rgba(20,16,13,0.4); }
.dr-cards { margin: 0; padding: 0; list-style: none; }
.dr-card { padding: 10px 0; border-bottom: 1px solid rgba(20,16,13,0.35); font-size: 15px; line-height: 1.5; overflow-wrap: break-word; }
.dr-card > div { margin: 2px 0 0; }
.dr-card .dr-what { margin: 0; font-size: 16px; }
.dr-card .dr-what > div { font-size: 15px; }
.dr-tag { display: inline-block; margin-left: 6px; padding: 0 6px; border: 1px solid #14100d; font-size: 15px; line-height: 1.4; white-space: nowrap; }
.dr-src { display: inline; margin: 0; padding: 0; list-style: none; }
.dr-src li { display: inline-block; margin: 0 14px 0 0; }
.dr-more > summary { cursor: pointer; display: flex; align-items: center; min-height: 44px; padding: 0 14px; margin: 12px 0; border: 1px solid #14100d; font-size: 15px; font-weight: bold; width: fit-content; }
.dr-pledges { margin: 0; padding: 0; list-style: none; }
.dr-pledges li { padding: 8px 0; border-bottom: 1px dotted rgba(20,16,13,0.3); font-size: 15px; line-height: 1.5; }
@media (max-width: 639.98px) {
  .dr-infold > .dr-group { display: none; }
  .dr-src a { display: inline-flex; align-items: center; min-height: 44px; }
  .dr-pledges a { display: inline-flex; align-items: center; min-height: 44px; }
}
`;

// Source link texts: the publisher, with the title's date, never two the same in one card (lib/delivery-record.ts
// sourceLinkTexts, DR3); the full title is the link's accessible name.

function Card({ item }: { item: DeliveryItem }) {
  const dates = itemDates(item);
  const texts = sourceLinkTexts(item.sources);
  return (
    <li className="dr-card">
      <div className="dr-what">
        <strong>{item.claim}</strong>
        <span className="dr-tag">{SCOPE_LABEL[item.scope]}</span>
        <div>{item.detail}</div>
      </div>
      <div><strong>Stage:</strong> {STAGE_LABEL[item.stage]}</div>
      {/* "No role established" stands alone: the role text after it would only repeat it (DR3). */}
      <div>
        <strong>MP&rsquo;s role:</strong>{' '}
        {item.attribution === 'no_established_contribution'
          ? <strong>{ATTRIBUTION_LABEL[item.attribution]}</strong>
          : <>{item.attribution && <strong>{ATTRIBUTION_LABEL[item.attribution]}. </strong>}{item.mp_role}</>}
      </div>
      <div><strong>Delivered by:</strong> {item.delivered_by}</div>
      {/* No dates known: no Dates line (DR3). */}
      {dates && <div><strong>Dates:</strong> {dates}</div>}
      <div>
        <strong>Sources:</strong>{' '}
        <ol className="dr-src">
          {item.sources.map((s, i) => (
            <li key={i}><a href={s.url} target="_blank" rel="noopener noreferrer" style={link} aria-label={s.title}>{texts[i]}</a></li>
          ))}
        </ol>
      </div>
    </li>
  );
}

// One or more groups as cards, each under its heading. In a phone sub-fold (inFold) the heading is the fold's summary, so
// the heading here is hidden under 640px.
function Cards({ groups, inFold = false }: { groups: Array<{ key: string; heading: string; items: DeliveryItem[] }>; inFold?: boolean }) {
  return (
    <>
      {groups.map((g) => (
        <div key={g.key} className={inFold ? 'dr-infold' : undefined}>
          <h4 className="dr-group">{g.heading}</h4>
          <ul className="dr-cards">
            {g.items.map((item, i) => <Card key={i} item={item} />)}
          </ul>
        </div>
      ))}
    </>
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

  // Items in display order; the first 10 shown, the rest in a fold, each part keeping its group headings.
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
          {/* Each group folds on its own on phones (its heading is then the fold's summary); from 640px up the groups show
              one after another under their headings. */}
          {first.map((g) => (
            <SubFold key={g.key} label={g.heading} summary={`${n0(g.items.length)} ${g.items.length === 1 ? 'item' : 'items'}`}>
              <Cards groups={[g]} inFold />
            </SubFold>
          ))}
          {restCount > 0 && (
            <details className="dr-more">
              <summary>Show {n0(restCount)} more</summary>
              <Cards groups={rest} />
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
                <a href={pl.source.url} target="_blank" rel="noopener noreferrer" style={link} aria-label={pl.source.title}>Source: {sourceLinkTexts([pl.source])[0]}</a>
              </li>
            ))}
          </ul>
        </SubFold>
      )}
    </section>
  );
}
