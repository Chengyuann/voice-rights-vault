import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { spawn } from 'node:child_process'

const host = '127.0.0.1'
const port = Number(process.env.SMOKE_PORT || 4175)
const baseUrl = process.env.SMOKE_BASE_URL || `http://${host}:${port}`
const metricsToken = process.env.SMOKE_METRICS_TOKEN || randomBytes(24).toString('hex')
const startServer = !process.env.SMOKE_BASE_URL
let server

async function request(path, options = {}) {
  return fetch(`${baseUrl}${path}`, {
    signal: AbortSignal.timeout(15_000),
    ...options,
  })
}

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await request('/healthz')
      if (response.ok) return
    } catch {
      // The process may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(`Server did not become healthy at ${baseUrl}.`)
}

try {
  if (startServer) {
    server = spawn(process.execPath, ['server/index.ts'], {
      cwd: new URL('..', import.meta.url),
      env: {
        ...process.env,
        HOST: host,
        PORT: String(port),
        METRICS_TOKEN: metricsToken,
        RATE_LIMIT_SALT: 'production-smoke-rate-limit-salt',
        PREVIEW_SAMPLE_REQUIRED: '0',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    await waitForServer()
  }

  const health = await request('/healthz')
  assert.equal(health.status, 200)
  assert.deepEqual(await health.json(), { status: 'ok' })

  const ready = await request('/readyz')
  assert.equal(ready.status, 200)
  assert.equal((await ready.json()).ready, true)

  const home = await request('/')
  assert.equal(home.status, 200)
  assert.match(home.headers.get('content-type') || '', /^text\/html/)
  assert.match(await home.text(), /VoiceRights Vault/)
  const contentSecurityPolicy = home.headers.get('content-security-policy') || ''
  assert.match(contentSecurityPolicy, /frame-ancestors 'none'/)
  assert.match(contentSecurityPolicy, /connect-src 'self' blob:/)
  assert.equal(home.headers.get('x-content-type-options'), 'nosniff')

  const routeRefresh = await request('/demo/creator')
  assert.equal(routeRefresh.status, 200)
  assert.match(routeRefresh.headers.get('content-type') || '', /^text\/html/)

  const demoVideo = await request('/demo-video.mp4', {
    headers: { Range: 'bytes=0-1023' },
  })
  assert.equal(demoVideo.status, 206)
  assert.equal(demoVideo.headers.get('content-type'), 'video/mp4')
  assert.match(demoVideo.headers.get('content-range') || '', /^bytes 0-1023\/\d+$/)
  assert.equal((await demoVideo.arrayBuffer()).byteLength, 1024)

  const metricsWithoutToken = await request('/metrics')
  assert.equal(metricsWithoutToken.status, 401)

  const metrics = await request('/metrics', {
    headers: { Authorization: `Bearer ${metricsToken}` },
  })
  assert.equal(metrics.status, 200)
  assert.equal(typeof (await metrics.json()).requests_total, 'number')

  const invalidAudio = await request('/api/voice/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: 'not audio',
  })
  assert.equal(invalidAudio.status, 415)

  const oversized = await request('/api/voice/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: Buffer.alloc(12 * 1024 * 1024 + 1),
  })
  assert.equal(oversized.status, 413)

  console.log(`Production smoke passed: ${baseUrl}`)
} finally {
  if (server && server.exitCode === null) {
    server.kill('SIGTERM')
    await new Promise((resolve) => server.once('exit', resolve))
  }
}
