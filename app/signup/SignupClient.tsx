'use client'

import { useRouter } from 'next/navigation'
import AuthModal from '../components/AuthModal'

export default function SignupClient() {
  const router = useRouter()
  return (
    <main className="min-h-screen bg-[#505050]">
      <AuthModal
        isOpen={true}
        mode="signup"
        onClose={() => router.push('/')}
      />
    </main>
  )
}
