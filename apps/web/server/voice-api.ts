import { createHash, randomUUID } from 'node:crypto'
import { execFile } from 'node:child_process'
import { mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import type { IncomingMessage, ServerResponse } from 'node:http'
import WebSocket from 'ws'

const execFileAsync = promisify(execFile)
const credentialsPath = process.env.BAILIAN_CREDENTIALS_FILE || join(import.meta.dirname, '../../../.secrets/bailian.csv')
const localSamplePath = process.env.VOICE_SAMPLE_FILE || join(import.meta.dirname, '../../../.secrets/voice/creator-voice-identity.mp3')
const cosyVoiceProfilePath = process.env.COSYVOICE_PROFILE_FILE || join(import.meta.dirname, '../../../.secrets/cosyvoice-profile.json')
const maxUploadBytes = 12 * 1024 * 1024
const allowedAudioContentTypes = new Set([
  'application/octet-stream',
  'audio/aac',
  'audio/flac',
  'audio/m4a',
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'audio/webm',
  'audio/x-m4a',
  'audio/x-wav',
  'video/webm',
])

class RequestValidationError extends Error {
  readonly statusCode: 400 | 413 | 415

  constructor(message: string, statusCode: 400 | 413 | 415 = 400) {
    super(message)
    this.name = 'RequestValidationError'
    this.statusCode = statusCode
  }
}

export type VoiceApiMiddleware = (
  request: IncomingMessage,
  response: ServerResponse,
  next?: (error?: unknown) => void,
) => void | Promise<void>

export type VoiceApiMiddlewareServer = {
  use: (route: string, handler: VoiceApiMiddleware) => unknown
}

export type VoiceApiReadiness = {
  ready: boolean
  checks: {
    credentials: boolean
    voiceProfile: boolean
    previewSample: boolean
    ffmpeg: boolean
    ffprobe: boolean
  }
}

type BailianCredentials = {
  apiKey: string
  workspaceId: string
}

type TranscriptionResult = {
  text: string
  durationSeconds: number
  model: string
  sha256: string
}

type CosyVoiceProfile = {
  voiceId: string
  targetModel: string
}

type AleoConfirmedTransaction = {
  status?: string
  index?: number
  type?: string
  transaction?: {
    id?: string
    execution?: {
      transitions?: Array<{ program?: string; function?: string }>
    }
  }
}

type PolicyAgentResult = {
  decision: 'allow' | 'reject' | 'block'
  purpose: 'GAME_NPC' | 'POLITICAL' | 'FINANCIAL IMPERSONATION' | 'ADVERTISING' | 'CUSTOMER SUPPORT' | 'NEWS' | 'HEALTHCARE' | 'UNKNOWN'
  confidence: number
  risks: string[]
  explanation: string
  model: string
}

type SynthesisProvenance = {
  provenanceId: string
  purpose: string
  receiptCommitment: string | null
  policyDecision: string
  policyModel: string
  program: string
  authorizationTx: string | null
  livenessVerified: boolean
  challengeCommitment: string | null
}

type EmbeddedProvenance = SynthesisProvenance & {
  marker: 'VoiceRights'
  version: 1
}

function parseCsvValue(value: string) {
  return value.replace(/^\uFEFF/, '').replace(/^"|"$/g, '').trim()
}

async function loadBailianCredentials(): Promise<BailianCredentials> {
  const environmentApiKey = process.env.BAILIAN_API_KEY?.trim() || ''
  const environmentWorkspaceId = process.env.BAILIAN_WORKSPACE_ID?.trim() || ''
  if (environmentApiKey && environmentWorkspaceId) {
    return { apiKey: environmentApiKey, workspaceId: environmentWorkspaceId }
  }

  const source = await readFile(credentialsPath, 'utf8')
  const values = new Map<string, string>()

  for (const line of source.replace(/^\uFEFF/, '').split(/\r?\n/)) {
    const separator = line.indexOf(',')
    if (separator < 0) continue
    values.set(parseCsvValue(line.slice(0, separator)), parseCsvValue(line.slice(separator + 1)))
  }

  const apiKey = values.get('apiKey')?.split(/\s+/)[0] ?? ''
  const workspaceId = values.get('workspaceId') ?? ''
  if (!apiKey || !workspaceId) throw new Error('Bailian API credentials are incomplete.')
  return { apiKey, workspaceId }
}

async function loadCosyVoiceProfile(): Promise<CosyVoiceProfile> {
  const environmentVoiceId = process.env.COSYVOICE_VOICE_ID?.trim() || ''
  const environmentTargetModel = process.env.COSYVOICE_TARGET_MODEL?.trim() || ''
  if (environmentVoiceId && environmentTargetModel) {
    return { voiceId: environmentVoiceId, targetModel: environmentTargetModel }
  }

  const profile = JSON.parse(await readFile(cosyVoiceProfilePath, 'utf8')) as Partial<CosyVoiceProfile>
  if (!profile.voiceId || !profile.targetModel) throw new Error('CosyVoice profile is unavailable.')
  return { voiceId: profile.voiceId, targetModel: profile.targetModel }
}

export async function checkVoiceApiReadiness(): Promise<VoiceApiReadiness> {
  const check = async (operation: () => Promise<unknown>) => {
    try {
      await operation()
      return true
    } catch {
      return false
    }
  }
  const previewSampleRequired = process.env.PREVIEW_SAMPLE_REQUIRED === '1'
  const [credentials, voiceProfile, previewSample, ffmpeg, ffprobe] = await Promise.all([
    check(loadBailianCredentials),
    check(loadCosyVoiceProfile),
    previewSampleRequired
      ? check(async () => {
          const fileStat = await stat(localSamplePath)
          if (!fileStat.isFile() || fileStat.size === 0) throw new Error('Preview sample is unavailable.')
        })
      : Promise.resolve(true),
    check(() => execFileAsync('ffmpeg', ['-version'])),
    check(() => execFileAsync('ffprobe', ['-version'])),
  ])
  const checks = { credentials, voiceProfile, previewSample, ffmpeg, ffprobe }
  return { ready: Object.values(checks).every(Boolean), checks }
}

async function readRequestBody(request: NodeJS.ReadableStream) {
  const chunks: Buffer[] = []
  let received = 0
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
    received += buffer.length
    if (received > maxUploadBytes) throw new RequestValidationError('Request body exceeds the 12 MB limit.', 413)
    chunks.push(buffer)
  }
  return Buffer.concat(chunks)
}

