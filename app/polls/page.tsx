import Navigation from '../components/Navigation'
import PollsClient from './PollsClient'

export const revalidate = 0

export default function PollsPage() {
  return (
    <div className="min-h-screen bg-[#1a1a1a]">
      <Navigation />
      <PollsClient />
    </div>
  )
}
