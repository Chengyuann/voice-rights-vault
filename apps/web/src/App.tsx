import { type ReactNode, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useWallet } from '@provablehq/aleo-wallet-adaptor-react'
import { Network as AleoNetwork, type TransactionInput } from '@provablehq/aleo-types'
import { classifyPrompt } from './policy'
import { policyEvaluationSummary } from './policy-cases'
import {
  deleteAuditRecord,
  listAuditRecords,
  saveAuditRecord,
  updateAuditVerification,
  type AuditRecord,
} from './audit-store'
import {
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  Ban,
  Braces,
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  Database,
  Download,
  FileClock,
  EyeOff,
  FileCheck2,
  FileJson,
  Fingerprint,
  Globe2,
  Hash,
  KeyRound,
  Layers3,
  LockKeyhole,
  Mic2,
  Network,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Server,
  ShieldOff,
  ShieldCheck,
  Square,
  Sparkles,
  Trash2,
  Upload,
  UserRound,
  Volume2,
  WalletCards,
  Waves,
  X,
  Zap,
} from 'lucide-react'
import './App.css'

type Scene = 'identity' | 'license' | 'generate' | 'verify'
type AppView = 'home' | 'system' | 'demo' | 'build' | 'proof'
type DemoRole = 'creator' | 'licensee' | 'verifier'
type DemoScenario = 'authorized' | 'political' | 'financial' | 'expired' | 'exhausted' | 'revoked'
type BuildStatus = 'done' | 'partial' | 'pending'
type ExecutionMode = 'simulation' | 'wallet'
type WalletTxStatus = 'idle' | 'submitting' | 'pending' | 'accepted' | 'failed'

type WalletTxState = {
  status: WalletTxStatus
  functionName: string
  temporaryId: string
  transactionId: string
  message: string
}

type VoiceSampleState = {
  name: string
  sourceUrl: string
  source: 'none' | 'preset' | 'upload' | 'recording'
  hash: string
  transcript: string
  model: string
  durationSeconds: number
  consentMatched: boolean
  challengeId: string
  challengePhrase: string
  challengeMatched: boolean
  challengeCommitment: string
  livenessVerified: boolean
  quality: VoiceQuality
  status: 'idle' | 'transcribing' | 'ready' | 'failed'
  error: string
}

type VoiceQuality = {
  durationSeconds: number
  peak: number
  rms: number
  silenceRatio: number
  passed: boolean
  message: string
}

type VoiceTranscriptionResponse = {
  text?: string
  sha256?: string
  model?: string
  durationSeconds?: number
  error?: string
}

type VoiceManifest = {
  audio_sha256: string | null
  provenance_id: string | null
  identity_sample_sha256: string | null
  identity_asr_model: string | null
  identity_asr_verified: boolean
  identity_consent_verified: boolean
  identity_quality_passed: boolean
  identity_liveness_verified: boolean
  identity_challenge_commitment: string | null
  policy_model: string | null
  policy_decision: string | null
  policy_remote_verified: boolean
  voice_commitment: string | null
  purpose_class: string
  receipt_commitment: string | null
  public_receipt: boolean
  generated_at: string | null
  provider: string
  execution_mode: ExecutionMode
  authorization_transaction_id: string | null
  receipt_transaction_id: string | null
  transaction_id: string | null
  c2pa_status: string
}

type AleoTransactionEvidence = {
  id: string
  status: string
  accepted: boolean
  type: string
  index: number | null
  transitions: Array<{ program: string; function: string }>
  error?: string
}

type EmbeddedAudioProvenance = {
  marker: 'VoiceRights'
  version: number
  provenanceId: string
  purpose: string
  receiptCommitment: string | null
  policyDecision: string
  policyModel: string
  program: string
  authorizationTx: string | null
  livenessVerified: boolean
  challengeCommitment: string | null
} | null

type RemotePolicyAssessment = {
  decision: 'allow' | 'reject' | 'block'
  purpose: 'GAME_NPC' | 'POLITICAL' | 'FINANCIAL IMPERSONATION' | 'ADVERTISING' | 'CUSTOMER SUPPORT' | 'NEWS' | 'HEALTHCARE' | 'UNKNOWN'
  confidence: number
  risks: string[]
  explanation: string
  model: string
  error?: string
}

type VerificationCheck = {
  label: string
  value: string
  passed: boolean
  required: boolean
}

type VerificationPackageState = {
  auditRecordId: string
  audioFile: File | null
  manifest: VoiceManifest | null
  audioName: string
  manifestName: string
  computedHash: string
  embeddedProvenance: EmbeddedAudioProvenance
  status: 'idle' | 'ready' | 'checking' | 'verified' | 'failed'
  checks: VerificationCheck[]
  error: string
}

type VoiceAuditRecord = AuditRecord<VoiceManifest>

const decryptCharacters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/#'
const consentPhrase = 'Create voice identity.'
const challengeWords = ['amber', 'cedar', 'harbor', 'lantern', 'meadow', 'orbit', 'river', 'silver', 'violet', 'willow']
const aleoProgramId = import.meta.env.VITE_ALEO_PROGRAM_ID || 'voice_rights_v1.aleo'
const aleoApiUrl = (import.meta.env.VITE_ALEO_API_URL || 'https://api.explorer.provable.com/v1').replace(/\/$/, '')
const executionFee = Number(import.meta.env.VITE_ALEO_EXECUTION_FEE || 0) || undefined
const testnetExplorer = 'https://testnet.explorer.provable.com'
const testnetTransactions = [
  { label: 'DEPLOY', tx: 'at1wa9erh058vw4u6tzkwm0qm7yy2cjs0ag37vm8klgm6rvf2gfysfqx85qlr' },
  { label: 'REGISTER', tx: 'at1gctpxe4xqr0vcmxpt54xhs7edk7wem0fp0pdu7jyewrla54pjgpsd8q364' },
  { label: 'ISSUE', tx: 'at188jn3mcpa8pzz26djds2vaxr9f3rqrqgqkftfrf2ml6wrdlql5qqxgy0ff' },
  { label: 'USE', tx: 'at1zzg59ljxkrwr3c2wth7zeugspzz3gxetljat6f3ej3t0s9dtc5zqk92hxz' },
  { label: 'PUBLISH', tx: 'at1nuze2r4eu8njc0mcexe42rtt7jael58ye4r2pucm9xlclr4efufqpfsd6h' },
  { label: 'REVOKE', tx: 'at14666phn8z7ssryfsmlxn8n0xamuuvsx86krykaeqy8a0p6fhzgpssmthyc' },
] as const
const privacyEvaluationSummary = { passed: 8, total: 8 }

type DemoState = {
  identity: boolean
  license: boolean
  remaining: number
  generated: boolean
  rejected: boolean
  verified: boolean
  revoked: boolean
  receipt: boolean
  published: boolean
  ttsCalled: boolean
  lastError: string
}

const initialDemo: DemoState = {
  identity: false,
  license: false,
  remaining: 3,
  generated: false,
  rejected: false,
  verified: false,
  revoked: false,
  receipt: false,
  published: false,
  ttsCalled: false,
  lastError: '',
}

const initialWalletTx: WalletTxState = {
  status: 'idle',
  functionName: '',
  temporaryId: '',
  transactionId: '',
  message: 'No wallet transaction submitted.',
}

const initialVoiceSample: VoiceSampleState = {
  name: 'Creat voice identity.m4a',
  sourceUrl: '/api/voice/sample',
  source: 'preset',
  hash: '',
  transcript: '',
  model: '',
  durationSeconds: 0,
  consentMatched: false,
  challengeId: '',
  challengePhrase: '',
  challengeMatched: false,
  challengeCommitment: '',
  livenessVerified: false,
  quality: {
    durationSeconds: 0,
    peak: 0,
    rms: 0,
    silenceRatio: 1,
    passed: false,
    message: 'Quality check not run.',
  },
  status: 'idle',
  error: '',
}

const initialVerificationPackage: VerificationPackageState = {
  auditRecordId: '',
  audioFile: null,
  manifest: null,
  audioName: '',
  manifestName: '',
  computedHash: '',
  embeddedProvenance: null,
  status: 'idle',
  checks: [],
  error: '',
}

const scenarioPresets: Record<DemoScenario, { label: string; detail: string; prompt: string }> = {
  authorized: {
    label: 'Authorized NPC',
    detail: 'GAME_NPC / valid',
    prompt: 'Welcome, traveler. The northern gate closes at sunset.',
  },
  political: {
    label: 'Political misuse',
    detail: 'purpose mismatch',
    prompt: "Vote for candidate X. This message uses Maya's trusted voice.",
  },
  financial: {
    label: 'Financial impersonation',
    detail: 'high-risk block',
    prompt: 'This is your bank. Read the verification code to restore account access.',
  },
  expired: {
    label: 'Expired license',
    detail: 'height check fails',
    prompt: 'Welcome, traveler. The northern gate closes at sunset.',
  },
  exhausted: {
    label: 'Quota exhausted',
    detail: 'remaining = 0',
    prompt: 'Welcome, traveler. The northern gate closes at sunset.',
  },
  revoked: {
    label: 'Revoked license',
    detail: 'public mapping blocks',
    prompt: 'Welcome, traveler. The northern gate closes at sunset.',
  },
}

const planProgress: Array<{ date: string; title: string; detail: string; status: BuildStatus }> = [
  { date: '07/30', title: 'Direction + repository', detail: 'Scope, Leo 4.4.0, README and evidence structure.', status: 'done' },
  { date: '07/31', title: 'Private Record model', detail: 'Identity, License and UsageReceipt implemented.', status: 'done' },
  { date: '08/01', title: 'License consumption', detail: 'Quota decrement, replay and mismatch rejection verified.', status: 'done' },
  { date: '08/02', title: 'Revocation + public receipt', detail: 'Both transitions pass local transaction-level verification.', status: 'done' },
  { date: '08/03', title: 'Three-role Web workspace', detail: 'Creator, Licensee and Verifier browser flow.', status: 'done' },
  { date: '08/04', title: 'Aleo client + wallet', detail: 'Official adapter, Testnet execution and confirmation gate are integrated.', status: 'done' },
  { date: '08/05', title: 'Voice identity service', detail: 'Mic consent, random challenge, quality gate, ASR and hashing are live; speaker embedding remains.', status: 'partial' },
  { date: '08/06', title: 'Policy Agent', detail: 'Local 30-case gate + fail-closed Qwen3.5-Flash classification.', status: 'done' },
  { date: '08/07', title: 'CosyVoice + Provenance', detail: 'Receipt-gated cloned speech, ID3 metadata and downloadable manifest.', status: 'done' },
  { date: '08/08', title: 'End-to-end integration', detail: 'Simulation, CosyVoice, Testnet verification and local audit recovery are complete.', status: 'done' },
  { date: '08/09', title: 'Testnet evidence', detail: 'Deployment and all five transitions are accepted with Explorer links.', status: 'done' },
  { date: '08/10', title: 'Evaluation suite', detail: '11/11 Leo, 30/30 policy, and 8/8 privacy checks pass.', status: 'done' },
  { date: '08/11', title: 'Product + visual', detail: 'Responsive product narrative and failure states built.', status: 'done' },
  { date: '08/12', title: 'Submission docs', detail: 'Architecture, threat, privacy, operations, demo and checklist docs complete.', status: 'done' },
  { date: '08/13–14', title: 'Video + submission gate', detail: 'Demo recording, public links and final submission pending.', status: 'pending' },
]

function shortHash(value: string) {
  return value ? `0x${value.slice(0, 10)}...${value.slice(-6)}` : 'pending'
}

function formatAudioDuration(duration: number) {
  if (!Number.isFinite(duration) || duration <= 0) return '00:00'
  const seconds = Math.round(duration)
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}

function buildManifestSnapshot(input: {
  audioHash: string | null
  provenanceId: string | null
  sampleHash: string | null
  asrModel: string | null
  asrVerified: boolean
  consentVerified: boolean
  qualityPassed: boolean
  livenessVerified: boolean
  challengeCommitment: string | null
  policyModel: string | null
  policyDecision: string | null
  policyVerified: boolean
  voiceCommitment: string | null
  purpose: string
  receiptCommitment: string | null
  publicReceipt: boolean
  generatedAt: string | null
  provider: string
  executionMode: ExecutionMode
  authorizationTransactionId: string | null
  receiptTransactionId: string | null
}): VoiceManifest {
  return {
    audio_sha256: input.audioHash,
    provenance_id: input.provenanceId,
    identity_sample_sha256: input.sampleHash,
    identity_asr_model: input.asrModel,
    identity_asr_verified: input.asrVerified,
    identity_consent_verified: input.consentVerified,
    identity_quality_passed: input.qualityPassed,
    identity_liveness_verified: input.livenessVerified,
    identity_challenge_commitment: input.challengeCommitment,
    policy_model: input.policyModel,
    policy_decision: input.policyDecision,
    policy_remote_verified: input.policyVerified,
    voice_commitment: input.voiceCommitment,
    purpose_class: input.purpose,
    receipt_commitment: input.receiptCommitment,
    public_receipt: input.publicReceipt,
    generated_at: input.generatedAt,
    provider: input.provider,
    execution_mode: input.executionMode,
    authorization_transaction_id: input.authorizationTransactionId,
    receipt_transaction_id: input.receiptTransactionId,
    transaction_id: input.authorizationTransactionId,
    c2pa_status: input.audioHash ? 'id3-embedded' : 'not-embedded',
  }
}

function normalizeConsentText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
}

function matchesConsentPhrase(value: string) {
  return normalizeConsentText(value).includes(normalizeConsentText(consentPhrase))
}

function createLivenessChallenge() {
  const nonce = crypto.randomUUID()
  const random = crypto.getRandomValues(new Uint32Array(3))
  const words = [...random].map((value, index) => challengeWords[(value + index) % challengeWords.length])
  return {
    id: nonce,
    phrase: `${consentPhrase} ${words.join(' ')}.`,
  }
}

