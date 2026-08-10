import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin') || ''
  const referer = request.headers.get('referer') || ''
  
  const allowed = [
    'https://www.opengovt.uk',
    'https://opengovt.uk',
    'https://www.thepeopleschamber.uk',
    'https://thepeopleschamber.uk',
    'http://localhost:3000'
  ]
  
  const isAllowed = allowed.some(domain => 
    origin.startsWith(domain) || referer.startsWith(domain)
  )
  
  if (!isAllowed && request.method !== 'GET') {
    return new NextResponse('Forbidden', { status: 403 })
  }
  
  return NextResponse.next()
}
