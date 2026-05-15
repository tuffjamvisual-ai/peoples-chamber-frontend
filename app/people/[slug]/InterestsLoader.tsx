'use client';

import { useEffect, useState } from 'react';

type Interest = {
  summary: string;
  detail: string;
  registered_date: string | null;
};
type InterestCategory = { name: string; items: Interest[] };

// Small client island: fetches financial interests from /api/mp-interests
// (a separate endpoint) and renders them. Kept client-side because the
// data is incidental to the page's main content and shouldn't block the
// server render.
export default function InterestsLoader({ slug }: { slug: string }) {
  const [interests, setInterests] = useState<InterestCategory[]>([]);

  useEffect(() => {
    fetch(`/api/mp-interests?slug=${slug}`)
      .then((r) => r.json())
      .then((d) => setInterests(d.categories || []))
      .catch(() => {});
  }, [slug]);

  if (interests.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-white mb-4">Financial Interests</h2>
      {interests.map((cat) => (
        <div key={cat.name} className="mb-6 last:mb-0">
          <h3 className="text-sm font-semibold mb-2" style={{ color: '#ffffff' }}>
            {cat.name}
          </h3>
          <ul className="space-y-2">
            {cat.items.map((item, i) => (
              <li key={i} className="text-[#c9c9c9] text-sm leading-relaxed">
                <div>{item.summary}</div>
                {item.detail && item.detail !== item.summary && (
                  <div className="text-white text-sm mt-1 whitespace-pre-line">{item.detail}</div>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
