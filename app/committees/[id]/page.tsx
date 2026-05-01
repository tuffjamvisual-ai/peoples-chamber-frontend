import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Navigation from '../../components/Navigation';

export const revalidate = 3600;

const ACCENT = '#ffffff';

interface Props {
  params: Promise<{ id: string }>;
}

async function fetchPublication(id: number) {
  const { data } = await supabase
    .from('committee_proceedings')
    .select('id, committee_name, title, publication_date, publication_type, summary, full_content, publication_url, url')
    .eq('id', id)
    .maybeSingle();
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const idNum = Number(id);
  if (!Number.isFinite(idNum)) return { title: 'Committee publication' };
  const row = await fetchPublication(idNum);
  if (!row) return { title: 'Committee publication' };
  return {
    title: row.title || 'Committee publication',
    description: row.summary || `${row.committee_name || 'UK Parliament committee'} publication.`,
    alternates: { canonical: `/committees/${idNum}` },
  };
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return iso;
  }
}

export default async function CommitteePublicationPage({ params }: Props) {
  const { id } = await params;
  const idNum = Number(id);
  if (!Number.isFinite(idNum)) notFound();
  const row = await fetchPublication(idNum);
  if (!row) notFound();

  const externalUrl = row.publication_url || row.url || null;

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-white">
      <Navigation />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pb-16">
        <Link href="/" className="inline-flex items-center gap-2 text-white hover:text-white mb-8 text-sm">
          ← Home
        </Link>

        {row.committee_name && (
          <p className="text-sm uppercase tracking-[0.3em] mb-3" style={{ color: ACCENT }}>
            {row.committee_name}
          </p>
        )}

        <h1 className="text-3xl sm:text-4xl font-bold leading-tight text-white mb-4">{row.title}</h1>

        <div className="flex flex-wrap items-center gap-3 text-sm text-white mb-8 font-mono">
          {row.publication_date && <span>{formatDate(row.publication_date)}</span>}
          {row.publication_type && <span>· {row.publication_type}</span>}
          {externalUrl && (
            <>
              <span>·</span>
              <a
                href={externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-[#ffffff] transition-colors"
                style={{ color: ACCENT }}
              >
                Read on Parliament.uk →
              </a>
            </>
          )}
        </div>

        {row.summary && (
          <p className="text-base sm:text-lg text-[#c9c9c9] leading-relaxed mb-10 pl-4 border-l-2" style={{ borderColor: ACCENT }}>
            {row.summary}
          </p>
        )}

        {row.full_content ? (
          <article className="text-[#c9c9c9] text-sm sm:text-base leading-relaxed whitespace-pre-line">
            {row.full_content}
          </article>
        ) : (
          <div className="border-t border-[#333333] pt-8 mt-8">
            <p className="text-white text-sm leading-relaxed">
              The full text of this publication has not been mirrored locally. Use the link above to read it on the UK Parliament site.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
