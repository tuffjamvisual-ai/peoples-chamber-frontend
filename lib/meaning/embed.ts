// Meaning search (Cowork ENTRY 390 GO, owner approved 20 Nov 2026): turns a search into 384 numbers with the small open
// model kept in the repo (models/Supabase/gte-small: MIT, q8 ONNX, 34.7 MB with its tokenizer), run in this server
// function through @huggingface/transformers on onnxruntime-node (CPU). No outside service, no key: the model is read
// from the deployment's own files and never fetched (allowRemoteModels = false). It loads once per server instance
// (about 0.2 s on the Mac, 1 to 3 s estimated cold on Vercel) and is reused while the instance stays warm (about 2 ms).
// Only /api/meaning-search imports this, so only that function carries the runtime and the model (next.config.ts
// outputFileTracingIncludes / Excludes; .npmrc keeps the CUDA libraries out of the install).
// The page vectors in search_embeddings were made with the same model, text and settings (scripts/meaning/).
import 'server-only';
import path from 'node:path';

export const MEANING_MODEL = 'Supabase/gte-small';
export const MEANING_DIMS = 384;

type Extractor = (text: string | string[], opts: { pooling: 'mean'; normalize: boolean }) => Promise<{ data: Float32Array }>;
let extractor: Promise<Extractor> | null = null;

function getExtractor(): Promise<Extractor> {
  if (!extractor) {
    extractor = (async () => {
      // A literal specifier, so Next's file tracing finds the package (it is in Next's default serverExternalPackages
      // list, so it is required from node_modules at run time, not bundled).
      const { pipeline, env } = await import('@huggingface/transformers');
      env.allowRemoteModels = false; // never fetch from huggingface.co
      env.allowLocalModels = true;
      env.localModelPath = path.join(process.cwd(), 'models');
      return (await pipeline('feature-extraction', MEANING_MODEL, { dtype: 'q8' })) as unknown as Extractor;
    })().catch((e) => {
      extractor = null; // the next search tries again
      // Logged so a failure on Vercel can be diagnosed (it was silent: the search answered 'model' with no reason).
      // The message only: no request data, nothing personal.
      console.error(`meaning model failed to load: ${e instanceof Error ? `${e.name}: ${e.message}`.slice(0, 500) : String(e).slice(0, 500)}`);
      throw e;
    });
  }
  return extractor;
}

// Starts loading the model without waiting (a search that gave up on a cold start leaves it loading for the next one).
export function warmMeaningModel(): void {
  getExtractor().catch(() => {});
}

// The query's vector: unit length, so cosine similarity is a dot product.
export async function embedQuery(text: string): Promise<Float32Array> {
  const ext = await getExtractor();
  const out = await ext(text, { pooling: 'mean', normalize: true });
  if (out.data.length !== MEANING_DIMS) throw new Error(`meaning model gave ${out.data.length} numbers, expected ${MEANING_DIMS}`);
  return out.data;
}
