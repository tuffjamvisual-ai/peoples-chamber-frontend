import { redirect } from 'next/navigation';

// The professional Westminster Voting Intention tracker page was removed by
// request. This route now redirects to the opengovt Polls hub so any bookmarks
// or inbound links land somewhere useful instead of 404ing. The underlying
// vi_polls data and the sync-voting-intention cron are retained because the
// homepage "if an election were held now" bars still use the poll-of-polls
// average (lib/pollOfPolls).
export default function VotingIntentionPage() {
  redirect('/polls');
}
