import Navigation from '../components/Navigation'
import PollsClient from './PollsClient'

export const revalidate = 0

export default function PollsPage() {
  return (
    <div className="min-h-screen bg-[#0a140a]">
      <Navigation />
      <PollsClient />
    </div>
  )
}
