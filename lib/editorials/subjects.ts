// Subject groups for "Read next" at the foot of each investigation and briefing (audit
// reassessment, 16 Oct 2026: the housing-finance piece was recommending NHS estates, waste
// crime and pensions because most pieces carry no topic tag and the panel fell back to the
// newest). Assigned by hand from each piece's subject; a piece can sit in more than one group.
// A piece left out of every group gets no subject matches, and its panel says "Latest
// investigations" rather than implying relevance.
//
// When you publish a new piece, add its slug to every group it belongs to.

export const SUBJECTS: Record<string, string[]> = {
  'Housing and planning': [
    'bm4k9mxw7r', 'nq7x4km2wp', 'rs8k4mxw9n', 'wk4n9mxw7r', 'qm4n9mxw7r',
  ],
  'Councils and local government': [
    'awsucrmvr1', 'ck8m2wq7x3', 'cq4r8vn2mp', 'ew4k9mxn7r', 'ten-worst-performing-councils-england',
    'td4k9mxw7r', 'qm4n9mxw7r',
  ],
  'Courts, prisons and policing': [
    'cr4k9mxw7r', 'em7k4mxw9n', 'jx4m9wk2q7', 'px4n9mxw7r', 'pn8k4qxw2r', 'pk9v2mrx4t',
    'hx7n4qw2mk', 'obd5xiiexy', 'fr9k2mxw7q', 'bg9k4mxw2q', 'xm7co0hssx', 'pb4k9mxw7r',
    'ia4k9mxw7r', 'hn4k9mxw7r',
  ],
  'Defence and security': [
    'dn4p8rk2wq', 'k3p9w7nx2d', 'mf7k3qxw9n', 'p9k4w2rx7m', 'q4m8k2xw7n', 'w7q2m9rk5t',
    'mi5k7qxw9n',
  ],
  'Health and care': [
    'nh4k9mxw7r', 'rc8m4kqx7n', 'hx4m2kq9w7', 'kv4n9mxw7r',
  ],
  'Children and families': [
    'pc7m3wq9k2', 'xm7co0hssx', 'x7m3k9wq2n', 'hl7k2mx9w4',
  ],
  'Immigration and asylum': [
    'as6k2mwx9q', 'k9m4qxw7n2', 'q4m8k2xw7n', 'r4n8k2wq7m',
  ],
  'Environment, water and energy': [
    'dw4k9mxw7r', 'pf7k3mxw9q', 'xf4k9mxw7r', 'hw9k4mxq2t', 'gw4k9mxn7r', 'vb8k4mxn9r',
    'tn4k7mxw9r', 'mk4n9mxw7r', 'vt6k9mxw3n',
  ],
  'Industry, trade and technology': [
    'vk4n9mxw7r', 'vq8k3mxw7n', 'tk4n9mxw7r', 'd8m4xpq2vt', 'mk4n9mxw7r', 'tq6m4kx9w2',
    'tn4k7mxw9r', 'ms9k4qxw7n', 'm2v9k7qx4r',
  ],
  'Transport': [
    'gx4k9mxw7r', 'k3p9w7nx2d',
  ],
  'Public money and tax': [
    'se9k4m2xq7', 'whr8acs2gf', 'm7k4qxw9n2', 'vt6k9mxw3n', 'pk9v2mrx4t', 'st6k9mxq4w',
    'skq4m9xw2t', 'p9k4w2rx7m', 'vq8k3mxw7n', 'ew4k9mxn7r',
  ],
  'The Labour leadership': [
    '6vui3xxze9', 'bk7m3wq9x2', 'bn6k4qxw27', 'andy-burnham-the-record-behind-the-reputation',
    'rm9x2qk7v4', 'vt6k9mxw3n', 'rs8k4mxw9n', 'w7q2m9rk5t', 'm7k4qxw9n2',
  ],
  'Standards and accountability': [
    'ag7k4mxq9w', 'britains-most-disgraced-politicians', 'kxlkhj1jgj', 'the-revolving-door',
    'power-for-sale-20-politicians-who-cashed-in', 'when-did-politicians-stop-taking-responsibility',
    'v3n8q2xk6w', 'mn8k4qxw7v', 'rk9m4qxw7d', 'dk9m2xq7w4', 'kp7m2xqv9d', 'siicjkcsr6',
    'qn4k9mxw7r', 'rm4n9mxw7r',
  ],
  'Money in politics': [
    'p4w9k2xr7n', 'hb9k2xq7mw', 'q7m3k9xw2r', 'v3n8q2xk6w', 'zt7m4kq9xw', 'power-for-sale-20-politicians-who-cashed-in',
  ],
  'Online safety, data and surveillance': [
    'kn4r9mxw7q', 'wq7m4kx2np', 'fr9k2mxw7q', 'obd5xiiexy', 'tq6m4kx9w2',
  ],
};

/** The subject groups a piece belongs to. */
export function subjectsOf(slug: string): string[] {
  return Object.entries(SUBJECTS).filter(([, slugs]) => slugs.includes(slug)).map(([name]) => name);
}
