import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const RATE_LIMIT_WINDOW = 60 * 1000
const MAX_REQUESTS = 60

const requests = new Map<string, { count: number; timestamp: number }>()

const BOT_PATTERNS = [
  /bot/i, /crawler/i, /spider/i, /scraper/i, /wget/i, /curl/i,
  /python-requests/i, /scrapy/i, /httpclient/i, /go-http/i
]

const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY || 'no-key-set'

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const apiKey = request.headers.get('x-internal-key')
    const referer = request.headers.get('referer') || ''
    const isInternal = referer.includes('thepeopleschamber.uk') || 
                       referer.includes('localhost:3000') ||
                       apiKey === INTERNAL_API_KEY
    if (!isInternal) {
      return new NextResponse('Forbidden', { status: 403 })
    }
  }
  const ua = request.headers.get('user-agent') || ''
  
  for (const pattern of BOT_PATTERNS) {
    if (pattern.test(ua)) {
      return new NextResponse('Forbidden', { status: 403 })
    }
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
             request.headers.get('x-real-ip') || 
             'unknown'
  
  const now = Date.now()
  const record = requests.get(ip)

  if (!record || now - record.timestamp > RATE_LIMIT_WINDOW) {
    requests.set(ip, { count: 1, timestamp: now })
  } else {
    record.count++
    if (record.count > MAX_REQUESTS) {
      return new NextResponse('Too Many Requests', { 
        status: 429,
        headers: { 'Retry-After': '60' }
      })
    }
  }

  const response = NextResponse.next()
  response.headers.set('X-Robots-Tag', 'noai, noimageai')
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|logo.png).*)'],
}