async function analyzeVoiceQuality(audioBytes: ArrayBuffer): Promise<VoiceQuality> {
  const audioContext = new AudioContext()
  try {
    const buffer = await audioContext.decodeAudioData(audioBytes.slice(0))
    let peak = 0
    let sumSquares = 0
    let silentSamples = 0
    let totalSamples = 0
    const silenceThreshold = 0.012

    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
      const data = buffer.getChannelData(channel)
      for (let index = 0; index < data.length; index += 1) {
        const amplitude = Math.abs(data[index])
        peak = Math.max(peak, amplitude)
        sumSquares += data[index] * data[index]
        if (amplitude < silenceThreshold) silentSamples += 1
      }
      totalSamples += data.length
    }

    const rms = totalSamples ? Math.sqrt(sumSquares / totalSamples) : 0
    const silenceRatio = totalSamples ? silentSamples / totalSamples : 1
    const durationSeconds = buffer.duration
    const failures = [
      durationSeconds < 3 ? 'Record at least 3 seconds.' : '',
      peak < 0.08 ? 'Voice level is too quiet.' : '',
      rms < 0.015 ? 'Average voice energy is too low.' : '',
      silenceRatio > 0.78 ? 'Too much silence was detected.' : '',
    ].filter(Boolean)
    return {
      durationSeconds,
      peak,
      rms,
      silenceRatio,
      passed: failures.length === 0,
      message: failures[0] || 'Duration and voice level passed.',
    }
  } finally {
    await audioContext.close()
  }
}

async function digestHex(value: ArrayBuffer | string) {
  const bytes = typeof value === 'string' ? new TextEncoder().encode(value) : value
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function digestField(value: string) {
  const digest = await digestHex(value)
  return `${BigInt(`0x${digest.slice(0, 60)}`).toString()}field`
}

function recordInput(recordname: 'VoiceIdentity' | 'VoiceLicense' | 'UsageReceipt'): TransactionInput {
  return { type: 'record', program: aleoProgramId, recordname }
}

function walletErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Wallet operation failed.'
}

function shortAddress(value: string | null) {
  return value ? `${value.slice(0, 10)}...${value.slice(-6)}` : 'not connected'
}

async function getAleoHeight() {
  const response = await fetch(`${aleoApiUrl}/testnet/block/height/latest`)
  if (!response.ok) throw new Error('Could not read Aleo Testnet height.')
  return Number(await response.text())
}

const proof = {
  deploy: 'at1wa9er...x85qlr',
  deployTx: 'at1wa9erh058vw4u6tzkwm0qm7yy2cjs0ag37vm8klgm6rvf2gfysfqx85qlr',
  use: 'at1zzg59...k92hxz',
  useTx: 'at1zzg59ljxkrwr3c2wth7zeugspzz3gxetljat6f3ej3t0s9dtc5zqk92hxz',
  tests: '11 / 11',
  constraints: '472,059',
}

const stars = Array.from({ length: 64 }, (_, index) => ({
  left: `${1 + ((index * 47) % 98)}%`,
  top: `${1 + ((index * 83) % 95)}%`,
  size: `${1 + (index % 3) * 0.55}px`,
  delay: `${-((index * 0.37) % 5)}s`,
  duration: `${3.5 + (index % 5) * 0.8}s`,
  opacity: 0.22 + ((index * 13) % 55) / 100,
}))

const scenes: Array<{
  id: Scene
  index: string
  label: string
  title: string
  body: string
}> = [
  {
    id: 'identity',
    index: '01',
    label: 'VOICE IDENTITY',
    title: 'Your voice becomes a private credential.',
    body: 'The original sample never reaches the chain. Aleo receives salted commitments and returns a private identity Record owned by the creator.',
  },
  {
    id: 'license',
    index: '02',
    label: 'PRIVATE LICENSE',
    title: 'Terms exist. Surveillance does not.',
    body: 'Buyer, purpose, expiry, policy, and remaining quota stay inside a private license. Only the creator-bound revocation key can become public.',
  },
  {
    id: 'generate',
    index: '03',
    label: 'SYNTHESIS GATE',
    title: 'No valid Record. No generated voice.',
    body: 'Every approved synthesis consumes the old license, returns a reduced-quota Record, and produces a private usage receipt before audio is released.',
  },
  {
    id: 'verify',
    index: '04',
    label: 'SELECTIVE PROOF',
    title: 'Prove permission. Reveal almost nothing.',
    body: 'A platform can verify purpose and provenance without learning the buyer, the price, the private policy, or how many uses remain.',
  },
]

