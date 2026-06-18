import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const RATE_LIMIT_WINDOW = 60 * 1000
const MAX_REQUESTS = 60

// NOTE: this Map is per-instance and resets on cold start, so on a
// serverless/edge fan-out it's a coarse best-effort limiter, not a real
// one. For accurate, shared rate limiting move to Vercel WAF or Upstash.
const requests = new Map<string, { count: number; timestamp: number }>()

// Evict expired entries on a 60s cadence so the Map can't grow unbounded
// from one-off IPs that never return. Lazy (driven by request traffic)
// because edge runtime has no reliable long-lived timers.
let lastSweep = Date.now()
function sweep(now: number) {
  if (now - lastSweep < RATE_LIMIT_WINDOW) return
  for (const [ip, rec] of requests) {
    if (now - rec.timestamp > RATE_LIMIT_WINDOW) requests.delete(ip)
  }
  lastSweep = now
}

export function middleware(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ||
             request.headers.get('x-real-ip') ||
             'unknown'

  const now = Date.now()
  sweep(now)
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
