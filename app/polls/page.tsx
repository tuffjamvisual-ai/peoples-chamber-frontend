import Navigation from '../components/Navigation'
import PollsClient from './PollsClient'

export const revalidate = 0

export default function PollsPage() {
  return (
    <div className="min-h-screen bg-[#111111]">
      <Navigation />
      <PollsClient />
    </div>
  )
}