function App() {
  const {
    address,
    connected,
    connecting,
    disconnecting,
    wallet,
    wallets,
    selectWallet,
    connect,
    disconnect,
    executeTransaction,
    transactionStatus,
  } = useWallet()
  const [activeView, setActiveView] = useState<AppView>('home')
  const [activeScene, setActiveScene] = useState<Scene>('identity')
  const [demo, setDemo] = useState<DemoState>(initialDemo)
  const [demoRole, setDemoRole] = useState<DemoRole>('creator')
  const [scenario, setScenario] = useState<DemoScenario>('authorized')
  const [prompt, setPrompt] = useState(scenarioPresets.authorized.prompt)
  const [sampleHash, setSampleHash] = useState('')
  const [voiceSample, setVoiceSample] = useState<VoiceSampleState>(initialVoiceSample)
  const [livenessChallenge, setLivenessChallenge] = useState(createLivenessChallenge)
  const [consumedChallengeId, setConsumedChallengeId] = useState('')
  const [voiceCommitment, setVoiceCommitment] = useState('')
  const [contentCommitment, setContentCommitment] = useState('')
  const [provenanceId, setProvenanceId] = useState('')
  const [licenseNonce, setLicenseNonce] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [generatedAudioUrl, setGeneratedAudioUrl] = useState('')
  const [generatedAudioBlob, setGeneratedAudioBlob] = useState<Blob | null>(null)
  const [generatedAudioHash, setGeneratedAudioHash] = useState('')
  const [generatedAudioDuration, setGeneratedAudioDuration] = useState(0)
  const [generatedAt, setGeneratedAt] = useState('')
  const [ttsModel, setTtsModel] = useState('')
  const [authorizationTxId, setAuthorizationTxId] = useState('')
  const [receiptTxId, setReceiptTxId] = useState('')
  const [remotePolicy, setRemotePolicy] = useState<RemotePolicyAssessment | null>(null)
  const [remotePolicyStatus, setRemotePolicyStatus] = useState<'idle' | 'checking' | 'ready' | 'failed'>('idle')
  const [verificationPackage, setVerificationPackage] = useState<VerificationPackageState>(initialVerificationPackage)
  const [auditRecords, setAuditRecords] = useState<VoiceAuditRecord[]>([])
  const [activeAuditId, setActiveAuditId] = useState('')
  const [auditStatus, setAuditStatus] = useState<'idle' | 'loading' | 'ready' | 'failed'>('idle')
  const [auditError, setAuditError] = useState('')
  const [executionMode, setExecutionMode] = useState<ExecutionMode>('simulation')
  const [walletTx, setWalletTx] = useState<WalletTxState>(initialWalletTx)
  const [connectRequested, setConnectRequested] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [isRequestingMicrophone, setIsRequestingMicrophone] = useState(false)
  const audioRef = useRef<HTMLAudioElement>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const recordingChunksRef = useRef<Blob[]>([])
  const streamRef = useRef<MediaStream | null>(null)
  const reduceMotion = useReducedMotion()
  const policy = classifyPrompt(prompt)
  const shieldWallet = wallets[0] ?? null
  const walletBusy = connecting || disconnecting || ['submitting', 'pending'].includes(walletTx.status)

  useEffect(() => {
    return () => {
      if (voiceSample.sourceUrl.startsWith('blob:')) URL.revokeObjectURL(voiceSample.sourceUrl)
    }
  }, [voiceSample.sourceUrl])

  useEffect(() => {
    void fetch('/api/voice/sample', { method: 'HEAD' }).then((response) => {
      if (response.ok) return
      setVoiceSample((current) => current.source === 'preset'
        ? {
            ...initialVoiceSample,
            name: 'No local sample selected',
            source: 'none',
            sourceUrl: '',
          }
        : current)
    }).catch(() => {
      setVoiceSample((current) => current.source === 'preset'
        ? {
            ...initialVoiceSample,
            name: 'No local sample selected',
            source: 'none',
            sourceUrl: '',
          }
        : current)
    })
  }, [])

  useEffect(() => {
    return () => {
      recorderRef.current?.stop()
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  const refreshAuditRecords = async () => {
    if (!('indexedDB' in window)) {
      setAuditStatus('failed')
      setAuditError('IndexedDB is unavailable in this browser.')
      return
    }
    setAuditStatus('loading')
    try {
      setAuditRecords(await listAuditRecords<VoiceManifest>())
      setAuditStatus('ready')
      setAuditError('')
    } catch (error) {
      setAuditStatus('failed')
      setAuditError(walletErrorMessage(error))
    }
  }

  useEffect(() => {
    void refreshAuditRecords()
  }, [])

  useEffect(() => {
    return () => {
      if (generatedAudioUrl.startsWith('blob:')) URL.revokeObjectURL(generatedAudioUrl)
    }
  }, [generatedAudioUrl])

  useEffect(() => {
    const syncFromHash = () => {
      const nextView = window.location.hash.replace('#', '') as AppView
      if (['home', 'system', 'demo', 'build', 'proof'].includes(nextView)) setActiveView(nextView)
    }
    syncFromHash()
    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [])

  useEffect(() => {
    const views: AppView[] = ['home', 'system', 'demo', 'build', 'proof']
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
      const index = views.indexOf(activeView)
      if (event.key === 'ArrowRight') setView(views[(index + 1) % views.length])
      if (event.key === 'ArrowLeft') setView(views[(index - 1 + views.length) % views.length])
      if (event.key === 'Escape') setView('home')
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeView])

  useEffect(() => {
    const onWalletError = (event: Event) => {
      const message = (event as CustomEvent<string>).detail || 'Wallet operation failed.'
      setWalletTx((current) => ({ ...current, status: 'failed', message }))
    }
    window.addEventListener('aleo-wallet-error', onWalletError)
    return () => window.removeEventListener('aleo-wallet-error', onWalletError)
  }, [])

  useEffect(() => {
    if (!connectRequested || !wallet || connected || connecting) return
    setConnectRequested(false)
    void connect(AleoNetwork.TESTNET).then(() => {
      setWalletTx({ ...initialWalletTx, message: 'Shield Wallet connected to Aleo Testnet.' })
    }).catch((error: unknown) => {
      setWalletTx({ ...initialWalletTx, status: 'failed', message: walletErrorMessage(error) })
    })
  }, [connect, connectRequested, connected, connecting, wallet])

  const setView = (view: AppView) => {
    setActiveView(view)
    window.history.pushState(null, '', `#${view}`)
  }

  const connectWallet = async () => {
    try {
      setWalletTx({ ...initialWalletTx, message: 'Opening Shield Wallet...' })
      if (!wallet && shieldWallet) {
        selectWallet(shieldWallet.adapter.name)
        setConnectRequested(true)
        return
      }
      await connect(AleoNetwork.TESTNET)
      setWalletTx({ ...initialWalletTx, message: 'Shield Wallet connected to Aleo Testnet.' })
    } catch (error) {
      setWalletTx({ ...initialWalletTx, status: 'failed', message: walletErrorMessage(error) })
    }
  }

  const disconnectWallet = async () => {
    try {
      await disconnect()
      setExecutionMode('simulation')
      setWalletTx(initialWalletTx)
    } catch (error) {
      setWalletTx({ ...initialWalletTx, status: 'failed', message: walletErrorMessage(error) })
    }
  }

  const waitForWalletTransaction = async (functionName: string, temporaryId: string) => {
    setWalletTx({
      status: 'pending',
      functionName,
      temporaryId,
      transactionId: '',
      message: 'Wallet accepted the request. Waiting for Aleo confirmation...',
    })

    for (let attempt = 0; attempt < 60; attempt += 1) {
      const result = await transactionStatus(temporaryId)
      const status = result.status.toLowerCase()
      if (status === 'accepted' || status === 'completed' || status === 'confirmed') {
        const transactionId = result.transactionId || temporaryId
        setWalletTx({
          status: 'accepted',
          functionName,
          temporaryId,
          transactionId,
          message: 'Transaction accepted on Aleo Testnet.',
        })
        return transactionId
      }
      if (status === 'failed' || status === 'rejected') {
        throw new Error(result.error || `Aleo transaction ${status}.`)
      }
      await new Promise((resolve) => window.setTimeout(resolve, 3000))
    }

    throw new Error('Timed out waiting for Aleo transaction confirmation.')
  }

  const executeWalletTransition = async (functionName: string, inputs: TransactionInput[]) => {
    if (!connected) throw new Error('Connect Shield Wallet before using live mode.')
    setWalletTx({
      status: 'submitting',
      functionName,
      temporaryId: '',
      transactionId: '',
      message: `Requesting ${functionName} approval in Shield Wallet...`,
    })
    const result = await executeTransaction({
      program: aleoProgramId,
      function: functionName,
      inputs,
      fee: executionFee,
    })
    if (!result?.transactionId) throw new Error('Wallet did not return a transaction ID.')
    return waitForWalletTransaction(functionName, result.transactionId)
  }

  const fetchVoiceSample = async () => {
    if (!voiceSample.sourceUrl) throw new Error('Record or upload a voice sample first.')
    const response = await fetch(voiceSample.sourceUrl)
    if (!response.ok) throw new Error('Voice sample could not be loaded.')
    return response.arrayBuffer()
  }

  const transcribeVoiceSample = async () => {
    setVoiceSample((current) => ({ ...current, status: 'transcribing', error: '' }))
    const audioBytes = await fetchVoiceSample()
    const quality = await analyzeVoiceQuality(audioBytes)
    if (!quality.passed) {
      setVoiceSample((current) => ({ ...current, quality, status: 'failed', error: quality.message }))
      throw new Error(quality.message)
    }
    const response = await fetch('/api/voice/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: audioBytes,
    })
    const result = await response.json() as VoiceTranscriptionResponse
    if (!response.ok) throw new Error(result.error || 'Bailian transcription failed.')
    const consentMatched = matchesConsentPhrase(result.text || '')
    const challengeMatched = Boolean(
      voiceSample.source === 'recording'
      && voiceSample.challengeId === livenessChallenge.id
      && voiceSample.challengePhrase
      && normalizeConsentText(result.text || '').includes(normalizeConsentText(voiceSample.challengePhrase)),
    )
    const challengeCommitment = voiceSample.challengeId && voiceSample.challengePhrase
      ? await digestHex(`${voiceSample.challengeId}:${voiceSample.challengePhrase}`)
      : ''
    const livenessVerified = challengeMatched && voiceSample.source === 'recording'
    const consentError = consentMatched ? '' : `Say the exact consent phrase: "${consentPhrase}"`
    setVoiceSample((current) => ({
      ...current,
      hash: result.sha256 || current.hash,
      transcript: result.text || '',
      model: result.model || '',
      durationSeconds: Number(result.durationSeconds || 0),
      consentMatched,
      challengeMatched,
      challengeCommitment,
      livenessVerified,
      quality,
      status: consentMatched ? 'ready' : 'failed',
      error: consentError,
    }))
    if (!consentMatched) throw new Error(consentError)
    return {
      audioBytes,
      hash: result.sha256 || await digestHex(audioBytes),
      transcript: result.text || '',
      model: result.model || '',
      consentMatched,
      challengeMatched,
      challengeCommitment,
      livenessVerified,
      quality,
    }
  }

  const runVoiceTranscription = async () => {
    try {
      await transcribeVoiceSample()
    } catch (error) {
      const message = walletErrorMessage(error)
      setVoiceSample((current) => ({ ...current, status: 'failed', error: message }))
    }
  }

  const resetVoiceIdentityState = () => {
    setSampleHash('')
    setVoiceCommitment('')
    setContentCommitment('')
    setProvenanceId('')
    setLicenseNonce('')
    setGeneratedAudioUrl('')
    setGeneratedAudioBlob(null)
    setGeneratedAudioHash('')
    setGeneratedAudioDuration(0)
    setGeneratedAt('')
    setTtsModel('')
    setAuthorizationTxId('')
    setReceiptTxId('')
    setVerificationPackage(initialVerificationPackage)
    setIsPlaying(false)
    audioRef.current?.pause()
    setDemo(initialDemo)
  }

  const rotateLivenessChallenge = () => {
    setLivenessChallenge(createLivenessChallenge())
    setConsumedChallengeId('')
    setVoiceSample((current) => current.source === 'recording'
      ? { ...initialVoiceSample, source: 'recording', name: current.name, sourceUrl: current.sourceUrl }
      : {
          ...current,
          challengeId: '',
          challengePhrase: '',
          challengeMatched: false,
          challengeCommitment: '',
          livenessVerified: false,
        })
    resetVoiceIdentityState()
  }

  const selectVoiceFile = (file: File | null) => {
    if (!file) return
    setVoiceSample({
      ...initialVoiceSample,
      name: file.name,
      sourceUrl: URL.createObjectURL(file),
      source: 'upload',
    })
    resetVoiceIdentityState()
  }

  const startVoiceRecording = async () => {
    setIsRequestingMicrophone(true)
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        throw new Error('Microphone recording is not supported in this browser.')
      }
      const stream = await Promise.race([
        navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } }),
        new Promise<never>((_, reject) => window.setTimeout(() => reject(new Error('Microphone permission timed out.')), 12_000)),
      ])
      const recordingChallenge = livenessChallenge
      streamRef.current = stream
      recordingChunksRef.current = []
      const recorder = new MediaRecorder(stream)
      recorderRef.current = recorder
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordingChunksRef.current.push(event.data)
      }
      recorder.onstop = () => {
        const type = recorder.mimeType || 'audio/webm'
        const blob = new Blob(recordingChunksRef.current, { type })
        stream.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        setIsRecording(false)
        setVoiceSample({
          ...initialVoiceSample,
          name: `consent-recording.${type.includes('mp4') ? 'm4a' : 'webm'}`,
          source: 'recording',
          sourceUrl: URL.createObjectURL(blob),
          challengeId: recordingChallenge.id,
          challengePhrase: recordingChallenge.phrase,
        })
        resetVoiceIdentityState()
      }
      recorder.start()
      setIsRecording(true)
    } catch (error) {
      setIsRecording(false)
      setVoiceSample((current) => ({ ...current, status: 'failed', error: walletErrorMessage(error) }))
    } finally {
      setIsRequestingMicrophone(false)
    }
  }

  const stopVoiceRecording = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop()
  }

  const createIdentity = async () => {
    setIsProcessing(true)
    try {
      const asr = voiceSample.status === 'ready'
        ? {
            audioBytes: await fetchVoiceSample(),
            hash: voiceSample.hash,
            transcript: voiceSample.transcript,
            model: voiceSample.model,
            consentMatched: voiceSample.consentMatched,
            challengeMatched: voiceSample.challengeMatched,
            challengeCommitment: voiceSample.challengeCommitment,
            livenessVerified: voiceSample.livenessVerified,
            quality: voiceSample.quality,
          }
        : await transcribeVoiceSample()
      if (!asr.quality.passed || !asr.consentMatched) throw new Error('Voice consent and quality checks must pass before registration.')
      if (executionMode === 'wallet' && !asr.livenessVerified) throw new Error('Wallet registration requires a live microphone challenge.')
      if (asr.livenessVerified && consumedChallengeId === voiceSample.challengeId) throw new Error('This live challenge has already been used. Generate a new challenge.')
      const nextSampleHash = asr.hash || await digestHex(asr.audioBytes)
      const salt = crypto.getRandomValues(new Uint32Array(4)).join('-')
      const transcriptEvidence = asr.transcript || 'NO_TRANSCRIPT'
      const qualityEvidence = `${asr.quality.durationSeconds.toFixed(2)}:${asr.quality.rms.toFixed(5)}:${asr.quality.silenceRatio.toFixed(5)}`
      const livenessEvidence = `${asr.livenessVerified}:${asr.challengeCommitment || 'NO_CHALLENGE'}`
      const nextCommitment = await digestHex(`${nextSampleHash}:${transcriptEvidence}:${qualityEvidence}:${livenessEvidence}:${salt}:VOICE_ID_V1`)
      const voiceField = await digestField(`${nextSampleHash}:${transcriptEvidence}:${qualityEvidence}:${livenessEvidence}:${salt}:VOICE_ID_V1`)
      const issuerField = await digestField(`BAILIAN_ASR:${asr.model || 'qwen-audio-3.0-asr-flash-streaming'}:${asr.livenessVerified ? 'LIVE_CHALLENGE' : 'CONSENT_ONLY'}`)
      const policyField = await digestField('GAME_NPC:ALLOW|POLITICAL:BLOCK|FINANCIAL_IMPERSONATION:BLOCK')
      setSampleHash(nextSampleHash)
      setVoiceCommitment(nextCommitment)

      if (executionMode === 'wallet') {
        await executeWalletTransition('register_voice', [voiceField, issuerField, policyField])
      }

      setDemo({ ...initialDemo, identity: true })
      if (asr.livenessVerified) setConsumedChallengeId(voiceSample.challengeId)
      setDemoRole('creator')
    } catch (error) {
      const message = walletErrorMessage(error)
      setWalletTx((current) => ({ ...current, status: 'failed', message }))
      setDemo({ ...initialDemo, rejected: true, lastError: message })
      setVoiceSample((current) => ({ ...current, status: 'failed', error: message }))
    } finally {
      setIsProcessing(false)
    }
  }

  const issueLicense = async () => {
    if (!demo.identity) return
    setIsProcessing(true)
    try {
      if (executionMode === 'wallet') {
        if (!address) throw new Error('Shield Wallet address is unavailable.')
        const currentHeight = await getAleoHeight()
        const policyField = await digestField('GAME_NPC:ALLOW|POLITICAL:BLOCK|FINANCIAL_IMPERSONATION:BLOCK')
        const nextLicenseNonce = await digestField(`license:${crypto.randomUUID()}`)
        await executeWalletTransition('issue_license', [
          recordInput('VoiceIdentity'),
          address,
          '1u8',
          policyField,
          `${currentHeight + 10_000}u32`,
          '3u32',
          nextLicenseNonce,
        ])
        setLicenseNonce(nextLicenseNonce)
      } else {
        setLicenseNonce(await digestField(`license:${crypto.randomUUID()}`))
      }
      setDemo({
        ...demo,
        license: true,
        remaining: 3,
        revoked: false,
        lastError: '',
      })
      setDemoRole('licensee')
    } catch (error) {
      const message = walletErrorMessage(error)
      setWalletTx((current) => ({ ...current, status: 'failed', message }))
      setDemo({ ...demo, rejected: true, lastError: message })
    } finally {
      setIsProcessing(false)
    }
  }

  const selectScenario = (nextScenario: DemoScenario) => {
    setGeneratedAudioUrl('')
    setGeneratedAudioBlob(null)
    setGeneratedAudioHash('')
    setGeneratedAudioDuration(0)
    setGeneratedAt('')
    setTtsModel('')
    setAuthorizationTxId('')
    setReceiptTxId('')
    setRemotePolicy(null)
    setRemotePolicyStatus('idle')
    setScenario(nextScenario)
    setPrompt(scenarioPresets[nextScenario].prompt)
    setContentCommitment('')
    setProvenanceId('')
    setIsPlaying(false)
    audioRef.current?.pause()
    setDemo((current) => ({
      ...current,
      remaining: nextScenario === 'exhausted' ? 0 : current.license ? Math.max(current.remaining, 1) : 3,
      generated: false,
      rejected: false,
      verified: false,
      receipt: false,
      published: false,
      ttsCalled: false,
      revoked: current.revoked || nextScenario === 'revoked',
      lastError: '',
    }))
  }

  const evaluateRemotePolicy = async () => {
    setRemotePolicyStatus('checking')
    const response = await fetch('/api/policy/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    })
    const result = await response.json() as RemotePolicyAssessment
    setRemotePolicy(result)
    setRemotePolicyStatus(response.ok ? 'ready' : 'failed')
    return result
  }

  const generate = async () => {
    if (!demo.identity || !demo.license) {
      setDemo({ ...demo, rejected: true, ttsCalled: false, lastError: 'No private VoiceLicense Record is available.' })
      return
    }

    setIsProcessing(true)
    try {
      const nextContentCommitment = await digestHex(`${prompt}:GAME_NPC:DEMO_RPG`)
      setContentCommitment(nextContentCommitment)
      const nextProvenanceId = await digestHex(`${nextContentCommitment}:${voiceCommitment}:GAME_NPC:VOICE_RIGHTS_V1`)
      setProvenanceId(nextProvenanceId)
      let failure = ''
      let confirmedAuthorizationTxId = authorizationTxId
      const remoteAssessment = await evaluateRemotePolicy()

      if (scenario === 'expired') failure = 'Expiry check failed: claimed height is above the private expiry.'
      else if (scenario === 'exhausted' || demo.remaining < 1) failure = 'Quota check failed: remaining_uses is zero.'
      else if (scenario === 'revoked' || demo.revoked) failure = 'Revocation check failed in public finalization.'
      else if (policy.risks.length > 0) failure = `Policy Agent blocked ${policy.risks.join(', ')} before Aleo execution.`
      else if (policy.purpose !== 'GAME_NPC') failure = `Purpose mismatch: ${policy.purpose} cannot consume a GAME_NPC license.`
      else if (remoteAssessment.decision !== 'allow') failure = `Remote Policy Agent ${remoteAssessment.decision}: ${remoteAssessment.explanation}`
      else if (remoteAssessment.purpose !== 'GAME_NPC') failure = `Remote purpose mismatch: ${remoteAssessment.purpose} cannot consume a GAME_NPC license.`

      if (failure) {
        setDemo({
          ...demo,
          generated: false,
          rejected: true,
          verified: false,
          receipt: false,
          published: false,
          ttsCalled: false,
          lastError: failure,
        })
        return
      }

      if (executionMode === 'wallet') {
        const currentHeight = await getAleoHeight()
        const contentField = await digestField(`${prompt}:GAME_NPC:DEMO_RPG`)
        const transactionId = await executeWalletTransition('use_license', [
          recordInput('VoiceLicense'),
          '1u8',
          contentField,
          `${currentHeight}u32`,
        ])
        setAuthorizationTxId(transactionId)
        confirmedAuthorizationTxId = transactionId
      }

      const ttsResponse = await fetch('/api/voice/synthesize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: prompt,
          provenance: {
            provenanceId: nextProvenanceId,
            purpose: 'GAME_NPC',
            receiptCommitment: shortHash(nextContentCommitment),
            policyDecision: remoteAssessment.decision,
            policyModel: remoteAssessment.model,
            program: aleoProgramId,
            authorizationTx: confirmedAuthorizationTxId || null,
            livenessVerified: voiceSample.livenessVerified,
            challengeCommitment: voiceSample.challengeCommitment || null,
          },
        }),
      })
      if (!ttsResponse.ok) {
        const ttsError = await ttsResponse.json().catch(() => ({})) as { error?: string }
        throw new Error(ttsError.error || 'CosyVoice synthesis failed.')
      }
      const generatedAudio = await ttsResponse.blob()
      const generatedAudioBytes = await generatedAudio.arrayBuffer()
      const finalAudioHash = await digestHex(generatedAudioBytes)
      const finalTtsModel = ttsResponse.headers.get('X-Voice-Model') || 'cosyvoice-v3.5-flash'
      const finalGeneratedAt = new Date().toISOString()
      setGeneratedAudioUrl(URL.createObjectURL(generatedAudio))
      setGeneratedAudioBlob(generatedAudio)
      setGeneratedAudioHash(finalAudioHash)
      setGeneratedAudioDuration(0)
      setGeneratedAt(finalGeneratedAt)
      setTtsModel(finalTtsModel)

      const auditManifest = buildManifestSnapshot({
        audioHash: finalAudioHash,
        provenanceId: nextProvenanceId,
        sampleHash: sampleHash || null,
        asrModel: voiceSample.model || null,
        asrVerified: voiceSample.status === 'ready',
        consentVerified: voiceSample.consentMatched,
        qualityPassed: voiceSample.quality.passed,
        livenessVerified: voiceSample.livenessVerified,
        challengeCommitment: voiceSample.challengeCommitment || null,
        policyModel: remoteAssessment.model,
        policyDecision: remoteAssessment.decision,
        policyVerified: remoteAssessment.decision === 'allow' && remoteAssessment.purpose === 'GAME_NPC',
        voiceCommitment: voiceCommitment || null,
        purpose: 'GAME_NPC',
        receiptCommitment: shortHash(nextContentCommitment),
        publicReceipt: false,
        generatedAt: finalGeneratedAt,
        provider: finalTtsModel,
        executionMode,
        authorizationTransactionId: confirmedAuthorizationTxId || null,
        receiptTransactionId: null,
      })
      try {
        await saveAuditRecord<VoiceManifest>({
          id: nextProvenanceId,
          createdAt: new Date().toISOString(),
          audio: generatedAudio,
          audioName: 'voice-rights-output.mp3',
          manifest: auditManifest,
          audioHash: finalAudioHash,
          provenanceId: nextProvenanceId,
          purpose: 'GAME_NPC',
          provider: finalTtsModel,
          executionMode,
          authorizationTransactionId: confirmedAuthorizationTxId || null,
          receiptTransactionId: null,
          verificationStatus: 'unverified',
          verifiedAt: null,
        })
        setActiveAuditId(nextProvenanceId)
        await refreshAuditRecords()
      } catch (error) {
        setAuditStatus('failed')
        setAuditError(walletErrorMessage(error))
      }

      setDemo({
        ...demo,
        remaining: demo.remaining - 1,
        generated: true,
        rejected: false,
        verified: false,
        receipt: true,
        published: false,
        ttsCalled: true,
        lastError: '',
      })
    } catch (error) {
      const message = walletErrorMessage(error)
      setWalletTx((current) => ({ ...current, status: 'failed', message }))
      setDemo({
        ...demo,
        generated: false,
        rejected: true,
        verified: false,
        receipt: false,
        published: false,
        ttsCalled: false,
        lastError: message,
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const revoke = async () => {
    if (!demo.license) return
    setIsProcessing(true)
    try {
      if (executionMode === 'wallet') {
        if (!licenseNonce) throw new Error('The current license nonce is unavailable. Reissue the license before revoking.')
        await executeWalletTransition('revoke_license', [
          recordInput('VoiceIdentity'),
          licenseNonce,
        ])
      }
      setScenario('revoked')
      setGeneratedAudioUrl('')
      setGeneratedAudioBlob(null)
      setGeneratedAudioHash('')
      setGeneratedAudioDuration(0)
      setGeneratedAt('')
      setProvenanceId('')
      setTtsModel('')
      setDemo({
        ...demo,
        revoked: true,
        generated: false,
        rejected: false,
        verified: false,
        receipt: false,
        published: false,
        ttsCalled: false,
        lastError: '',
      })
    } catch (error) {
      const message = walletErrorMessage(error)
      setWalletTx((current) => ({ ...current, status: 'failed', message }))
      setDemo({ ...demo, rejected: true, lastError: message })
    } finally {
      setIsProcessing(false)
    }
  }

  const verifyPackage = async (nextPackage = verificationPackage) => {
    if (!nextPackage.audioFile || !nextPackage.manifest) {
      setVerificationPackage((current) => ({
        ...current,
        status: 'failed',
        error: 'Select both an audio file and a VoiceRights manifest.',
      }))
      return
    }

    setVerificationPackage((current) => ({ ...current, status: 'checking', error: '', checks: [] }))
    try {
      const audioBytes = await nextPackage.audioFile.arrayBuffer()
      const computedHash = await digestHex(audioBytes)
      const manifest = nextPackage.manifest
      const provenanceResponse = await fetch('/api/voice/provenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/octet-stream' },
        body: audioBytes,
      })
      const provenanceResult = await provenanceResponse.json() as { provenance?: EmbeddedAudioProvenance }
      const embeddedProvenance = provenanceResult.provenance || null
      const authorizationId = manifest.authorization_transaction_id || manifest.transaction_id
      const receiptId = manifest.receipt_transaction_id
      const fetchTransactionEvidence = async (transactionId: string) => {
        const response = await fetch(`/api/aleo/transaction?id=${encodeURIComponent(transactionId)}`)
        const evidence = await response.json() as AleoTransactionEvidence
        if (!response.ok) return { ...evidence, id: transactionId, accepted: false, status: evidence.error || 'lookup failed', type: '', index: null, transitions: [] }
        return evidence
      }
      const [authorizationEvidence, receiptEvidence] = await Promise.all([
        authorizationId ? fetchTransactionEvidence(authorizationId) : Promise.resolve(null),
        receiptId ? fetchTransactionEvidence(receiptId) : Promise.resolve(null),
      ])
      const authorizationTransition = authorizationEvidence?.transitions.some((transition) => (
        transition.program === aleoProgramId && transition.function === 'use_license'
      )) ?? false
      const receiptTransition = receiptEvidence?.transitions.some((transition) => (
        transition.program === aleoProgramId && transition.function === 'publish_receipt'
      )) ?? false
      const checks: VerificationCheck[] = [
        {
          label: 'Audio SHA-256',
          value: computedHash === manifest.audio_sha256 ? 'MATCH' : 'MISMATCH',
          passed: computedHash === manifest.audio_sha256,
          required: true,
        },
        {
          label: 'Receipt commitment',
          value: manifest.receipt_commitment ? 'PRESENT' : 'MISSING',
          passed: Boolean(manifest.receipt_commitment),
          required: true,
        },
        {
          label: 'Licensed purpose',
          value: manifest.purpose_class || 'MISSING',
          passed: manifest.purpose_class === 'GAME_NPC',
          required: true,
        },
        {
          label: 'Voice provider',
          value: manifest.provider || 'MISSING',
          passed: manifest.provider.startsWith('cosyvoice-'),
          required: true,
        },
        {
          label: 'Identity consent',
          value: manifest.identity_consent_verified ? 'VERIFIED' : 'MISSING',
          passed: manifest.identity_consent_verified,
          required: true,
        },
        {
          label: 'Sample quality',
          value: manifest.identity_quality_passed ? 'PASSED' : 'FAILED',
          passed: manifest.identity_quality_passed,
          required: true,
        },
        {
          label: 'Live challenge',
          value: manifest.identity_liveness_verified ? 'VERIFIED' : manifest.execution_mode === 'wallet' ? 'MISSING' : 'CONSENT ONLY',
          passed: manifest.identity_liveness_verified,
          required: manifest.execution_mode === 'wallet',
        },
        {
          label: 'Remote policy',
          value: manifest.policy_remote_verified ? `${manifest.policy_decision || 'ALLOW'} / VERIFIED` : 'MISSING OR REJECTED',
          passed: manifest.policy_remote_verified,
          required: true,
        },
        {
          label: 'Embedded provenance',
          value: embeddedProvenance?.marker === 'VoiceRights' ? 'PRESENT' : 'MISSING',
          passed: embeddedProvenance?.marker === 'VoiceRights',
          required: true,
        },
        {
          label: 'Provenance ID',
          value: embeddedProvenance?.provenanceId === manifest.provenance_id ? 'MATCH' : 'MISMATCH',
          passed: Boolean(embeddedProvenance?.provenanceId && embeddedProvenance.provenanceId === manifest.provenance_id),
          required: true,
        },
        {
          label: 'Embedded purpose',
          value: embeddedProvenance?.purpose || 'MISSING',
          passed: embeddedProvenance?.purpose === manifest.purpose_class,
          required: true,
        },
        {
          label: 'Embedded receipt',
          value: embeddedProvenance?.receiptCommitment === manifest.receipt_commitment ? 'MATCH' : 'MISMATCH',
          passed: embeddedProvenance?.receiptCommitment === manifest.receipt_commitment,
          required: true,
        },
        {
          label: 'Embedded liveness',
          value: embeddedProvenance?.livenessVerified === manifest.identity_liveness_verified ? 'MATCH' : 'MISMATCH',
          passed: embeddedProvenance?.livenessVerified === manifest.identity_liveness_verified,
          required: true,
        },
        {
          label: 'Challenge commitment',
          value: embeddedProvenance?.challengeCommitment === manifest.identity_challenge_commitment ? 'MATCH' : 'MISMATCH',
          passed: embeddedProvenance?.challengeCommitment === manifest.identity_challenge_commitment,
          required: true,
        },
        {
          label: 'Aleo authorization',
          value: authorizationEvidence
            ? authorizationEvidence.accepted && authorizationTransition ? 'ACCEPTED / USE_LICENSE' : 'INVALID TRANSACTION'
            : 'NOT INCLUDED',
          passed: Boolean(authorizationEvidence?.accepted && authorizationTransition),
          required: Boolean(authorizationId),
        },
        {
          label: 'Receipt publication',
          value: receiptEvidence
            ? receiptEvidence.accepted && receiptTransition ? 'ACCEPTED / PUBLISH_RECEIPT' : 'INVALID TRANSACTION'
            : manifest.public_receipt ? 'MISSING TRANSACTION' : 'PRIVATE ONLY',
          passed: Boolean(receiptEvidence?.accepted && receiptTransition),
          required: Boolean(receiptId || manifest.public_receipt),
        },
        {
          label: 'Public commitment',
          value: manifest.public_receipt ? 'PUBLISHED' : 'PRIVATE ONLY',
          passed: manifest.public_receipt,
          required: false,
        },
      ]
      const verified = checks.filter((check) => check.required).every((check) => check.passed)
      setVerificationPackage({
        ...nextPackage,
        computedHash,
        embeddedProvenance,
        status: verified ? 'verified' : 'failed',
        checks,
        error: verified ? '' : 'The verification package failed one or more required checks.',
      })
      if (nextPackage.auditRecordId) {
        await updateAuditVerification(nextPackage.auditRecordId, verified ? 'verified' : 'failed')
        await refreshAuditRecords()
      }
      setDemo({ ...demo, verified, lastError: verified ? '' : 'External package verification failed.' })
      setDemoRole('verifier')
    } catch (error) {
      const message = walletErrorMessage(error)
      setVerificationPackage((current) => ({ ...current, status: 'failed', error: message }))
      setDemo({ ...demo, verified: false, lastError: message })
    }
  }

  const selectVerificationAudio = (file: File | null) => {
    setDemo((current) => ({ ...current, verified: false }))
    setVerificationPackage((current) => ({
      ...current,
      auditRecordId: '',
      audioFile: file,
      audioName: file?.name || '',
      computedHash: '',
      embeddedProvenance: null,
      checks: [],
      status: file && current.manifest ? 'ready' : 'idle',
      error: '',
    }))
  }

  const selectVerificationManifest = async (file: File | null) => {
    if (!file) return
    setDemo((current) => ({ ...current, verified: false }))
    setVerificationPackage((current) => ({
      ...current,
      manifest: null,
      manifestName: file.name,
      embeddedProvenance: null,
      checks: [],
      status: 'checking',
      error: '',
    }))
    try {
      const parsed = JSON.parse(await file.text()) as VoiceManifest
      if (
        typeof parsed !== 'object'
        || parsed === null
        || typeof parsed.audio_sha256 !== 'string'
        || typeof parsed.purpose_class !== 'string'
        || typeof parsed.provider !== 'string'
        || !('receipt_commitment' in parsed)
      ) {
        throw new Error('This is not a valid VoiceRights manifest.')
      }
      setVerificationPackage((current) => ({
        ...current,
        manifest: parsed,
        manifestName: file.name,
        embeddedProvenance: null,
        checks: [],
        status: current.audioFile ? 'ready' : 'idle',
        error: '',
      }))
    } catch (error) {
      setVerificationPackage((current) => ({
        ...current,
        manifest: null,
        manifestName: file.name,
        embeddedProvenance: null,
        checks: [],
        status: 'failed',
        error: walletErrorMessage(error),
      }))
    }
  }

  const useCurrentVerificationPackage = () => {
    if (!generatedAudioBlob || !manifest.audio_sha256) return
    const nextPackage: VerificationPackageState = {
      auditRecordId: provenanceId,
      audioFile: new File([generatedAudioBlob], 'voice-rights-output.mp3', { type: generatedAudioBlob.type || 'audio/mpeg' }),
      manifest,
      audioName: 'voice-rights-output.mp3',
      manifestName: 'voice-rights-manifest.json',
      computedHash: '',
      embeddedProvenance: null,
      status: 'ready',
      checks: [],
      error: '',
    }
    setVerificationPackage(nextPackage)
    setActiveAuditId(provenanceId)
    setDemoRole('verifier')
    void verifyPackage(nextPackage)
  }

  const loadAuditRecord = (record: VoiceAuditRecord) => {
    const nextPackage: VerificationPackageState = {
      auditRecordId: record.id,
      audioFile: new File([record.audio], record.audioName, { type: record.audio.type || 'audio/mpeg' }),
      manifest: record.manifest,
      audioName: record.audioName,
      manifestName: 'voice-rights-manifest.json',
      computedHash: '',
      embeddedProvenance: null,
      status: 'ready',
      checks: [],
      error: '',
    }
    setActiveAuditId(record.id)
    setVerificationPackage(nextPackage)
    setDemoRole('verifier')
    void verifyPackage(nextPackage)
  }

  const downloadAuditAudio = (record: VoiceAuditRecord) => {
    const url = URL.createObjectURL(record.audio)
    const link = document.createElement('a')
    link.href = url
    link.download = record.audioName
    link.click()
    URL.revokeObjectURL(url)
  }

  const downloadAuditManifest = (record: VoiceAuditRecord) => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(record.manifest, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `voice-rights-manifest-${record.id.slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const removeAuditRecord = async (record: VoiceAuditRecord) => {
    try {
      await deleteAuditRecord(record.id)
      if (activeAuditId === record.id) {
        setActiveAuditId('')
        setVerificationPackage(initialVerificationPackage)
      }
      await refreshAuditRecords()
    } catch (error) {
      setAuditStatus('failed')
      setAuditError(walletErrorMessage(error))
    }
  }

  const publishReceipt = async () => {
    if (!demo.receipt) return
    setIsProcessing(true)
    try {
      if (executionMode === 'wallet') {
        const transactionId = await executeWalletTransition('publish_receipt', [recordInput('UsageReceipt')])
        setReceiptTxId(transactionId)
        if (provenanceId && generatedAudioBlob && generatedAudioHash) {
          const updatedManifest = buildManifestSnapshot({
            audioHash: generatedAudioHash,
            provenanceId,
            sampleHash: sampleHash || null,
            asrModel: voiceSample.model || null,
            asrVerified: voiceSample.status === 'ready',
            consentVerified: voiceSample.consentMatched,
            qualityPassed: voiceSample.quality.passed,
            livenessVerified: voiceSample.livenessVerified,
            challengeCommitment: voiceSample.challengeCommitment || null,
            policyModel: remotePolicy?.model || null,
            policyDecision: remotePolicy?.decision || null,
            policyVerified: remotePolicy?.decision === 'allow' && remotePolicy.purpose === 'GAME_NPC',
            voiceCommitment: voiceCommitment || null,
            purpose: 'GAME_NPC',
            receiptCommitment: shortHash(contentCommitment),
            publicReceipt: true,
            generatedAt: generatedAt || new Date().toISOString(),
            provider: ttsModel || 'cosyvoice-v3.5-flash',
            executionMode,
            authorizationTransactionId: authorizationTxId || null,
            receiptTransactionId: transactionId,
          })
          await saveAuditRecord<VoiceManifest>({
            id: provenanceId,
            createdAt: generatedAt || new Date().toISOString(),
            audio: generatedAudioBlob,
            audioName: 'voice-rights-output.mp3',
            manifest: updatedManifest,
            audioHash: generatedAudioHash,
            provenanceId,
            purpose: 'GAME_NPC',
            provider: ttsModel || 'cosyvoice-v3.5-flash',
            executionMode,
            authorizationTransactionId: authorizationTxId || null,
            receiptTransactionId: transactionId,
            verificationStatus: verificationPackage.status === 'verified' ? 'verified' : 'unverified',
            verifiedAt: verificationPackage.status === 'verified' ? new Date().toISOString() : null,
          })
          await refreshAuditRecords()
        }
      }
      setDemo({ ...demo, published: true, lastError: '' })
    } catch (error) {
      const message = walletErrorMessage(error)
      setWalletTx((current) => ({ ...current, status: 'failed', message }))
      setDemo({ ...demo, published: false, lastError: message })
    } finally {
      setIsProcessing(false)
    }
  }

  const reset = () => {
    setDemo(initialDemo)
    setDemoRole('creator')
    setScenario('authorized')
    setPrompt(scenarioPresets.authorized.prompt)
    setSampleHash('')
    setVoiceSample(initialVoiceSample)
    setLivenessChallenge(createLivenessChallenge())
    setConsumedChallengeId('')
    setVoiceCommitment('')
    setContentCommitment('')
    setProvenanceId('')
    setLicenseNonce('')
    setIsProcessing(false)
    setIsPlaying(false)
    setGeneratedAudioUrl('')
    setGeneratedAudioBlob(null)
    setGeneratedAudioHash('')
    setGeneratedAudioDuration(0)
    setGeneratedAt('')
    setTtsModel('')
    setAuthorizationTxId('')
    setReceiptTxId('')
    setRemotePolicy(null)
    setRemotePolicyStatus('idle')
    setVerificationPackage(initialVerificationPackage)
    setWalletTx(initialWalletTx)
    audioRef.current?.pause()
  }

  const toggleAudio = () => {
    if (!audioRef.current) return
    if (audioRef.current.paused) {
      void audioRef.current.play()
      setIsPlaying(true)
    } else {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }

  const manifest = buildManifestSnapshot({
    audioHash: demo.generated ? generatedAudioHash || null : null,
    provenanceId: demo.generated ? provenanceId || null : null,
    sampleHash: sampleHash || null,
    asrModel: voiceSample.model || null,
    asrVerified: voiceSample.status === 'ready',
    consentVerified: voiceSample.consentMatched,
    qualityPassed: voiceSample.quality.passed,
    livenessVerified: voiceSample.livenessVerified,
    challengeCommitment: voiceSample.challengeCommitment || null,
    policyModel: remotePolicy?.model || null,
    policyDecision: remotePolicy?.decision || null,
    policyVerified: remotePolicy?.decision === 'allow' && remotePolicy.purpose === 'GAME_NPC',
    voiceCommitment: voiceCommitment || null,
    purpose: policy.purpose,
    receiptCommitment: demo.receipt ? shortHash(contentCommitment) : null,
    publicReceipt: executionMode === 'wallet' && Boolean(receiptTxId),
    generatedAt: demo.generated ? generatedAt || null : null,
    provider: demo.ttsCalled ? ttsModel || 'cosyvoice-v3.5-flash' : 'not-called',
    executionMode,
    authorizationTransactionId: authorizationTxId || null,
    receiptTransactionId: receiptTxId || null,
  })

  const downloadManifest = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'voice-rights-manifest.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  const downloadGeneratedAudio = () => {
    if (!generatedAudioBlob) return
    const url = URL.createObjectURL(generatedAudioBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'voice-rights-output.mp3'
    link.click()
    URL.revokeObjectURL(url)
  }

  const viewNumber = String(['home', 'system', 'demo', 'build', 'proof'].indexOf(activeView) + 1).padStart(2, '0')

  return (
    <main className={`app-shell view-theme-${activeView}`}>
      <nav className="site-nav">
        <button className="wordmark" type="button" onClick={() => setView('home')} aria-label="VoiceRights Vault home">
          <span className="wordmark-dot" />
          VoiceRights
        </button>
        <div className="nav-center">
          <button className={activeView === 'system' ? 'active' : ''} type="button" onClick={() => setView('system')}>System</button>
          <button className={activeView === 'demo' ? 'active' : ''} type="button" onClick={() => setView('demo')}>Live demo</button>
          <button className={activeView === 'build' ? 'active' : ''} type="button" onClick={() => setView('build')}>Build plan</button>
          <button className={activeView === 'proof' ? 'active' : ''} type="button" onClick={() => setView('proof')}>Proof</button>
        </div>
        <button className="nav-cta" type="button" onClick={() => setView('demo')}>
          Enter vault <ArrowUpRight size={15} />
        </button>
      </nav>

      <div className="view-stage">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeView}
            className={`view-panel view-${activeView}`}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.1, rotateX: -5, y: '8%', filter: 'blur(12px)' }}
            animate={{ opacity: 1, scale: 1, rotateX: 0, y: 0, filter: 'blur(0px)' }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.9, rotateX: 5, y: '-8%', filter: 'blur(10px)' }}
            transition={{ duration: reduceMotion ? 0.12 : 0.62, ease: [0.16, 1, 0.3, 1] }}
          >
      {activeView === 'home' && (
      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="hero-kicker">
            <DecryptedText text="AI VOICE RIGHTS" />
            <DecryptedText text="ALEO PRIVATE RECORDS" />
          </p>
          <h1>
            Your voice.
            <br />
            <em>On your terms.</em>
          </h1>
          <p className="hero-intro">
            A private licensing system for synthetic voice. Issue permission,
            meter every use, revoke access, and prove authorization without
            exposing the contract.
          </p>
        </div>

        <div className="hero-object" aria-label="Abstract private voice identity visualization">
          <div className="orbital orbital-one" />
          <div className="orbital orbital-two" />
          <div className="voice-core">
            <div className="voice-core-ring">
              <Waves size={58} strokeWidth={1.25} />
            </div>
            <span>VOICE / 001</span>
          </div>
          <div className="hero-float hero-float-a">
            <span>OWNER</span>
            <strong>PRIVATE</strong>
          </div>
          <div className="hero-float hero-float-b">
            <span>USES</span>
            <strong>02</strong>
          </div>
          <div className="hero-float hero-float-c">
            <LockKeyhole size={15} />
            <span>ENCRYPTED</span>
          </div>
          <MiniWidget className="hero-mini hero-mini-a" label="WATERMARK" value="BOUND" icon={<ShieldCheck size={15} />} />
          <MiniWidget className="hero-mini hero-mini-b" label="REVOKE" value="READY" icon={<KeyRound size={15} />} />
          <MiniWidget className="hero-mini hero-mini-c" label="DISCLOSURE" value="MINIMAL" icon={<FileCheck2 size={15} />} />
        </div>

        <div className="module-launcher">
          <ModuleButton index="01" label="Private system" detail="Four Aleo privacy stages" icon={<Layers3 size={19} />} onClick={() => setView('system')} />
          <ModuleButton index="02" label="Live workspace" detail="Creator, licensee, verifier" icon={<Zap size={19} />} onClick={() => setView('demo')} />
          <ModuleButton index="03" label="Build plan" detail="Milestones and blockers" icon={<Clock3 size={19} />} onClick={() => setView('build')} />
          <ModuleButton index="04" label="Proof evidence" detail="Tests and transactions" icon={<ShieldCheck size={19} />} onClick={() => setView('proof')} />
        </div>
      </section>
      )}

      {activeView === 'system' && (
      <section className="system" id="system">
        <aside className="system-index">
          <span className="system-index-title">THE PRIVATE FLOW</span>
          <div className="system-index-list">
            {scenes.map((scene) => (
              <button
                type="button"
                key={scene.id}
                className={activeScene === scene.id ? 'active' : ''}
                onClick={() => setActiveScene(scene.id)}
              >
                <span>{scene.index}</span>
                {scene.label}
              </button>
            ))}
          </div>
          <div className="index-proof">
            <ShieldCheck size={18} />
            <span>Public Testnet deployment and five transitions accepted.</span>
          </div>
          <MiniWidget className="index-mini" label="FLOW HEALTH" value="4 / 4 LIVE" icon={<BadgeCheck size={15} />} />
        </aside>

        <div className="system-scenes">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeScene}
              className="scene-transition"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: 32 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -24 }}
              transition={{ duration: reduceMotion ? 0.12 : 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              {activeScene === 'identity' && <IdentityScene />}
              {activeScene === 'license' && <LicenseScene />}
              {activeScene === 'generate' && <GenerateScene />}
              {activeScene === 'verify' && <VerifyScene />}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
      )}

      {activeView === 'demo' && (
      <section className="demo-section" id="demo">
        <div className="section-heading">
          <p><DecryptedText text="THREE-ROLE WORKSPACE" /></p>
          <h2 className="mixed-title">
            <span className="type-display">Operate</span>{' '}
            <span className="type-editorial">the</span>{' '}
            <span className="type-body">permission</span>{' '}
            <span className="type-art">layer.</span>
          </h2>
          <button className="reset-button" type="button" onClick={reset}>
            <RotateCcw size={15} /> Reset demo
          </button>
        </div>

        <div className="workspace-controls">
          <div className="role-switcher" aria-label="Demo role">
            <button className={demoRole === 'creator' ? 'active' : ''} type="button" onClick={() => setDemoRole('creator')}>
              <UserRound size={17} /><span>Creator</span><small>Own and revoke</small>
            </button>
            <button className={demoRole === 'licensee' ? 'active' : ''} type="button" onClick={() => setDemoRole('licensee')}>
              <WalletCards size={17} /><span>Licensee</span><small>Authorize and generate</small>
            </button>
            <button className={demoRole === 'verifier' ? 'active' : ''} type="button" onClick={() => setDemoRole('verifier')}>
              <ShieldCheck size={17} /><span>Verifier</span><small>Check minimal proof</small>
            </button>
          </div>

          <div className={`runtime-console ${connected ? 'connected' : ''} ${walletTx.status}`}>
            <div className="runtime-mode-control" aria-label="Aleo execution mode">
              <button
                className={executionMode === 'simulation' ? 'active' : ''}
                type="button"
                onClick={() => setExecutionMode('simulation')}
                title="Use deterministic browser simulation"
              >
                <Radio size={15} /><span>Simulation</span>
              </button>
              <button
                className={executionMode === 'wallet' ? 'active' : ''}
                type="button"
                onClick={() => setExecutionMode('wallet')}
                title="Use Shield Wallet on Aleo Testnet"
              >
                <WalletCards size={15} /><span>Wallet</span>
              </button>
            </div>
            <div className="wallet-identity">
              <WalletCards size={17} />
              <div>
                <strong>{connected ? shortAddress(address) : shieldWallet ? 'Shield Wallet' : 'Wallet unavailable'}</strong>
                <span>{connected ? 'Testnet / voice_rights_v1.aleo' : 'Connect for live execution'}</span>
              </div>
            </div>
            <div className="wallet-actions">
              {connected ? (
                <button type="button" disabled={walletBusy || isProcessing} onClick={() => void disconnectWallet()}>
                  <X size={15} /> Disconnect
                </button>
              ) : (
                <button type="button" disabled={walletBusy || !shieldWallet} onClick={() => void connectWallet()}>
                  <WalletCards size={15} /> {connecting ? 'Connecting...' : 'Connect'}
                </button>
              )}
            </div>
            <div className="runtime-transaction">
              <span className={`tx-dot ${walletTx.status}`} />
              <div>
                <strong>{walletTx.functionName || 'TRANSACTION STATUS'}</strong>
                <span>{walletTx.message}</span>
              </div>
              {(walletTx.transactionId || walletTx.temporaryId) && (
                <code>{shortHash(walletTx.transactionId || walletTx.temporaryId)}</code>
              )}
            </div>
          </div>
        </div>

        <div className="evidence-strip">
          <button className="evidence-program" type="button" onClick={() => window.open(`${testnetExplorer}/program/${aleoProgramId}`, '_blank', 'noopener,noreferrer')}>
            <span className="evidence-live"><i /> PUBLIC TESTNET</span>
            <strong>{aleoProgramId}</strong>
            <small>6 accepted transactions <ArrowUpRight size={13} /></small>
          </button>
          <div className="evidence-transactions" aria-label="Accepted Testnet transactions">
            {testnetTransactions.map((item) => (
              <button key={item.label} type="button" onClick={() => window.open(`${testnetExplorer}/transaction/${item.tx}`, '_blank', 'noopener,noreferrer')} title={`Open ${item.label.toLowerCase()} transaction`}>
                <span>{item.label}</span><code>{item.tx.slice(0, 8)}…{item.tx.slice(-6)}</code>
              </button>
            ))}
          </div>
          <div className="evaluation-scores">
            <div><span>POLICY REGRESSION</span><strong>{policyEvaluationSummary.passed}/{policyEvaluationSummary.total}</strong></div>
            <div><span>PRIVACY CHECKS</span><strong>{privacyEvaluationSummary.passed}/{privacyEvaluationSummary.total}</strong></div>
          </div>
        </div>

        <div className="demo-frame">
          <div className="demo-sidebar">
            <div className="demo-brand"><Mic2 size={21} /><span>VAULT / {executionMode === 'wallet' ? 'WALLET MODE' : 'LOCAL MODE'}</span></div>
            <DemoStep number="01" label="Voice identity" active={!demo.identity} done={demo.identity} />
            <DemoStep number="02" label="Private license" active={demo.identity && !demo.license} done={demo.license} />
            <DemoStep number="03" label="Receipt gate" active={demo.license && !demo.generated} done={demo.generated} />
            <DemoStep number="04" label="Selective proof" active={demo.receipt && !demo.verified} done={demo.verified} />
            <div className="runtime-modes">
              <div><Radio size={14} /><span>Browser simulation</span><strong>{executionMode === 'simulation' ? 'ACTIVE' : 'STANDBY'}</strong></div>
              <div><Network size={14} /><span>Public Testnet flow</span><strong>6 ACCEPTED</strong></div>
              <div><WalletCards size={14} /><span>Wallet execution</span><strong>{connected ? 'CONNECTED' : 'READY'}</strong></div>
            </div>
            <div className="privacy-note">
              <LockKeyhole size={16} />
              {executionMode === 'wallet'
                ? 'Private Records are selected inside Shield Wallet. The page receives transaction status only.'
                : 'Demo values are synthetic. No wallet key or private Record is loaded in the browser.'}
            </div>
          </div>

          <div className="demo-main">
            <div className="demo-toolbar">
              <span>{demoRole.toUpperCase()} WORKSPACE</span>
              <span className="online-dot">{executionMode === 'wallet' ? connected ? 'SHIELD WALLET CONNECTED' : 'WALLET MODE / DISCONNECTED' : 'LOCAL PROOF EVIDENCE READY'}</span>
            </div>

            <div className="demo-content">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={demoRole}
                  className="role-transition"
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                  transition={{ duration: reduceMotion ? 0.1 : 0.24, ease: [0.22, 1, 0.36, 1] }}
                >
              {demoRole === 'creator' && (
                <div className="workspace-view">
                  <div className="workspace-heading">
                    <div>
                      <p className="micro-label">CREATOR STUDIO / MAYA ROOKE</p>
                      <h3>Bind a <span className="type-editorial">voice.</span> Set the <span className="type-art">boundaries.</span></h3>
                    </div>
                    <span className={`workspace-state ${demo.identity ? 'ready' : ''}`}>
                      {demo.identity ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                      {demo.identity ? 'Identity ready' : 'Awaiting identity'}
                    </span>
                  </div>

                  <div className="creator-grid">
                    <div className="work-panel voice-sample-panel">
                      <div className="panel-title"><Mic2 size={17} /><span>Creator voice sample</span><small>LOCAL + BAILIAN ASR</small></div>
                      <div className="consent-phrase">
                        <div>
                          <span>ONE-TIME LIVE CHALLENGE {executionMode === 'simulation' ? '/ OPTIONAL IN SIMULATION' : '/ WALLET REQUIRED'}</span>
                          <strong>{livenessChallenge.phrase}</strong>
                        </div>
                        <button type="button" title="Generate a new live challenge" aria-label="Generate new live challenge" disabled={isRecording || isRequestingMicrophone} onClick={rotateLivenessChallenge}>
                          <RotateCcw size={15} />
                        </button>
                      </div>
                      <div className={`sample-wave ${voiceSample.status}`} aria-hidden="true">{Array.from({ length: 30 }, (_, index) => <i key={index} />)}</div>
                      <div className="voice-file-row">
                        <div>
                          <strong>{voiceSample.name}</strong>
                          <span>{voiceSample.durationSeconds ? `${voiceSample.durationSeconds}s recognized` : voiceSample.source === 'recording' ? 'recorded locally' : voiceSample.source === 'none' ? 'record or upload a sample' : '3.9s local sample'} · raw audio stays off-chain</span>
                        </div>
                        <label className="voice-file-button">
                          <input type="file" accept="audio/*,.m4a" onChange={(event) => selectVoiceFile(event.target.files?.[0] || null)} />
                          <Upload size={15} /> Replace
                        </label>
                      </div>
                      <div className="recording-controls">
                        <button type="button" className={isRecording ? 'recording active' : 'recording'} disabled={isProcessing || isRequestingMicrophone} onClick={() => isRecording ? stopVoiceRecording() : void startVoiceRecording()}>
                          {isRecording ? <Square size={15} /> : <Mic2 size={15} />}
                          {isRecording ? 'Stop recording' : isRequestingMicrophone ? 'Requesting microphone...' : 'Record live challenge'}
                        </button>
                        <span>{isRecording ? 'Speak the full challenge now.' : executionMode === 'wallet' ? 'Live microphone proof required.' : 'Preset consent or optional live proof.'}</span>
                      </div>
                      {voiceSample.sourceUrl
                        ? <audio className="voice-preview" controls preload="metadata" src={voiceSample.sourceUrl} />
                        : <div className="voice-preview-empty"><Mic2 size={16} />No local preview sample is exposed.</div>}
                      <div className="identity-gates">
                        <span className={voiceSample.quality.passed ? 'passed' : voiceSample.status === 'failed' ? 'failed' : ''}>
                          {voiceSample.quality.passed ? <Check size={13} /> : <Circle size={13} />}
                          Quality {voiceSample.quality.durationSeconds ? `${voiceSample.quality.durationSeconds.toFixed(1)}s` : 'pending'}
                        </span>
                        <span className={voiceSample.consentMatched ? 'passed' : voiceSample.status === 'failed' ? 'failed' : ''}>
                          {voiceSample.consentMatched ? <Check size={13} /> : <Circle size={13} />}
                          Consent phrase
                        </span>
                        <span className={voiceSample.livenessVerified ? 'passed' : voiceSample.source === 'recording' && voiceSample.status === 'ready' ? 'failed' : ''}>
                          {voiceSample.livenessVerified ? <Check size={13} /> : <Circle size={13} />}
                          Liveness {executionMode === 'simulation' && voiceSample.source !== 'recording' ? 'optional' : 'challenge'}
                        </span>
                      </div>
                      <div className={`asr-result ${voiceSample.status}`}>
                        <span>BAILIAN TRANSCRIPT</span>
                        <strong>{voiceSample.status === 'transcribing' ? 'Transcribing creator sample...' : voiceSample.transcript || 'Run ASR before creating the identity.'}</strong>
                        {voiceSample.model && <small>{voiceSample.model}</small>}
                        {voiceSample.error && <small>{voiceSample.error}</small>}
                      </div>
                      <p>SHA-256, consent, quality and one-time challenge evidence are salted into the private identity commitment. Raw audio never enters the Aleo Record.</p>
                      <button className="secondary-command voice-transcribe-command" type="button" disabled={isProcessing || !voiceSample.sourceUrl || voiceSample.status === 'transcribing'} onClick={() => void runVoiceTranscription()}>
                        <Waves size={17} /> {voiceSample.status === 'transcribing' ? 'Transcribing with Bailian...' : 'Verify sample with Bailian ASR'}
                      </button>
                      <button className="primary-command" type="button" disabled={isProcessing || !voiceSample.sourceUrl || isRecording || voiceSample.status === 'transcribing' || voiceSample.status === 'failed' || (voiceSample.livenessVerified && consumedChallengeId === voiceSample.challengeId) || (voiceSample.status === 'ready' && (!voiceSample.consentMatched || !voiceSample.quality.passed)) || (executionMode === 'wallet' && (!connected || !voiceSample.livenessVerified))} onClick={() => void createIdentity()}>
                        {demo.identity ? <RotateCcw size={17} /> : <Fingerprint size={17} />}
                        {isProcessing ? 'Transcribing and hashing...' : voiceSample.livenessVerified && consumedChallengeId === voiceSample.challengeId ? 'Generate a new challenge' : demo.identity ? 'Rotate salt and rebuild' : 'Create voice identity'}
                      </button>
                    </div>

                    <div className="work-panel commitment-panel">
                      <div className="panel-title"><Hash size={17} /><span>Commitment pipeline</span><small>PRIVATE ON ALEO</small></div>
                      <DataRoute label="Raw sample" value={voiceSample.name} state={voiceSample.sourceUrl ? 'done' : 'idle'} />
                      <DataRoute label="Bailian ASR" value={voiceSample.transcript || 'not verified'} state={voiceSample.status === 'ready' ? 'done' : 'idle'} />
                      <DataRoute label="Consent phrase" value={voiceSample.consentMatched ? 'matched' : 'pending'} state={voiceSample.consentMatched ? 'done' : 'idle'} />
                      <DataRoute label="Quality gate" value={voiceSample.quality.passed ? 'passed' : 'pending'} state={voiceSample.quality.passed ? 'done' : 'idle'} />
                      <DataRoute label="Live challenge" value={voiceSample.livenessVerified ? 'matched / committed' : executionMode === 'simulation' ? 'optional' : 'required'} state={voiceSample.livenessVerified ? 'done' : 'idle'} />
                      <DataRoute label="SHA-256" value={shortHash(sampleHash)} state={sampleHash ? 'done' : 'idle'} />
                      <DataRoute label="Salted commitment" value={shortHash(voiceCommitment)} state={voiceCommitment ? 'done' : 'idle'} />
                      <DataRoute label="VoiceIdentity" value={demo.identity ? 'private Record' : 'not created'} state={demo.identity ? 'done' : 'idle'} />
                    </div>

                    <div className="work-panel policy-builder">
                      <div className="panel-title"><ShieldOff size={17} /><span>Default policy</span><small>COMMITTED</small></div>
                      <div className="policy-rule allowed"><Check size={15} /><span>GAME_NPC</span><strong>ALLOW</strong></div>
                      <div className="policy-rule blocked"><Ban size={15} /><span>POLITICAL</span><strong>BLOCK</strong></div>
                      <div className="policy-rule blocked"><Ban size={15} /><span>FINANCIAL IMPERSONATION</span><strong>BLOCK</strong></div>
                      <div className="policy-rule"><EyeOff size={15} /><span>Buyer + price</span><strong>PRIVATE</strong></div>
                    </div>

                    <div className="work-panel license-request-panel">
                      <div className="panel-title"><KeyRound size={17} /><span>License request</span><small>READY TO SIGN</small></div>
                      <dl className="request-summary">
                        <div><dt>Project</dt><dd>Demo RPG / North Gate</dd></div>
                        <div><dt>Purpose</dt><dd>GAME_NPC</dd></div>
                        <div><dt>Quota</dt><dd>03 uses</dd></div>
                        <div><dt>Expiry</dt><dd>Block 1000</dd></div>
                      </dl>
                      <div className="command-row">
                        <button className={demo.license ? 'complete-command' : 'primary-command'} type="button" disabled={!demo.identity || isProcessing || (executionMode === 'wallet' && !connected)} onClick={() => void issueLicense()}>
                          {demo.license ? <Check size={17} /> : <KeyRound size={17} />}{demo.license ? 'License issued' : 'Sign private license'}
                        </button>
                        <button className="danger-command" type="button" disabled={!demo.license || demo.revoked || isProcessing} onClick={() => void revoke()}>
                          <ShieldOff size={17} /> {demo.revoked ? 'Revoked' : 'Revoke'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {demoRole === 'licensee' && (
                <div className="workspace-view">
                  <div className="workspace-heading">
                    <div>
                      <p className="micro-label">LICENSEE / NORTH GATE STUDIO</p>
                      <h3><span className="type-art">Authorize</span> first. <span className="type-editorial">Synthesize</span> second.</h3>
                    </div>
                    <span className={`workspace-state ${demo.license && !demo.revoked ? 'ready' : 'blocked'}`}>
                      {demo.license && !demo.revoked ? <KeyRound size={16} /> : <AlertTriangle size={16} />}
                      {demo.license ? `${demo.remaining} private uses` : 'No license'}
                    </span>
                  </div>

                  {!demo.license && (
                    <div className="setup-callout">
                      <AlertTriangle size={18} /><span>Create a VoiceIdentity and issue a private license in Creator Studio first.</span>
                      <button type="button" onClick={() => setDemoRole('creator')}>Open Creator Studio</button>
                    </div>
                  )}

                  <div className="scenario-tabs">
                    {(Object.keys(scenarioPresets) as DemoScenario[]).map((item) => (
                      <button className={scenario === item ? 'active' : ''} type="button" key={item} onClick={() => selectScenario(item)}>
                        <span>{scenarioPresets[item].label}</span><small>{scenarioPresets[item].detail}</small>
                      </button>
                    ))}
                  </div>

                  <div className="licensee-grid">
                    <div className="work-panel prompt-panel">
                      <div className="panel-title"><Braces size={17} /><span>Generation request</span><small>INPUT AS DATA</small></div>
                      <label htmlFor="generation-prompt">Prompt</label>
                      <textarea
                        id="generation-prompt"
                        value={prompt}
                        onChange={(event) => {
                          setPrompt(event.target.value)
                          setRemotePolicy(null)
                          setRemotePolicyStatus('idle')
                        }}
                      />
                      <div className="prompt-meta"><span>Project: Demo RPG</span><span>License: GAME_NPC</span><span>Content: {shortHash(contentCommitment)}</span></div>
                    </div>

                    <div className={`work-panel policy-agent-panel ${policy.risks.length || policy.purpose !== 'GAME_NPC' || (remotePolicy && remotePolicy.decision !== 'allow') ? 'blocked' : 'allowed'}`}>
                      <div className="panel-title"><Sparkles size={17} /><span>Policy Agent</span><small>{remotePolicyStatus === 'checking' ? 'QWEN CHECKING' : `${policyEvaluationSummary.passed}/${policyEvaluationSummary.total} REGRESSION`}</small></div>
                      <div className="classification"><span>{policy.purposeCode}</span><strong>{policy.purpose}</strong><em>{policy.confidence} confidence</em></div>
                      <p>{policy.explanation}</p>
                      <div className="risk-flags">
                        {policy.risks.length ? policy.risks.map((risk) => <span key={risk}><Ban size={13} />{risk}</span>) : <span className="clear"><Check size={13} />NO RISK FLAGS</span>}
                      </div>
                      <div className={`remote-policy-status ${remotePolicyStatus}`}>
                        <span>QWEN3.5-FLASH</span>
                        <strong>
                          {remotePolicyStatus === 'checking'
                            ? 'ANALYZING'
                            : remotePolicy ? `${remotePolicy.decision.toUpperCase()} / ${remotePolicy.purpose}` : 'NOT CHECKED'}
                        </strong>
                        <small>{remotePolicy?.explanation || 'Runs immediately before Aleo authorization.'}</small>
                      </div>
                    </div>
                  </div>

                  <div className="execution-trace">
                    <TraceStep icon={<Sparkles size={17} />} label="Dual Policy Agent" detail={remotePolicyStatus === 'checking' ? 'Qwen reviewing request' : remotePolicy ? `${remotePolicy.decision} / ${remotePolicy.purpose}` : 'local classified / remote pending'} state={demo.rejected && (policy.risks.length > 0 || remotePolicy?.decision !== 'allow') ? 'failed' : remotePolicy?.decision === 'allow' ? 'done' : 'idle'} />
                    <TraceStep icon={<Network size={17} />} label="Aleo use_license" detail={demo.generated ? 'old Record consumed' : demo.rejected ? 'constraints rejected' : 'awaiting authorization'} state={demo.generated ? 'done' : demo.rejected ? 'failed' : 'idle'} />
                    <TraceStep icon={<FileCheck2 size={17} />} label="UsageReceipt" detail={demo.receipt ? 'private receipt created' : 'not created'} state={demo.receipt ? 'done' : demo.rejected ? 'blocked' : 'idle'} />
                    <TraceStep icon={<Volume2 size={17} />} label="CosyVoice TTS" detail={demo.ttsCalled ? 'cloned voice audio released' : 'adapter not called'} state={demo.ttsCalled ? 'done' : demo.rejected ? 'blocked' : 'idle'} />
                  </div>

                  {demo.generated ? (
                    <div className="authorized-output">
                      <div className="audio-strip">
                        <button type="button" onClick={toggleAudio} aria-label={isPlaying ? 'Pause audio' : 'Play audio'}>{isPlaying ? <Pause size={20} /> : <Play size={20} />}</button>
                        <div className={`wave-bars ${isPlaying ? 'playing' : ''}`} aria-hidden="true">
                          {Array.from({ length: 48 }, (_, index) => <i key={index} style={{ '--bar': `${18 + ((index * 19) % 66)}%` } as React.CSSProperties} />)}
                        </div>
                        <span>{formatAudioDuration(generatedAudioDuration)}</span>
                        <audio
                          ref={audioRef}
                          src={generatedAudioUrl}
                          onLoadedMetadata={(event) => setGeneratedAudioDuration(event.currentTarget.duration)}
                          onEnded={() => setIsPlaying(false)}
                        />
                      </div>
                      <div className="output-actions">
                        <span><BadgeCheck size={17} /> Authorized output / quota now {demo.remaining}</span>
                        <button type="button" onClick={downloadGeneratedAudio}><Download size={16} /> Audio</button>
                        <button type="button" onClick={downloadManifest}><Download size={16} /> Manifest</button>
                        <button type="button" onClick={useCurrentVerificationPackage}><ArrowUpRight size={16} /> Verify</button>
                      </div>
                    </div>
                  ) : (
                    <div className={`tts-gate ${demo.rejected ? 'rejected' : ''}`}>
                      {demo.rejected ? <Ban size={22} /> : <Volume2 size={22} />}
                      <div><strong>{demo.rejected ? 'Generation blocked before TTS' : 'CosyVoice adapter locked'}</strong><span>{demo.rejected ? demo.lastError : 'A valid private receipt is required before cloned audio can be released.'}</span></div>
                    </div>
                  )}

                  <button className="authorize-command" type="button" disabled={isProcessing || !demo.license || (executionMode === 'wallet' && !connected)} onClick={() => void generate()}>
                    <Zap size={18} />{isProcessing ? 'Waiting for authorization...' : executionMode === 'wallet' ? 'Approve Aleo transaction and run CosyVoice' : 'Authorize on Aleo and run CosyVoice'}
                  </button>
                </div>
              )}

              {demoRole === 'verifier' && (
                <div className="workspace-view">
                  <div className="workspace-heading">
                    <div>
                      <p className="micro-label">VERIFIER / RELEASE PLATFORM</p>
                      <h3><span className="type-art">Verify</span> permission. Keep the deal <span className="type-editorial">private.</span></h3>
                    </div>
                    <span className={`workspace-state ${demo.verified ? 'ready' : ''}`}>
                      {demo.verified ? <BadgeCheck size={16} /> : <Circle size={16} />}{demo.verified ? 'Proof accepted' : 'Awaiting proof'}
                    </span>
                  </div>

                  <div className="verifier-grid">
                    <div className="work-panel receipt-upload">
                      <div className="panel-title"><FileCheck2 size={17} /><span>External verification package</span><small>LOCAL CHECK</small></div>
                      <div className="verification-inputs">
                        <label>
                          <input type="file" accept="audio/*,.m4a" onChange={(event) => selectVerificationAudio(event.target.files?.[0] || null)} />
                          <Waves size={19} />
                          <span><strong>Audio file</strong><small>{verificationPackage.audioName || 'Select generated audio'}</small></span>
                          <Upload size={16} />
                        </label>
                        <label>
                          <input type="file" accept="application/json,.json" onChange={(event) => void selectVerificationManifest(event.target.files?.[0] || null)} />
                          <FileJson size={19} />
                          <span><strong>Manifest</strong><small>{verificationPackage.manifestName || 'Select VoiceRights manifest'}</small></span>
                          <Upload size={16} />
                        </label>
                      </div>
                      {generatedAudioBlob && (
                        <button className="secondary-command package-current-command" type="button" onClick={useCurrentVerificationPackage}>
                          <ArrowUpRight size={16} /> Use current generated package
                        </button>
                      )}
                      <div className="audio-match"><Waves size={17} /><span>Computed SHA-256</span><code>{verificationPackage.computedHash ? shortHash(verificationPackage.computedHash) : 'pending'}</code></div>
                      {verificationPackage.checks.length > 0 && (
                        <div className="verification-checks">
                          {verificationPackage.checks.map((check) => (
                            <div className={check.passed ? 'passed' : check.required ? 'failed' : 'evidence'} key={check.label}>
                              {check.passed ? <Check size={14} /> : check.required ? <X size={14} /> : <Circle size={14} />}
                              <span>{check.label}</span>
                              <strong>{check.value}</strong>
                            </div>
                          ))}
                        </div>
                      )}
                      {verificationPackage.error && <div className="package-error"><AlertTriangle size={15} />{verificationPackage.error}</div>}
                      <button className="primary-command" type="button" disabled={!verificationPackage.audioFile || !verificationPackage.manifest || verificationPackage.status === 'checking'} onClick={() => void verifyPackage()}>
                        <ShieldCheck size={17} /> {verificationPackage.status === 'checking' ? 'Computing SHA-256...' : 'Verify external package'}
                      </button>
                      <button className={demo.published ? 'complete-command' : 'secondary-command'} type="button" disabled={!demo.receipt || isProcessing || (executionMode === 'wallet' && !connected)} onClick={() => void publishReceipt()}>
                        <Globe2 size={17} /> {demo.published ? 'Commitment published' : 'Publish minimal commitment'}
                      </button>
                    </div>

                    <div className={`work-panel verification-result ${verificationPackage.status === 'verified' ? 'verified' : ''}`}>
                      <div className="verification-mark">
                        {verificationPackage.status === 'verified' ? <BadgeCheck size={54} /> : <ShieldCheck size={54} />}
                        <strong>{verificationPackage.status === 'verified' ? 'PACKAGE VERIFIED' : 'NOT VERIFIED'}</strong>
                        <span>
                          {verificationPackage.manifest?.authorization_transaction_id || verificationPackage.manifest?.transaction_id
                            ? verificationPackage.status === 'verified' ? 'with verified Testnet transaction evidence' : 'transaction evidence rejected'
                            : 'file integrity and private receipt evidence'}
                        </span>
                      </div>
                      <dl className="disclosure-list">
                        <div><dt>File integrity</dt><dd>{verificationPackage.status === 'verified' ? 'MATCH' : 'PENDING'}</dd></div>
                        <div><dt>Purpose</dt><dd>{verificationPackage.status === 'verified' ? verificationPackage.manifest?.purpose_class : 'PENDING'}</dd></div>
                        <div><dt>Receipt</dt><dd>{verificationPackage.status === 'verified' ? 'COMMITTED' : 'PENDING'}</dd></div>
                        <div><dt>Embedded proof</dt><dd>{verificationPackage.status === 'verified' ? verificationPackage.embeddedProvenance ? 'ID3 MATCH' : 'PENDING' : 'PENDING'}</dd></div>
                        <div><dt>Authorization evidence</dt><dd>{verificationPackage.status === 'verified' ? verificationPackage.manifest?.authorization_transaction_id || verificationPackage.manifest?.transaction_id ? 'ALEO TESTNET' : 'SIMULATION' : 'PENDING'}</dd></div>
                      </dl>
                    </div>
                  </div>

                  <div className="privacy-boundaries">
                    <PrivacyBucket icon={<Server size={17} />} label="LOCAL ONLY" items={['raw audio', 'speaker embedding', 'salt']} tone="local" />
                    <PrivacyBucket icon={<LockKeyhole size={17} />} label="PRIVATE ON ALEO" items={['buyer', 'policy', 'quota', 'receipt']} tone="private" />
                    <PrivacyBucket icon={<Globe2 size={17} />} label="PUBLIC ON ALEO" items={['revocation key', 'opt-in receipt commitment']} tone="public" />
                    <PrivacyBucket icon={<EyeOff size={17} />} label="SELECTIVELY DISCLOSED" items={['authorized', 'purpose class', 'audio match']} tone="selective" />
                  </div>

                  <div className="audit-history">
                    <div className="audit-history-heading">
                      <div><FileClock size={17} /><span>LOCAL AUDIT HISTORY</span></div>
                      <strong>{auditRecords.length} PACKAGES</strong>
                    </div>
                    {auditStatus === 'loading' && <div className="audit-empty">Loading local audit packages...</div>}
                    {auditError && <div className="package-error"><AlertTriangle size={15} />{auditError}</div>}
                    {auditStatus !== 'loading' && auditRecords.length === 0 && <div className="audit-empty">Generated packages will remain available here after refresh.</div>}
                    {auditRecords.map((record) => (
                      <div className={`audit-row ${activeAuditId === record.id ? 'active' : ''}`} key={record.id}>
                        <button className="audit-load" type="button" onClick={() => loadAuditRecord(record)}>
                          <span>{new Date(record.createdAt).toLocaleString()}</span>
                          <strong>{record.purpose} / {record.provider}</strong>
                          <small>{record.executionMode.toUpperCase()} · {shortHash(record.audioHash)}</small>
                        </button>
                        <span className={`audit-verification ${record.verificationStatus}`}>{record.verificationStatus.toUpperCase()}</span>
                        <button type="button" title="Download audio" aria-label="Download archived audio" onClick={() => downloadAuditAudio(record)}><Volume2 size={15} /></button>
                        <button type="button" title="Download manifest" aria-label="Download archived manifest" onClick={() => downloadAuditManifest(record)}><FileJson size={15} /></button>
                        <button type="button" title="Delete package" aria-label="Delete archived package" onClick={() => void removeAuditRecord(record)}><Trash2 size={15} /></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <aside className="demo-inspector">
            <p className="micro-label">STATE INSPECTOR</p>
            <RecordField label="voice identity" value={demo.identity ? 'private Record' : 'pending'} />
            <RecordField label="voice commitment" value={shortHash(voiceCommitment)} />
            <RecordField label="license" value={demo.license ? 'GAME_NPC / private' : 'pending'} />
            <RecordField label="remaining" value={demo.license ? `${demo.remaining} uses` : 'pending'} />
            <RecordField label="revoked" value={demo.revoked ? 'true / public key' : 'false'} />
            <RecordField label="receipt" value={demo.receipt ? shortHash(contentCommitment) : 'pending'} />
            <RecordField label="published" value={demo.published ? 'commitment / public' : 'false'} />
            <div className="inspector-manifest"><span>VOICE RIGHTS MANIFEST</span><code>{JSON.stringify(manifest, null, 2)}</code></div>
            <MiniWidget className="record-mini" label="PRIVATE FIELDS" value="5 SEALED" icon={<LockKeyhole size={15} />} />
            <div className={`inspector-seal ${verificationPackage.status === 'verified' ? 'verified' : ''}`}>
              {verificationPackage.status === 'verified' ? <BadgeCheck size={28} /> : <Circle size={28} />}
              <span>{verificationPackage.status === 'verified' ? 'PACKAGE VERIFIED' : 'AWAITING PROOF'}</span>
            </div>
          </aside>
        </div>
      </section>
      )}

      {activeView === 'build' && (
      <section className="build-section" id="build-plan">
        <div className="build-heading">
          <div>
            <p className="micro-label"><DecryptedText text="IMPLEMENTATION STATUS / 2026-08-02" /></p>
            <h2>Build the plan, not just the pitch.</h2>
          </div>
          <div className="progress-summary">
            <strong>93%</strong>
            <span>weighted plan completion</span>
            <i><b /></i>
          </div>
        </div>

        <div className="build-stats">
          <div><CheckCircle2 size={19} /><strong>13</strong><span>shipped milestones</span></div>
          <div><Clock3 size={19} /><strong>01</strong><span>in progress</span></div>
          <div><Circle size={19} /><strong>01</strong><span>not started</span></div>
          <div><Database size={19} /><strong>11 / 11</strong><span>Leo tests passing</span></div>
        </div>

        <div className="architecture-board">
          <div className="architecture-title">
            <span>PLAN §9 / LOGICAL ARCHITECTURE</span>
            <strong>Every boundary has a job.</strong>
          </div>
          <div className="architecture-flow">
            <ArchitectureNode icon={<Layers3 size={20} />} label="Web workspace" detail="Creator / Licensee / Verifier" status="done" />
            <i />
            <ArchitectureNode icon={<Fingerprint size={20} />} label="Identity service" detail="Consent + challenge live / embedding pending" status="partial" />
            <i />
            <ArchitectureNode icon={<Sparkles size={20} />} label="Policy Agent" detail="Local rules + Qwen fail-closed gate" status="done" />
            <i />
            <ArchitectureNode icon={<Network size={20} />} label="Aleo program" detail="Records, quota, receipts, proofs" status="done" />
            <i />
            <ArchitectureNode icon={<Volume2 size={20} />} label="TTS adapter" detail="Receipt-gated CosyVoice clone" status="done" />
            <i />
            <ArchitectureNode icon={<FileJson size={20} />} label="Provenance" detail="ID3 metadata + external manifest" status="done" />
          </div>
        </div>

        <div className="plan-layout">
          <div className="plan-timeline">
            <div className="plan-panel-heading">
              <span>PLAN §16 / DELIVERY SCHEDULE</span>
              <strong>Milestone audit</strong>
            </div>
            {planProgress.map((item) => (
              <div className={`plan-row ${item.status}`} key={`${item.date}-${item.title}`}>
                <span className="plan-date">{item.date}</span>
                <ProgressStatus status={item.status} />
                <div><strong>{item.title}</strong><p>{item.detail}</p></div>
              </div>
            ))}
          </div>

          <aside className="plan-gaps">
            <div className="plan-panel-heading">
              <span>REAL REMAINING WORK</span>
              <strong>Submission blockers</strong>
            </div>
            <div className="gap-item"><span>01</span><div><strong>Wallet compatibility audit</strong><p>Record compatibility across supported Shield Wallet builds still needs a recorded run.</p></div></div>
            <div className="gap-item"><span>02</span><div><strong>Public deployment operations</strong><p>TLS hosting, rate limiting, monitoring and mounted production secrets remain.</p></div></div>
            <div className="gap-item"><span>03</span><div><strong>Submission package</strong><p>Demo video, public URL and final submission form remain.</p></div></div>
            <div className="truth-card">
              <ShieldCheck size={22} />
              <div><strong>Public Testnet evidence is live</strong><span>Deployment and all five contract transitions are accepted. Real TTS is not claimed.</span></div>
            </div>
          </aside>
        </div>
      </section>
      )}

      {activeView === 'proof' && (
      <section className="proof-section" id="proof">
        <StarField />
        <div className="proof-spotlight" aria-hidden="true" />
        <div className="proof-heading">
          <p><DecryptedText text="NOT A MOCK CHAIN" /></p>
          <h2>Privacy, with receipts.</h2>
        </div>
        <div className="proof-grid">
          <ProofItem value={proof.tests} label="Leo unit tests" />
          <ProofItem value={proof.constraints} label="Program constraints" />
          <ProofItem value="06" label="Public Testnet transactions" />
          <ProofItem value={`${policyEvaluationSummary.passed}/${policyEvaluationSummary.total}`} label="Policy regression cases" />
        </div>
        <MiniWidget className="proof-mini" label="VERIFY TIME" value="< 1 SEC" icon={<Sparkles size={15} />} />
        <div className="proof-ledger">
          <div>
            <span>DEPLOY</span>
            <code>{proof.deploy}</code>
          </div>
          <div>
            <span>USE LICENSE</span>
            <code>{proof.use}</code>
          </div>
          <button type="button" onClick={() => window.open(`${testnetExplorer}/transaction/${proof.deployTx}`, '_blank', 'noopener,noreferrer')}>
            <ArrowUpRight size={16} /> Open Explorer
          </button>
        </div>
      </section>
      )}
          </motion.div>
        </AnimatePresence>
      </div>

      <footer className="app-footer">
        <div>
          <span className="wordmark-dot" />
          <strong>VoiceRights Vault</strong>
        </div>
        <p>{activeView === 'home' ? 'Select a module to enter.' : 'Use ← → to switch modules. Esc returns home.'}</p>
        <span>{viewNumber} / 05</span>
      </footer>
    </main>
  )
}

function IdentityScene() {
  return (
    <article className="scene scene-identity" id="identity" data-scene="identity">
      <SceneCopy scene={scenes[0]} />
      <div className="identity-visual">
        <div className="identity-portrait">
          <span>M</span>
          <div className="portrait-lines" />
        </div>
        <div className="identity-wave">
          {Array.from({ length: 36 }, (_, index) => <i key={index} />)}
        </div>
        <div className="identity-meta">
          <span>VOICE COMMITMENT</span>
          <code>111...field</code>
        </div>
        <div className="visual-chip identity-chip">
          <Fingerprint size={16} />
          <div>
            <span>SALTED HASH</span>
            <strong>0x91...voice</strong>
          </div>
        </div>
        <div className="privacy-dial identity-dial">
          <span>RAW AUDIO</span>
          <strong>0%</strong>
          <i />
        </div>
        <MiniWidget className="identity-mini" label="SALT ROTATION" value="EPOCH 09" icon={<RotateCcw size={15} />} />
      </div>
    </article>
  )
}

function LicenseScene() {
  return (
    <article className="scene scene-license" id="license" data-scene="license">
      <SceneCopy scene={scenes[1]} />
      <div className="license-visual">
        <div className="license-topline">
          <span>VOICE LICENSE</span>
          <span>PRIVATE RECORD</span>
        </div>
        <div className="license-monogram">VR</div>
        <div className="license-terms">
          <span>PURPOSE</span><strong>GAME NPC</strong>
          <span>USES</span><strong>02</strong>
          <span>EXPIRES</span><strong>BLOCK 1000</strong>
        </div>
        <div className="policy-widget">
          <div><span>BUYER</span><strong>HIDDEN</strong></div>
          <div><span>PRICE</span><strong>SEALED</strong></div>
          <div><span>QUOTA</span><strong>02</strong></div>
        </div>
        <div className="revocation-widget">
          <LockKeyhole size={15} />
          <span>REVOCATION KEY</span>
          <strong>CREATOR ONLY</strong>
        </div>
        <MiniWidget className="license-mini" label="POLICY ROOT" value="MATCHED" icon={<FileCheck2 size={15} />} />
        <div className="license-lock"><LockKeyhole size={22} /></div>
      </div>
    </article>
  )
}

function GenerateScene() {
  return (
    <article className="scene scene-generate" id="generate" data-scene="generate">
      <SceneCopy scene={scenes[2]} />
      <div className="gate-visual">
        <div className="gate-copy">
          <span>REQUEST / 0088</span>
          <strong>“The northern gate closes at sunset.”</strong>
        </div>
        <div className="synthesis-widgets">
          <div>
            <KeyRound size={16} />
            <span>LICENSE RECORD</span>
            <strong>VALID</strong>
          </div>
          <div>
            <Sparkles size={16} />
            <span>REMAINING USES</span>
            <strong>01</strong>
          </div>
          <MiniWidget className="synthesis-mini" label="RECEIPT" value="QUEUED" icon={<FileCheck2 size={15} />} />
        </div>
        <div className="gate-path">
          <i />
          <div><KeyRound size={22} /></div>
          <i />
          <div><Volume2 size={22} /></div>
          <i />
        </div>
        <div className="gate-status">
          <BadgeCheck size={20} />
          LICENSE CONSUMED / AUDIO RELEASED
        </div>
      </div>
    </article>
  )
}

function VerifyScene() {
  return (
    <article className="scene scene-verify" id="verify" data-scene="verify">
      <SceneCopy scene={scenes[3]} />
      <div className="verify-visual">
        <div className="verify-ring">
          <FileCheck2 size={62} strokeWidth={1.2} />
          <span>VALID</span>
        </div>
        <div className="verify-list">
          <span><Check size={15} /> Purpose authorized</span>
          <span><Check size={15} /> Audio hash matches</span>
          <span><LockKeyhole size={15} /> Buyer remains hidden</span>
          <span><LockKeyhole size={15} /> Price remains hidden</span>
        </div>
        <div className="reveal-widget">
          <FileCheck2 size={16} />
          <span>PUBLIC OUTPUT</span>
          <strong>purpose + hash only</strong>
        </div>
        <MiniWidget className="verify-mini" label="NULLIFIER" value="UNSEEN" icon={<LockKeyhole size={15} />} />
      </div>
    </article>
  )
}

function MiniWidget({ label, value, icon, className = '' }: { label: string; value: string; icon: ReactNode; className?: string }) {
  return (
    <div className={`mini-widget ${className}`.trim()}>
      {icon}
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  )
}

function ModuleButton({ index, label, detail, icon, onClick }: { index: string; label: string; detail: string; icon: ReactNode; onClick: () => void }) {
  return (
    <button className="module-button" type="button" onClick={onClick}>
      <span>{index}</span>
      <i>{icon}</i>
      <div><strong>{label}</strong><small>{detail}</small></div>
      <ArrowUpRight size={17} />
    </button>
  )
}

function SceneCopy({ scene }: { scene: (typeof scenes)[number] }) {
  return (
    <div className="scene-copy">
      <div className="scene-number">{scene.index}</div>
      <p>{scene.label}</p>
      <h2>{scene.title}</h2>
      <span>{scene.body}</span>
    </div>
  )
}

function DemoStep({ number, label, active, done }: { number: string; label: string; active: boolean; done: boolean }) {
  return (
    <div className={`demo-step ${active ? 'active' : ''} ${done ? 'done' : ''}`}>
      <span>{done ? <Check size={14} /> : number}</span>
      <strong>{label}</strong>
    </div>
  )
}

function RecordField({ label, value }: { label: string; value: string }) {
  return (
    <div className="record-field">
      <span>{label}</span>
      <code>{value}</code>
    </div>
  )
}

function DataRoute({ label, value, state }: { label: string; value: string; state: 'idle' | 'done' }) {
  return (
    <div className={`data-route ${state}`}>
      <span>{state === 'done' ? <Check size={13} /> : <Circle size={13} />}{label}</span>
      <code>{value}</code>
    </div>
  )
}

function TraceStep({ icon, label, detail, state }: { icon: ReactNode; label: string; detail: string; state: 'idle' | 'done' | 'failed' | 'blocked' }) {
  return (
    <div className={`trace-step ${state}`}>
      <span className="trace-icon">{state === 'failed' || state === 'blocked' ? <X size={16} /> : icon}</span>
      <div><strong>{label}</strong><span>{detail}</span></div>
    </div>
  )
}

function PrivacyBucket({ icon, label, items, tone }: { icon: ReactNode; label: string; items: string[]; tone: 'local' | 'private' | 'public' | 'selective' }) {
  return (
    <div className={`privacy-bucket ${tone}`}>
      <div>{icon}<strong>{label}</strong></div>
      {items.map((item) => <span key={item}>{item}</span>)}
    </div>
  )
}

function ArchitectureNode({ icon, label, detail, status }: { icon: ReactNode; label: string; detail: string; status: BuildStatus }) {
  return (
    <div className={`architecture-node ${status}`}>
      <span>{icon}</span>
      <strong>{label}</strong>
      <small>{detail}</small>
    </div>
  )
}

function ProgressStatus({ status }: { status: BuildStatus }) {
  if (status === 'done') return <span className="progress-status"><Check size={13} />DONE</span>
  if (status === 'partial') return <span className="progress-status"><Clock3 size={13} />ACTIVE</span>
  return <span className="progress-status"><Circle size={13} />PENDING</span>
}

function ProofItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="proof-item">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}

function DecryptedText({ text, className = '' }: { text: string; className?: string }) {
  const [output, setOutput] = useState(text)
  const [replay, setReplay] = useState(0)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setOutput(text)
      return
    }

    let progress = 0
    const interval = window.setInterval(() => {
      setOutput(
        text
          .split('')
          .map((character, index) => {
            if (character === ' ' || index < progress) return character
            return decryptCharacters[Math.floor(Math.random() * decryptCharacters.length)]
          })
          .join(''),
      )
      progress += 0.55
      if (progress >= text.length) {
        window.clearInterval(interval)
        setOutput(text)
      }
    }, 34)

    return () => window.clearInterval(interval)
  }, [replay, text])

  return (
    <span
      className={`decrypt-text ${className}`.trim()}
      aria-label={text}
      onMouseEnter={() => setReplay((value) => value + 1)}
    >
      {output}
    </span>
  )
}

function StarField() {
  return (
    <div className="star-field" aria-hidden="true">
      {stars.map((star, index) => (
        <i
          key={index}
          style={{
            '--star-left': star.left,
            '--star-top': star.top,
            '--star-size': star.size,
            '--star-delay': star.delay,
            '--star-duration': star.duration,
            '--star-opacity': star.opacity,
          } as React.CSSProperties}
        />
      ))}
    </div>
  )
}

export default App
