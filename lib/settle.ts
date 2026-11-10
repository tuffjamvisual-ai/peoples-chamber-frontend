// Reads started early and awaited later (10 Nov 2026). A promise that rejects before the code reaches its await is an
// unhandledRejection, and on Vercel that ends the whole Node.js process (exit status 128) with every request it is
// serving: on 8 Nov 16:08 GMT one slow "vote years" read on /mps/[id] took down unrelated pages this way.
// handled() marks a promise as handled at once, so it can no longer end the process, but it still throws where it is
// awaited (for reads whose failure should keep the last good page, or that the code expects to throw).
// orNull() is for the optional parts of a page: a failed read is logged and that part is left out.
export function handled<T>(promise: Promise<T>): Promise<T> {
  promise.catch(() => {});
  return promise;
}

export function orNull<T>(promise: Promise<T>, label: string): Promise<T | null> {
  return promise.catch((e) => {
    console.error(`${label}:`, e instanceof Error ? e.message : String(e));
    return null;
  });
}
