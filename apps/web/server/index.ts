import { createReadStream } from 'node:fs'
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { extname, join, normalize } from 'node:path'
import { attachVoiceApi, checkVoiceApiReadiness, type VoiceApiMiddleware } from './voice-api.ts'

const host = process.env.HOST || '127.0.0.1'
const port = Number(process.env.PORT || 4174)
const distPath = join(import.meta.dirname, '../dist')
const trustProxy = process.env.TRUST_PROXY === '1'
const rateLimitSalt = process.env.RATE_LIMIT_SALT || randomUUID()
const metricsToken = process.env.METRICS_TOKEN || ''
await readFile(join(distPath, 'index.html'))

type RateLimitPolicy = {
  capacity: number
  refillPerSecond: number
}

type RateLimitBucket = {
  tokens: number
  updatedAt: number
  expiresAt: number
}

const rateLimitPolicies: Array<[string, RateLimitPolicy]> = [
  ['/api/voice/synthesize', { capacity: 5, refillPerSecond: 1 / 20 }],
  ['/api/voice/transcribe', { capacity: 10, refillPerSecond: 1 / 10 }],
  ['/api/policy/evaluate', { capacity: 20, refillPerSecond: 1 / 5 }],
  ['/api/voice/provenance', { capacity: 30, refillPerSecond: 1 }],
  ['/api/aleo/transaction', { capacity: 60, refillPerSecond: 2 }],
]
const rateLimitBuckets = new Map<string, RateLimitBucket>()
const metrics = {
  startedAt: Date.now(),
  requests: 0,
  responsesByStatus: new Map<number, number>(),
  requestsByRoute: new Map<string, number>(),
  rateLimited: 0,
  inFlight: 0,
  totalDurationMs: 0,
}

const mimeTypes: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
}

const apiRoutes = new Map<string, VoiceApiMiddleware>()
attachVoiceApi({
  use(route, handler) {
    apiRoutes.set(route, handler)
  },
})

function sendJson(response: ServerResponse, statusCode: number, body: unknown) {
  response.statusCode = statusCode
  response.setHeader('Content-Type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(body))
}

function clientAddress(request: IncomingMessage) {
  if (trustProxy) {
    const forwarded = request.headers['x-forwarded-for']
    const value = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0]
    if (value?.trim()) return value.trim()
  }
  return request.socket.remoteAddress || 'unknown'
}

function anonymizeAddress(address: string) {
  return createHash('sha256').update(`${rateLimitSalt}:${address}`).digest('hex').slice(0, 16)
}

function routeLabel(pathname: string) {
  if (pathname.startsWith('/api/')) return pathname
  if (pathname === '/healthz' || pathname === '/readyz' || pathname === '/metrics') return pathname
  return 'static'
}

function consumeRateLimit(pathname: string, addressHash: string) {
  const policy = rateLimitPolicies.find(([route]) => route === pathname)?.[1]
  if (!policy) return { allowed: true, remaining: -1, retryAfter: 0 }
  const now = Date.now()
  const key = `${pathname}:${addressHash}`
  const bucket = rateLimitBuckets.get(key) || {
    tokens: policy.capacity,
    updatedAt: now,
    expiresAt: now + 3_600_000,
  }
  const elapsedSeconds = Math.max(0, (now - bucket.updatedAt) / 1000)
  bucket.tokens = Math.min(policy.capacity, bucket.tokens + elapsedSeconds * policy.refillPerSecond)
  bucket.updatedAt = now
  bucket.expiresAt = now + 3_600_000
  const allowed = bucket.tokens >= 1
  if (allowed) bucket.tokens -= 1
  rateLimitBuckets.set(key, bucket)
  return {
    allowed,
    remaining: Math.max(0, Math.floor(bucket.tokens)),
    retryAfter: allowed ? 0 : Math.max(1, Math.ceil((1 - bucket.tokens) / policy.refillPerSecond)),
  }
}

function metricSnapshot() {
  return {
    uptime_seconds: Math.floor((Date.now() - metrics.startedAt) / 1000),
    requests_total: metrics.requests,
    in_flight: metrics.inFlight,
    rate_limited_total: metrics.rateLimited,
    average_duration_ms: metrics.requests ? Math.round(metrics.totalDurationMs / metrics.requests) : 0,
    responses_by_status: Object.fromEntries(metrics.responsesByStatus),
    requests_by_route: Object.fromEntries(metrics.requestsByRoute),
    rate_limit_buckets: rateLimitBuckets.size,
  }
}

function metricsAuthorized(request: IncomingMessage) {
  if (!metricsToken) return false
  const authorization = request.headers.authorization || ''
  const supplied = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  const expectedBuffer = Buffer.from(metricsToken)
  const suppliedBuffer = Buffer.from(supplied)
  return expectedBuffer.length === suppliedBuffer.length && timingSafeEqual(expectedBuffer, suppliedBuffer)
}

setInterval(() => {
  const now = Date.now()
  for (const [key, bucket] of rateLimitBuckets) {
    if (bucket.expiresAt < now) rateLimitBuckets.delete(key)
  }
}, 300_000).unref()