export function detectAudioFormat(audio: Uint8Array) {
  if (audio.length >= 12 && Buffer.from(audio.subarray(0, 4)).toString('ascii') === 'RIFF' && Buffer.from(audio.subarray(8, 12)).toString('ascii') === 'WAVE') return 'wav'
  if (audio.length >= 4 && Buffer.from(audio.subarray(0, 4)).toString('ascii') === 'OggS') return 'ogg'
  if (audio.length >= 4 && Buffer.from(audio.subarray(0, 4)).toString('ascii') === 'fLaC') return 'flac'
  if (audio.length >= 4 && audio[0] === 0x1a && audio[1] === 0x45 && audio[2] === 0xdf && audio[3] === 0xa3) return 'webm'
  if (audio.length >= 12 && Buffer.from(audio.subarray(4, 8)).toString('ascii') === 'ftyp') return 'mp4'
  if (audio.length >= 3 && Buffer.from(audio.subarray(0, 3)).toString('ascii') === 'ID3') return 'mp3'
  if (audio.length >= 2 && audio[0] === 0xff && (audio[1] & 0xe0) === 0xe0) {
    return (audio[1] & 0x06) === 0 ? 'aac' : 'mp3'
  }
  return null
}

export function validateAudioUpload(contentType: string | undefined, audio: Uint8Array) {
  const normalizedContentType = contentType?.split(';', 1)[0]?.trim().toLowerCase() || 'application/octet-stream'
  if (!allowedAudioContentTypes.has(normalizedContentType)) {
    throw new RequestValidationError('Unsupported audio content type.', 415)
  }
  if (!audio.length) throw new RequestValidationError('No audio data received.')
  const format = detectAudioFormat(audio)
  if (!format) throw new RequestValidationError('Unsupported or invalid audio file.', 415)
  return format
}

function requestErrorStatus(error: unknown, upstreamStatus = 502) {
  return error instanceof RequestValidationError ? error.statusCode : upstreamStatus
}

async function convertToPcm(audio: Buffer) {
  const workdir = await mkdtemp(join(tmpdir(), 'voice-rights-asr-'))
  const inputPath = join(workdir, 'input-audio')
  const outputPath = join(workdir, 'audio.pcm')
  try {
    await writeFile(inputPath, audio)
    await execFileAsync('ffmpeg', [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-i',
      inputPath,
      '-ac',
      '1',
      '-ar',
      '16000',
      '-f',
      's16le',
      outputPath,
    ])
    return await readFile(outputPath)
  } finally {
    await rm(workdir, { recursive: true, force: true })
  }
}

