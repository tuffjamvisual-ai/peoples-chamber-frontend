// Meaning search (Cowork ENTRY 390 GO, owner approved 20 Nov 2026): the records whose meaning is closest to a search,
// for the 'Related by meaning' group on /search. It only adds to the exact search, which stays first and unchanged.
//
// The search is turned into a vector (lib/meaning/embed.ts) and the database's search_meaning() returns the nearest rows
// of search_embeddings (halfvec(384), HNSW index, cosine). Never slow and never an error: the model has EMBED_MS and the
// database DB_MS, and anything late, failing or missing (no table yet, no vectors) gives an empty list, which shows
// nothing. A wrong match scores in the same band as a right one (0.84 to 0.90 against 0.86 to 0.95 in the ENTRY 390
// test), so the score is not a filter beyond MIN_SCORE, which drops only plainly unrelated rows; what keeps wrong matches
// harmless is that the group sits under the exact results and is labelled as related by meaning.
import 'server-only';
import { supabase } from '@/lib/supabase';
import { embedQuery, warmMeaningModel } from './embed';
import { localSearch, localVectorsAllowed } from './local-vectors';
import { MEANING_KINDS, type MeaningHit, type MeaningKind } from './kinds';

export const MAX_QUERY = 200;
export const EMBED_MS = 2500; // a cold start on Vercel is estimated at 1 to 3 s; warm about 2 ms
export const DB_MS = 1500;
export const MIN_SCORE = 0.8;
const KINDS = new Set<string>(MEANING_KINDS);

export function meaningQuery(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim().slice(0, MAX_QUERY);
}

const late = <T>(ms: number, fallback: T) => new Promise<T>((r) => setTimeout(() => r(fallback), ms));

export async function meaningSearch(raw: string, limit = 15): Promise<{ hits: MeaningHit[]; why?: string; ms: { embed: number; db: number } }> {
  const q = meaningQuery(raw);
  const ms = { embed: 0, db: 0 };
  if (q.length < 3 || !/[a-z]{3}/i.test(q)) return { hits: [], why: 'short', ms };
  const t0 = performance.now();
  let vec: Float32Array | null;
  try {
    vec = await Promise.race([embedQuery(q), late<null>(EMBED_MS, null)]);
  } catch {
    return { hits: [], why: 'model', ms };
  }
  ms.embed = Math.round(performance.now() - t0);
  if (!vec) {
    warmMeaningModel(); // still loading: it carries on, so the next search is warm
    return { hits: [], why: 'model-slow', ms };
  }
  const t1 = performance.now();
  try {
    let rows: MeaningHit[];
    if (localVectorsAllowed()) {
      rows = localSearch(vec, limit);
    } else {
      const { data, error } = await supabase
        .rpc('search_meaning', { p_query: `[${Array.from(vec, (x) => x.toFixed(5)).join(',')}]`, p_limit: limit })
        .abortSignal(AbortSignal.timeout(DB_MS));
      if (error) return { hits: [], why: 'db', ms };
      rows = ((data ?? []) as { kind: string; path: string; title: string; score: number }[])
        .filter((r) => KINDS.has(r.kind) && typeof r.path === 'string' && r.path.startsWith('/') && !r.path.startsWith('//'))
        .map((r) => ({ kind: r.kind as MeaningKind, path: r.path, title: r.title, score: Number(r.score) }));
    }
    ms.db = Math.round(performance.now() - t1);
    return { hits: rows.filter((r) => r.score >= MIN_SCORE), ms };
  } catch {
    ms.db = Math.round(performance.now() - t1);
    return { hits: [], why: 'db', ms };
  }
}
