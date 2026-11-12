'use client';

// The page's own path, for anything that marks or links the current page (T1-HL, 12 Nov 2026). When a sync refreshes the
// front page (revalidatePath('/') from the press release and MP roster syncs), Next rebuilds it in the background with
// the path '/index' (its route data reads ["", "index"]), so the header lost HOME's current mark on the live front page
// and kept it lost until the next rebuild: React keeps the server's attributes when the page starts in the browser.
// pagePath reads '/index' as '/', and usePagePath then takes the browser's own address once the page runs, so a path
// from the request that triggered a rebuild can never stay on the page.
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export function pagePath(p: string | null | undefined): string {
  if (!p) return '/';
  const q = p.replace(/\/index$/, '');
  return q === '' ? '/' : q;
}

export function usePagePath(): string {
  const raw = usePathname();
  const [path, setPath] = useState(() => pagePath(raw));
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPath(pagePath(window.location.pathname));
  }, [raw]);
  return path;
}