async function embedVoiceProvenance(audio: Buffer, provenance: SynthesisProvenance) {
  const workdir = await mkdtemp(join(tmpdir(), 'voice-rights-provenance-'))
  const inputPath = join(workdir, 'input.mp3')
  const outputPath = join(workdir, 'output.mp3')
  const embedded: EmbeddedProvenance = {
    marker: 'VoiceRights',
    version: 1,
    ...provenance,
  }
  try {
    await writeFile(inputPath, audio)
    await execFileAsync('ffmpeg', [
      '-hide_banner',
      '-loglevel',
      'error',
      '-y',
      '-i',
      inputPath,
      '-map',
      '0:a',
      '-codec:a',
      'copy',
      '-id3v2_version',
      '3',
      '-metadata',
      `comment=${JSON.stringify(embedded)}`,
      outputPath,
    ])
    return await readFile(outputPath)
  } finally {
    await rm(workdir, { recursive: true, force: true })
  }
}

async function readEmbeddedVoiceProvenance(audio: Buffer) {
  const workdir = await mkdtemp(join(tmpdir(), 'voice-rights-probe-'))
  const inputPath = join(workdir, 'input-audio')
  try {
    await writeFile(inputPath, audio)
    const { stdout } = await execFileAsync('ffprobe', [
      '-v',
      'error',
      '-show_entries',
      'format_tags=comment',
      '-of',
      'json',
      inputPath,
    ])
    const comment = (JSON.parse(stdout) as { format?: { tags?: { comment?: string } } }).format?.tags?.comment || ''
    if (!comment) return null
    const parsed = JSON.parse(comment) as Partial<EmbeddedProvenance>
    if (parsed.marker !== 'VoiceRights' || parsed.version !== 1 || typeof parsed.provenanceId !== 'string') return null
    return parsed
  } catch {
    return null
  } finally {
    await rm(workdir, { recursive: true, force: true })
  }
}

async function transcribeWithBailian(audio: Buffer): Promise<TranscriptionResult> {
  const { apiKey, workspaceId } = await loadBailianCredentials()
  const pcm = await convertToPcm(audio)
  const taskId = randomUUID()
  const model = 'qwen-audio-3.0-asr-flash-streaming'
  const endpoint = `wss://${workspaceId}.cn-beijing.maas.aliyuncs.com/api-ws/v1/inference`
  const finalSentences = new Map<number, string>()
  let billedDuration = 0

  await new Promise<void>((resolve, reject) => {
    const socket = new WebSocket(endpoint, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'X-DashScope-WorkSpace': workspaceId,
        'User-Agent': 'VoiceRights-Vault/1.0',
      },
    })
    const timer = setTimeout(() => {
      socket.terminate()
      reject(new Error('Bailian transcription timed out.'))
    }, 30_000)

    const finish = (error?: Error) => {
      clearTimeout(timer)
      if (socket.readyState === WebSocket.OPEN) socket.close()
      if (error) reject(error)
      else resolve()
    }

    socket.once('open', () => {
      socket.send(JSON.stringify({
        header: { action: 'run-task', task_id: taskId, streaming: 'duplex' },
        payload: {
          task_group: 'audio',
          task: 'asr',
          function: 'recognition',
          model,
          parameters: {
            format: 'pcm',
            sample_rate: 16000,
            language_hints: ['zh', 'en'],
            semantic_punctuation_enabled: true,
          },
          input: {},
        },
      }))
    })

    socket.on('message', (data, isBinary) => {
      if (isBinary) return
      try {
        const event = JSON.parse(data.toString()) as {
          header?: { event?: string; error_message?: string }
          payload?: {
            output?: { sentence?: { sentence_id?: number; sentence_end?: boolean; heartbeat?: boolean; text?: string } }
            usage?: { duration?: number } | null
          }
        }
        const eventName = event.header?.event
        if (eventName === 'task-started') {
          const chunkBytes = 3200
          for (let offset = 0; offset < pcm.length; offset += chunkBytes) {
            socket.send(pcm.subarray(offset, Math.min(offset + chunkBytes, pcm.length)))
          }
          socket.send(JSON.stringify({
            header: { action: 'finish-task', task_id: taskId, streaming: 'duplex' },
            payload: { input: {} },
          }))
        } else if (eventName === 'result-generated') {
          const sentence = event.payload?.output?.sentence
          if (sentence?.sentence_end && !sentence.heartbeat && sentence.text) {
            finalSentences.set(sentence.sentence_id ?? finalSentences.size + 1, sentence.text)
          }
          billedDuration = event.payload?.usage?.duration ?? billedDuration
        } else if (eventName === 'task-finished') {
          finish()
        } else if (eventName === 'task-failed') {
          finish(new Error(event.header?.error_message || 'Bailian transcription failed.'))
        }
      } catch (error) {
        finish(error instanceof Error ? error : new Error('Invalid Bailian response.'))
      }
    })
    socket.once('error', (error) => finish(error))
    socket.once('close', (code) => {
      if (code !== 1000 && finalSentences.size === 0) finish(new Error(`Bailian connection closed with code ${code}.`))
    })
  })

  const text = [...finalSentences.entries()]
    .sort(([left], [right]) => left - right)
    .map(([, sentence]) => sentence)
    .join('')
    .trim()
  if (!text) throw new Error('Bailian returned no transcription text.')

  return {
    text,
    durationSeconds: billedDuration || Math.ceil(pcm.length / 32_000),
    model,
    sha256: createHash('sha256').update(audio).digest('hex'),
  }
}

