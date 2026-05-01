import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const RATE_LIMIT_WINDOW = 60 * 1000
const MAX_REQUESTS = 60

const requests = new Map<string, { count: number; timestamp: number }>()

const BOT_PATTERNS = [
  /bot/i, /crawler/i, /spider/i, /scraper/i, /wget/i, /curl/i,
  /python-requests/i, /scrapy/i, /httpclient/i, /go-http/i
]

export function middleware(request: NextRequest) {
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
  matcher: ['/api/:path*'],
}
