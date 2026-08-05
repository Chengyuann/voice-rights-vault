# VoiceRights Vault

Private, usage-limited AI voice licensing on Aleo.

Repository: https://github.com/Chengyuann/voice-rights-vault
Public demo: https://voice-rights-vault.onrender.com

VoiceRights Vault models an AI voice license as an Aleo private Record. A
license carries a private purpose, policy commitment, expiry height, remaining
quota, a creator-bound revocation key, and nonce. Every authorized synthesis consumes the old
license Record, returns a reduced-quota Record, and creates a private usage
receipt.

## Current Status

Implemented:

- `VoiceIdentity` private Record
- `VoiceLicense` private Record
- `UsageReceipt` private Record
- private license issuance
- usage quota consumption
- purpose validation
- private expiry validation with a ledger-height finalization window
- atomic public revocation check
- Record replay rejection on a local Aleo devnode
- 11 Leo unit tests
- reproducible local devnode smoke test
- React product demo with cloned speech and receipt verification
- three-role Creator / Licensee / Verifier browser workspace
- browser-local SHA-256 and salted voice commitment demo
- local audio upload with server-side FFmpeg normalization
- Alibaba Cloud Bailian ASR transcript evidence for voice identity registration
- microphone consent phrase and local audio quality gate
- one-time microphone random challenge for liveness evidence
- deterministic policy-gate simulation for allowed and prohibited prompts
- fail-closed Qwen3.5-Flash remote policy classification before authorization
- reproducible 30-case policy regression suite
- reproducible 8-check privacy audit against the production Leo source
- receipt-gated CosyVoice cloned speech flow with downloadable minimal manifest
- independent audio + manifest verifier with SHA-256 mismatch rejection
- Aleo Testnet transaction lookup with program and transition verification
- ID3-embedded VoiceRights provenance with verifier cross-checks
- IndexedDB audit history for generated audio and manifest packages
- interactive implementation-plan and architecture status board
- `publish_receipt` transition with public receipt commitment mapping
- browser Shield Wallet adapter integration for optional Testnet execution
- public Testnet deployment of `voice_rights_v1.aleo`
- accepted public Testnet transactions for register, issue, use, publish, and revoke

MVP scope boundaries:

- consent and liveness are enforced with ASR and a one-time challenge; production
  speaker-embedding deduplication is a future hardening layer
- the Qwen policy gate is backed by a 30-case project regression suite; a larger
  external benchmark can be added for production governance
- the MVP produces private usage receipts; royalty settlement can layer on top
  of those receipts

## Why Aleo

The license is not a public NFT or a Web2 database row:

- buyer identity remains private
- purpose and policy remain private
- remaining quota remains private
- old Records cannot be replayed after consumption
- public state reveals only a creator-bound revocation key
- a successful use creates a private receipt

## Contract

The Leo program is at:

```text
programs/voice_rights_v1
```

Key entry points:

```text
register_voice
issue_license
use_license
revoke_license
publish_receipt
```

The only license-consumption entry point is `use_license`. It performs private
quota, purpose, content, and expiry checks, then atomically checks ledger height
and revocation in finalization.

## Local Toolchain

The project pins Leo `4.4.0` under:

```text
.tools/leo-4.4.0/leo
```

Install artifacts are intentionally local to the repository. The downloaded
archive checksum used during setup was:

```text
9419fc6f0af52f5f315c363e2cc33079275436bb497b6fcb4a0abe1c468f7dbe
```

## Verify

Run unit tests:

```bash
scripts/verify-contract.sh
```

Run deployment and transaction-level smoke tests:

```bash
scripts/devnode-smoke.sh
```

Run the slower full-proof path:

```bash
scripts/proof-smoke.sh
```

The smoke test:

1. starts a clean local devnode
2. deploys the program with a placeholder deployment certificate
3. registers a private voice identity
4. issues a two-use private license
5. consumes one use
6. publishes a minimal receipt commitment
7. verifies the old Record cannot be replayed
8. verifies exhausted quota, purpose mismatch, and revoked-license rejection
9. shuts down the devnode

Provide a disposable local key through `ALEO_TEST_PRIVATE_KEY` before running
the devnode scripts. Never commit the key or reuse it on a live network.

## Run The Demo