async function serveStatic(request: IncomingMessage, response: ServerResponse) {
  const requestUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`)
  const decodedPath = decodeURIComponent(requestUrl.pathname)
  const requested = decodedPath === '/' ? 'index.html' : decodedPath.replace(/^\/+/, '')
  const normalizedPath = normalize(requested).replace(/^(\.\.(\/|\\|$))+/, '')
  let filePath = join(distPath, normalizedPath)

  try {
    const fileStat = await stat(filePath)
    if (fileStat.isDirectory()) filePath = join(filePath, 'index.html')
  } catch {
    filePath = join(distPath, 'index.html')
  }

  try {
    const fileStat = await stat(filePath)
    if (!fileStat.isFile()) throw new Error('Not a file.')
    const range = request.headers.range?.match(/^bytes=(\d*)-(\d*)$/)
    let start = 0
    let end = fileStat.size - 1
    if (range) {
      const [, startValue, endValue] = range
      if (startValue) {
        start = Number(startValue)
        end = endValue ? Number(endValue) : end
      } else if (endValue) {
        const suffixLength = Number(endValue)
        start = Math.max(0, fileStat.size - suffixLength)
      }
      if (
        !Number.isSafeInteger(start)
        || !Number.isSafeInteger(end)
        || start < 0
        || end < start
        || start >= fileStat.size
      ) {
        response.statusCode = 416
        response.setHeader('Content-Range', `bytes */${fileStat.size}`)
        response.end()
        return
      }
      end = Math.min(end, fileStat.size - 1)
      response.statusCode = 206
      response.setHeader('Content-Range', `bytes ${start}-${end}/${fileStat.size}`)
    } else {
      response.statusCode = 200
    }
    response.setHeader('Content-Type', mimeTypes[extname(filePath).toLowerCase()] || 'application/octet-stream')
    response.setHeader('Accept-Ranges', 'bytes')
    response.setHeader('Content-Length', String(end - start + 1))
    if (filePath.endsWith('index.html')) {
      response.setHeader('Cache-Control', 'no-cache')
    } else {
      response.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    }
    if (request.method === 'HEAD') {
      response.end()
      return
    }
    createReadStream(filePath, { start, end }).pipe(response)
  } catch {
    sendJson(response, 404, { error: 'Static asset not found.' })
  }
}

const server = createServer(async (request, response) => {
  const startedAt = performance.now()
  const requestId = request.headers['x-request-id']?.toString().slice(0, 80) || randomUUID()
  const pathname = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`).pathname
  const route = routeLabel(pathname)
  const addressHash = anonymizeAddress(clientAddress(request))
  metrics.requests += 1
  metrics.inFlight += 1
  metrics.requestsByRoute.set(route, (metrics.requestsByRoute.get(route) || 0) + 1)
  response.setHeader('X-Request-Id', requestId)
  response.once('finish', () => {
    const durationMs = Math.round(performance.now() - startedAt)
    metrics.inFlight -= 1
    metrics.totalDurationMs += durationMs
    metrics.responsesByStatus.set(response.statusCode, (metrics.responsesByStatus.get(response.statusCode) || 0) + 1)
    process.stdout.write(`${JSON.stringify({
      level: response.statusCode >= 500 ? 'error' : response.statusCode >= 400 ? 'warn' : 'info',
      event: 'http_request',
      request_id: requestId,
      method: request.method,
      route,
      status: response.statusCode,
      duration_ms: durationMs,
      client: addressHash,
    })}\n`)
  })

  response.setHeader('X-Content-Type-Options', 'nosniff')
  response.setHeader('X-Frame-Options', 'DENY')
  response.setHeader('Referrer-Policy', 'no-referrer')
  response.setHeader('Permissions-Policy', 'camera=(), geolocation=(), microphone=(self)')
  response.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; media-src 'self' blob:; connect-src 'self' blob: https://api.explorer.provable.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
  )

  if (pathname === '/healthz') {
    sendJson(response, 200, { status: 'ok' })
    return
  }

  if (pathname === '/readyz') {
    const readiness = await checkVoiceApiReadiness()
    sendJson(response, readiness.ready ? 200 : 503, readiness)
    return
  }

  if (pathname === '/metrics') {
    if (!metricsAuthorized(request)) {
      sendJson(response, metricsToken ? 401 : 404, { error: metricsToken ? 'Unauthorized.' : 'Metrics are disabled.' })
      return
    }
    sendJson(response, 200, metricSnapshot())
    return
  }

  if (pathname.startsWith('/api/')) {
    const rateLimit = consumeRateLimit(pathname, addressHash)
    if (rateLimit.remaining >= 0) {
      response.setHeader('X-RateLimit-Remaining', String(rateLimit.remaining))
    }
    if (!rateLimit.allowed) {
      metrics.rateLimited += 1
      response.setHeader('Retry-After', String(rateLimit.retryAfter))
      sendJson(response, 429, { error: 'Rate limit exceeded.', retry_after_seconds: rateLimit.retryAfter })
      return
    }
  }

  const handler = apiRoutes.get(pathname)
  if (handler) {
    try {
      await handler(request, response)
    } catch (error) {
      if (!response.headersSent) {
        sendJson(response, 500, { error: error instanceof Error ? error.message : 'Internal server error.' })
      } else {
        response.end()
      }
    }
    return
  }

  if (pathname.startsWith('/api/')) {
    sendJson(response, 404, { error: 'API route not found.' })
    return
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    sendJson(response, 405, { error: 'Method not allowed.' })
    return
  }

  await serveStatic(request, response)
})

server.requestTimeout = 35_000
server.headersTimeout = 40_000
server.keepAliveTimeout = 5_000

server.listen(port, host, () => {
  process.stdout.write(`VoiceRights Vault listening on http://${host}:${port}\n`)
})

function shutdown(signal: string) {
  process.stdout.write(`${JSON.stringify({ level: 'info', event: 'shutdown', signal })}\n`)
  server.close((error) => {
    process.exitCode = error ? 1 : 0
  })
  setTimeout(() => {
    process.exitCode = 1
    server.closeAllConnections()
  }, 10_000).unref()
}

process.once('SIGTERM', () => shutdown('SIGTERM'))
process.once('SIGINT', () => shutdown('SIGINT'))
