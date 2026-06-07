// Editorial registry. Add new pieces here as ./<slug>.ts files exported
// as default, then list them below. The route at app/editorials/[slug]
// reads from this map.

import type { EditorialRegistry } from './types';
import tenWorstCouncils from './ten-worst-performing-councils-england';

export const editorials: EditorialRegistry = {
  [tenWorstCouncils.slug]: tenWorstCouncils,
};