async function synthesizeWithCosyVoice(text: string, provenance: SynthesisProvenance) {
  const { apiKey, workspaceId } = await loadBailianCredentials()
  const profile = await loadCosyVoiceProfile()
  const response = await fetch(`https://${workspaceId}.cn-beijing.maas.aliyuncs.com/api/v1/services/audio/tts/SpeechSynthesizer`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: profile.targetModel,
      input: {
        text,
        voice: profile.voiceId,
        format: 'mp3',
        sample_rate: 24000,
        language_hints: ['en'],
        rate: 1,
        pitch: 1,
      },
    }),
  })
  const result = await response.json() as {
    request_id?: string
    message?: string
    code?: string
    output?: { audio?: { url?: string } }
    usage?: { characters?: number }
  }
  if (!response.ok || !result.output?.audio?.url) {
    throw new Error(result.message || result.code || 'CosyVoice synthesis failed.')
  }
  const audioResponse = await fetch(result.output.audio.url)
  if (!audioResponse.ok) throw new Error('Generated audio could not be downloaded.')
  const audio = await embedVoiceProvenance(Buffer.from(await audioResponse.arrayBuffer()), provenance)
  return {
    audio,
    model: profile.targetModel,
    characters: result.usage?.characters ?? text.length,
    requestId: result.request_id ?? '',
  }
}

