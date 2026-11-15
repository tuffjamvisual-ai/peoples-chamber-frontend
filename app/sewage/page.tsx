import type { Metadata } from 'next';
import SewageView from './SewageView';

export const revalidate = false; // A16: rebuilt only when its data changes (tags on every read), or on a deploy

export const metadata: Metadata = {
  title: { absolute: 'Sewage spills by council, constituency and water company' },
  description:
    'How long storm overflows spilled sewage in every council area and constituency in England, Scotland and Northern Ireland, from water industry monitoring.',
  alternates: { canonical: '/sewage' },
};

export default function SewagePage() {
  return <SewageView />;
}
