// LOCAL DEVELOPMENT ONLY (Cowork ENTRY 390 GO): pictures of meaning search before the vectors are in the database. With
// MEANING_LOCAL_VECTORS=<prefix> set for `next dev`, the search reads <prefix>.f32 (the vectors, 384 float32 each) and
// <prefix>.meta.json (kind, path, title per row), both written by scripts/meaning/load-embeddings.ts, and scans them in
// memory. It can never run on the live site: localVectorsAllowed() is false unless NODE_ENV is 'development' (next build
// and next start set 'production') and VERCEL is unset (Vercel sets it in every build and function).
import 'server-only';
import fs from 'node:fs';
import type { MeaningHit, MeaningKind } from './kinds';

export function localVectorsAllowed(): boolean {
  return process.env.NODE_ENV === 'development' && !process.env.VERCEL && !!process.env.MEANING_LOCAL_VECTORS;
}

let held: { prefix: string; vecs: Float32Array; meta: { kind: MeaningKind; path: string; title: string }[] } | null = null;

export function localSearch(q: Float32Array, limit: number): MeaningHit[] {
  if (!localVectorsAllowed()) return [];
  const prefix = process.env.MEANING_LOCAL_VECTORS as string;
  if (held?.prefix !== prefix) {
    const b = fs.readFileSync(`${prefix}.f32`);
    const vecs = new Float32Array(b.buffer, b.byteOffset, b.byteLength / 4);
    const meta = JSON.parse(fs.readFileSync(`${prefix}.meta.json`, 'utf8'));
    if (vecs.length !== meta.length * q.length) throw new Error('local vectors and their list differ in length');
    held = { prefix, vecs, meta };
  }
  const { vecs, meta } = held;
  const d = q.length;
  const scores = new Float32Array(meta.length);
  for (let i = 0; i < meta.length; i++) {
    let s = 0;
    const o = i * d;
    for (let j = 0; j < d; j++) s += vecs[o + j] * q[j];
    scores[i] = s;
  }
  return [...scores.keys()].sort((a, b) => scores[b] - scores[a]).slice(0, limit)
    .map((i) => ({ ...meta[i], score: +scores[i].toFixed(4) }));
}
