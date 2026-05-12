import type { Metadata } from 'next'
import Navigation from '../components/Navigation'
import PollsClient from './PollsClient'

export const metadata: Metadata = {
  title: 'Public Polls',
  description: 'Live public polls on every UK Parliament bill — see how the public would vote, then compare it to the official Commons tally.',
  alternates: { canonical: '/polls' },
}

export default function PollsPage() {
  return (
    <div className="min-h-screen bg-[#505050]">
      <Navigation />
      <PollsClient />
    </div>
  )
}
