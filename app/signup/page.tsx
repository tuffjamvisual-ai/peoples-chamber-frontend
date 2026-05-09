import type { Metadata } from 'next'
import SignupClient from './SignupClient'

export const metadata: Metadata = {
  title: 'Sign up',
  description:
    'Join The People’s Chamber — create an account to vote on bills, comment, and join the public record.',
  alternates: { canonical: '/signup' },
  robots: { index: false, follow: true },
}

export default function SignupPage() {
  return <SignupClient />
}
