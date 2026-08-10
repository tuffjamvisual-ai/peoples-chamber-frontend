import { redirect } from 'next/navigation';

// The ten highest council tax bills now live in the Investigations section.
// Kept as a permanent redirect so old links, bookmarks and the sitemap entry
// continue to resolve.
export default function CouncilTaxPage() {
  redirect('/editorials/cq4r8vn2mp');
}