async function evaluatePolicyWithBailian(prompt: string): Promise<PolicyAgentResult> {
  const { apiKey, workspaceId } = await loadBailianCredentials()
  const model = 'qwen3.5-flash'
  const response = await fetch(`https://${workspaceId}.cn-beijing.maas.aliyuncs.com/compatible-mode/v1/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(15_000),
    body: JSON.stringify({
      model,
      messages: [
        {
          role: 'system',
          content: [
            'You are a strict AI voice licensing policy classifier.',
            'The only licensed purpose is fictional GAME_NPC dialogue.',
            'Block political persuasion and financial impersonation.',
            'Reject advertising, customer support, news, healthcare, or any purpose outside GAME_NPC.',
            'Return JSON only with decision, purpose, confidence, risks, explanation.',
            'decision must be allow, reject, or block.',
            'purpose must be one of GAME_NPC, POLITICAL, FINANCIAL IMPERSONATION, ADVERTISING, CUSTOMER SUPPORT, NEWS, HEALTHCARE, UNKNOWN.',
            'confidence must be a number from 0 to 1. risks must be a string array.',
          ].join(' '),
        },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0,
      max_tokens: 220,
      enable_thinking: false,
    }),
  })
  const result = await response.json() as {
    error?: { message?: string }
    message?: string
    choices?: Array<{ message?: { content?: string } }>
  }
  if (!response.ok) throw new Error(result.error?.message || result.message || 'Policy Agent request failed.')
  const content = result.choices?.[0]?.message?.content || ''
  const parsed = JSON.parse(content) as Partial<PolicyAgentResult>
  const decisions = new Set(['allow', 'reject', 'block'])
  const purposes = new Set(['GAME_NPC', 'POLITICAL', 'FINANCIAL IMPERSONATION', 'ADVERTISING', 'CUSTOMER SUPPORT', 'NEWS', 'HEALTHCARE', 'UNKNOWN'])
  if (
    !decisions.has(parsed.decision || '')
    || !purposes.has(parsed.purpose || '')
    || typeof parsed.confidence !== 'number'
    || !Array.isArray(parsed.risks)
    || typeof parsed.explanation !== 'string'
  ) {
    throw new Error('Policy Agent returned an invalid response.')
  }
  return {
    decision: parsed.decision as PolicyAgentResult['decision'],
    purpose: parsed.purpose as PolicyAgentResult['purpose'],
    confidence: Math.max(0, Math.min(1, parsed.confidence)),
    risks: parsed.risks.filter((risk): risk is string => typeof risk === 'string').slice(0, 8),
    explanation: parsed.explanation.slice(0, 500),
    model,
  }
}

export function attachVoiceApi(middlewares: VoiceApiMiddlewareServer) {
  middlewares.use('/api/voice/sample', async (request, response) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.statusCode = 405
      response.end('Method not allowed.')
      return
    }
    if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/i.test(request.headers.host || '')) {
      response.statusCode = 404
      response.end('Local voice sample is unavailable.')
      return
    }

    try {
      const { size } = await stat(localSamplePath)
      const range = request.headers.range?.match(/^bytes=(\d*)-(\d*)$/)
      let start = 0
      let end = size - 1

      if (range) {
        start = range[1] ? Number(range[1]) : 0
        end = range[2] ? Math.min(Number(range[2]), size - 1) : size - 1
        if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) {
          response.statusCode = 416
          response.setHeader('Content-Range', `bytes */${size}`)
          response.end()
          return
        }
        response.statusCode = 206
        response.setHeader('Content-Range', `bytes ${start}-${end}/${size}`)
      }

      response.setHeader('Accept-Ranges', 'bytes')
      response.setHeader('Content-Type', 'audio/mpeg')
      response.setHeader('Content-Length', String(end - start + 1))
      response.setHeader('Cache-Control', 'no-store')
      if (request.method === 'HEAD') {
        response.end()
        return
      }

      const audio = await readFile(localSamplePath)
      response.end(audio.subarray(start, end + 1))
    } catch {
      response.statusCode = 404
      response.end('Local voice sample is unavailable.')
    }
  })

  middlewares.use('/api/voice/transcribe', async (request, response) => {
    response.setHeader('Content-Type', 'application/json; charset=utf-8')
    if (request.method !== 'POST') {
      response.statusCode = 405
      response.end(JSON.stringify({ error: 'Method not allowed.' }))
      return
    }

    try {
      const audio = await readRequestBody(request)
      validateAudioUpload(request.headers['content-type'], audio)
      response.end(JSON.stringify(await transcribeWithBailian(audio)))
    } catch (error) {
      response.statusCode = requestErrorStatus(error)
      response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Transcription failed.' }))
    }
  })

  middlewares.use('/api/voice/synthesize', async (request, response) => {
    if (request.method !== 'POST') {
      response.statusCode = 405
      response.end('Method not allowed.')
      return
    }
    try {
      let body: { text?: string; provenance?: Partial<SynthesisProvenance> }
      try {
        body = JSON.parse((await readRequestBody(request)).toString('utf8')) as typeof body
      } catch {
        throw new RequestValidationError('Request body must be valid JSON.')
      }
      const text = body.text?.trim() ?? ''
      if (!text) throw new RequestValidationError('Synthesis text is required.')
      if (text.length > 600) throw new RequestValidationError('Synthesis text exceeds the 600 character limit.')
      const provenance = body.provenance
      if (
        !provenance
        || typeof provenance.provenanceId !== 'string'
        || typeof provenance.purpose !== 'string'
        || typeof provenance.policyDecision !== 'string'
        || typeof provenance.policyModel !== 'string'
        || typeof provenance.program !== 'string'
        || typeof provenance.livenessVerified !== 'boolean'
      ) {
        throw new RequestValidationError('Synthesis provenance is incomplete.')
      }
      const result = await synthesizeWithCosyVoice(text, {
        provenanceId: provenance.provenanceId,
        purpose: provenance.purpose,
        receiptCommitment: typeof provenance.receiptCommitment === 'string' ? provenance.receiptCommitment : null,
        policyDecision: provenance.policyDecision,
        policyModel: provenance.policyModel,
        program: provenance.program,
        authorizationTx: typeof provenance.authorizationTx === 'string' ? provenance.authorizationTx : null,
        livenessVerified: provenance.livenessVerified,
        challengeCommitment: typeof provenance.challengeCommitment === 'string' ? provenance.challengeCommitment : null,
      })
      response.setHeader('Content-Type', 'audio/mpeg')
      response.setHeader('Content-Length', String(result.audio.length))
      response.setHeader('Cache-Control', 'no-store')
      response.setHeader('X-Voice-Model', result.model)
      response.setHeader('X-Voice-Characters', String(result.characters))
      response.setHeader('X-Request-Id', result.requestId)
      response.end(result.audio)
    } catch (error) {
      response.statusCode = requestErrorStatus(error)
      response.setHeader('Content-Type', 'application/json; charset=utf-8')
      response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Synthesis failed.' }))
    }
  })

  middlewares.use('/api/voice/provenance', async (request, response) => {
    response.setHeader('Content-Type', 'application/json; charset=utf-8')
    if (request.method !== 'POST') {
      response.statusCode = 405
      response.end(JSON.stringify({ error: 'Method not allowed.' }))
      return
    }
    try {
      const audio = await readRequestBody(request)
      validateAudioUpload(request.headers['content-type'], audio)
      response.end(JSON.stringify({ provenance: await readEmbeddedVoiceProvenance(audio) }))
    } catch (error) {
      response.statusCode = requestErrorStatus(error)
      response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Provenance read failed.' }))
    }
  })

  middlewares.use('/api/aleo/transaction', async (request, response) => {
    response.setHeader('Content-Type', 'application/json; charset=utf-8')
    if (request.method !== 'GET') {
      response.statusCode = 405
      response.end(JSON.stringify({ error: 'Method not allowed.' }))
      return
    }
    try {
      const requestUrl = new URL(request.url || '', 'http://localhost')
      const transactionId = requestUrl.searchParams.get('id') || ''
      if (!/^at1[0-9a-z]{50,80}$/.test(transactionId)) throw new Error('Invalid Aleo transaction ID.')
      const upstream = await fetch(`https://api.explorer.provable.com/v1/testnet/transaction/confirmed/${transactionId}`, {
        signal: AbortSignal.timeout(12_000),
      })
      if (!upstream.ok) {
        response.statusCode = upstream.status === 404 ? 404 : 502
        response.end(JSON.stringify({ error: upstream.status === 404 ? 'Transaction was not found on Aleo Testnet.' : 'Aleo transaction lookup failed.' }))
        return
      }
      const transaction = await upstream.json() as AleoConfirmedTransaction
      response.setHeader('Cache-Control', 'public, max-age=30')
      response.end(JSON.stringify({
        id: transaction.transaction?.id || transactionId,
        status: transaction.status || 'unknown',
        accepted: transaction.status === 'accepted',
        type: transaction.type || 'unknown',
        index: transaction.index ?? null,
        transitions: (transaction.transaction?.execution?.transitions || []).map((transition) => ({
          program: transition.program || '',
          function: transition.function || '',
        })),
      }))
    } catch (error) {
      response.statusCode = 400
      response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Aleo transaction lookup failed.' }))
    }
  })

  middlewares.use('/api/policy/evaluate', async (request, response) => {
    response.setHeader('Content-Type', 'application/json; charset=utf-8')
    if (request.method !== 'POST') {
      response.statusCode = 405
      response.end(JSON.stringify({ error: 'Method not allowed.' }))
      return
    }
    try {
      let body: { prompt?: string }
      try {
        body = JSON.parse((await readRequestBody(request)).toString('utf8')) as typeof body
      } catch {
        throw new RequestValidationError('Request body must be valid JSON.')
      }
      const prompt = body.prompt?.trim() || ''
      if (!prompt) throw new RequestValidationError('Policy prompt is required.')
      if (prompt.length > 600) throw new RequestValidationError('Policy prompt exceeds the 600 character limit.')
      response.setHeader('Cache-Control', 'no-store')
      response.end(JSON.stringify(await evaluatePolicyWithBailian(prompt)))
    } catch (error) {
      response.statusCode = requestErrorStatus(error)
      response.end(JSON.stringify({
        decision: 'block',
        purpose: 'UNKNOWN',
        confidence: 1,
        risks: ['POLICY_AGENT_UNAVAILABLE'],
        explanation: 'Blocked because the remote policy classifier was unavailable.',
        model: 'qwen3.5-flash',
        error: error instanceof Error ? error.message : 'Policy Agent failed.',
      }))
    }
  })
}