```bash
cd apps/web
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

Open:

```text
http://127.0.0.1:5173/
```

The web app is a local product demo backed by the contract evidence.
`voice_rights_v1.aleo` is deployed on public Testnet, and the optional Shield
Wallet mode targets that program. The deterministic simulation remains the
default demo path.

The Creator workspace can also send a local audio sample through a server-side
Bailian Fun-ASR proxy. The proxy reads credentials from:

```text
.secrets/bailian.csv
```

or from the path in `BAILIAN_CREDENTIALS_FILE`. The local preview sample may be
overridden with `VOICE_SAMPLE_FILE`. API keys and raw voice samples are never
included in the browser bundle. FFmpeg must be available on the server.

The linked Bailian ASR API supplies transcript evidence for identity
registration. A private `cosyvoice-v3.5-flash` voice profile supplies the
receipt-gated cloned speech. API keys, source recordings, and voice IDs remain
under `.secrets/`.

Generated MP3 and manifest packages are stored in browser IndexedDB so they can
be reloaded, downloaded, deleted, and reverified after refresh. Raw enrollment
audio, API keys, wallet secrets, and private Aleo Records are not stored there.
This is device-local persistence by design; production teams can add encrypted
sync without changing the Aleo receipt model.

### Production Server

The application includes a standalone Node server. It serves `dist/` and the
same ASR, TTS, policy, provenance, and Aleo verification APIs used during Vite
development:

```bash
cd apps/web
npm install
npm run build
HOST=0.0.0.0 PORT=4174 npm start
```

The liveness endpoint is `GET /healthz`; `GET /readyz` checks the secret files,
voice profile, preview sample, FFmpeg, and FFprobe. Production requires Node.js,
FFmpeg and FFprobe. Credentials can come from mounted files:

```text
BAILIAN_CREDENTIALS_FILE
COSYVOICE_PROFILE_FILE
VOICE_SAMPLE_FILE
RATE_LIMIT_SALT
METRICS_TOKEN
```

or directly from hosting environment variables:

```text
BAILIAN_API_KEY
BAILIAN_WORKSPACE_ID
COSYVOICE_VOICE_ID
COSYVOICE_TARGET_MODEL=cosyvoice-v3.5-flash
PREVIEW_SAMPLE_REQUIRED=0
```

Use `.env.production.example` as the deployment template. Never place secrets
in `public/`, `dist/`, or client environment variables. `npm run serve`
performs a fresh build and starts the production server.

Set `TRUST_PROXY=1` only when the application is directly behind a trusted
reverse proxy that overwrites `X-Forwarded-For`.

The production server emits structured JSON request logs with anonymized client
hashes, request IDs, status, route, and duration. It applies per-IP endpoint
limits, returns `429` with `Retry-After`, and exposes authenticated metrics at
`GET /metrics` using `Authorization: Bearer $METRICS_TOKEN`.

Default burst limits are 5 synthesis, 10 transcription, 20 policy, 30
provenance, and 60 Aleo lookup requests per client, each with gradual refill.
Tune these values in `server/index.ts` for the selected hosting capacity.

Production verification:

```bash
npm test
npm run build
npm run lint
npm run smoke:production
```

Container files are included:

```bash
docker build -t voice-rights-vault apps/web
docker compose -f apps/web/compose.production.yaml up --build
```

The Compose profile mounts secrets read-only, drops Linux capabilities, uses a
read-only root filesystem, and provides only `/tmp` for FFmpeg scratch files.
It also runs as the unprivileged `node` user.

## Evidence

Generated reports are stored in:

```text
outputs/test-reports/
```

The implementation plan is:

```text
outputs/VoiceRights_Vault_Aleo_参赛实施规划.md
```

Browser screenshots and UI checks are stored under:

```text
apps/web/output/playwright/
```

Public Testnet evidence:

```text
Program: https://testnet.explorer.provable.com/program/voice_rights_v1.aleo
Deploy:  https://testnet.explorer.provable.com/transaction/at1wa9erh058vw4u6tzkwm0qm7yy2cjs0ag37vm8klgm6rvf2gfysfqx85qlr
Use:     https://testnet.explorer.provable.com/transaction/at1zzg59ljxkrwr3c2wth7zeugspzz3gxetljat6f3ej3t0s9dtc5zqk92hxz
```

Submission documentation:

```text
docs/ARCHITECTURE.md
docs/THREAT_MODEL.md
docs/PRIVACY.md
docs/DEMO_SCRIPT.md
docs/OPERATIONS.md
docs/FREE_HOSTING.md
docs/SUBMISSION_CHECKLIST.md
docs/DEVIATIONS.md
docs/FINAL_SUBMISSION.md
```

Final VoiceRights-only demo video:

```text
https://voice-rights-vault.onrender.com/demo-video.mp4
```

The public HTTPS demo is deployed on Render Free using the repository
`render.yaml` Blueprint. It may take about 50 seconds to wake after inactivity.
Deployment and secret-management details are in `docs/FREE_HOSTING.md`.

## Security Boundaries

- Raw audio and speaker embeddings never enter the Leo program.
- `claimed_height` is constrained privately against the private expiry.
- Finalization requires the transaction to land within 120 blocks of the
  claimed height. The claimed height, not the inclusion height, must be no
  later than the private expiry.
- Revocation is checked in the same transaction as license consumption.
- The public revocation key is derived from the private voice commitment and
  license nonce, and does not reveal the voice, licensee,
  purpose, policy, expiry, or quota.
- `publish_receipt` writes only `BHP256(UsageReceipt fields) => true` to public
  state after the receipt owner consumes the private receipt Record.
- Local devnode IDs remain separate from the public Testnet transaction IDs.
