// Read every row of a filtered Supabase query (24 Oct 2026, report 36). The API returns at most 1,000 rows per call
// whatever a query asks for, so a single read, or a loop with a fixed cap, silently returns part of the data. readAll
// counts the rows exactly first, reads them page by page in a stable order (sorted by the given column(s), ending with
// a unique one so no row can appear on two pages or none), and throws if any page fails or if the rows read do not
// equal the count, so a page that uses it shows complete figures or keeps its last good version.
//
// Usage:
//   const rows = await readAll<Row>(() => supabase.from('mp_expenses_detail'), {
//     columns: 'id, claim_date, amount',
//     filter: (q) => q.eq('member_id', memberId),
//     orderBy: [{ column: 'claim_date', ascending: false }, { column: 'id' }],
//   });

// The Supabase query builders are deeply generic; this helper only chains select, filters, order and range on them.
/* eslint-disable @typescript-eslint/no-explicit-any */
type Builder = any;
type Order = { column: string; ascending?: boolean };
type PgError = { message?: string; code?: string; details?: string | null; hint?: string | null };

// A head (count only) request has no body, so its error can arrive with an empty message: use the code and details
// too, and the HTTP status, which is all a failed head request keeps (29 Oct 2026). Never the URL, headers or key.
function describe(e: PgError, status?: number, statusText?: string): string {
  const http = status ? `HTTP ${status}${statusText ? ` ${statusText}` : ''}` : '';
  return [e.message, e.code, e.details, e.hint, http].filter(Boolean).join(' | ') || 'unknown error';
}

export type ReadAllOptions = {
  columns: string;
  filter?: (q: Builder) => Builder;
  // The last column must be unique (usually id), so the order is total and paging is stable.
  orderBy: string | Order | Order[];
  pageSize?: number;   // 1,000, the API's most per call
  concurrency?: number; // pages read at once
  label?: string;       // for error messages
};

export async function readAll<T>(from: () => Builder, opts: ReadAllOptions): Promise<T[]> {
  const pageSize = opts.pageSize ?? 1000;
  const concurrency = opts.concurrency ?? 8;
  const label = opts.label ?? 'readAll';
  const filter = opts.filter ?? ((q: Builder) => q);
  const orders: Order[] = typeof opts.orderBy === 'string' ? [{ column: opts.orderBy }] : Array.isArray(opts.orderBy) ? opts.orderBy : [opts.orderBy];
  if (orders.length === 0) throw new Error(`${label}: orderBy is required`);

  const { count, error: countErr, status: countStatus, statusText: countStatusText } = await filter(from().select(opts.columns, { count: 'exact', head: true }));
  if (countErr) throw new Error(`${label} count: ${describe(countErr, countStatus, countStatusText)}`);
  const total = count ?? 0;
  const pages = Math.ceil(total / pageSize);

  const rows: T[] = [];
  for (let first = 0; first < pages; first += concurrency) {
    const batch = await Promise.all(
      Array.from({ length: Math.min(concurrency, pages - first) }, (_, k) => {
        let q = filter(from().select(opts.columns));
        for (const o of orders) q = q.order(o.column, { ascending: o.ascending ?? true });
        const start = (first + k) * pageSize;
        return q.range(start, start + pageSize - 1) as PromiseLike<{ data: T[] | null; error: PgError | null; status?: number; statusText?: string }>;
      }),
    );
    for (const { data, error, status, statusText } of batch) {
      if (error) throw new Error(`${label}: ${describe(error, status, statusText)}`);
      rows.push(...(data ?? []));
    }
  }
  if (rows.length !== total) throw new Error(`${label}: read ${rows.length} rows, expected ${total}`);
  return rows;
}

// The same, for exact matches on a text column whose stored values may carry leading or trailing spaces (donor names):
// PostgREST trims unquoted values in an in.(...) list, and supabase-js quotes only values with a comma or a bracket, so
// every value is quoted here. Use as filter: (q) => q.filter('donor_name', 'in', inList(names)).
export function inList(values: string[]): string {
  return `(${values.map((v) => `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`).join(',')})`;
}
