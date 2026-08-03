# VoiceRights Vault Final Submission

Updated: 2026-08-03

## Project

**VoiceRights Vault**

> Your voice can be cloned. Your rights should not be.

VoiceRights Vault is a privacy-preserving AI voice licensing agent built on
Aleo. Creators issue private, purpose-scoped, expiring, usage-limited voice
licenses. Every authorized synthesis consumes a license and creates a private
usage receipt. Verifiers can check minimal provenance without learning the
buyer, price, policy details, or remaining quota.

```text
Repository: https://github.com/Chengyuann/voice-rights-vault
Web demo:   PENDING HOSTING LOGIN / SECURITY CONFIRMATION
Aleo:       https://testnet.explorer.provable.com/program/voice_rights_v1.aleo
Video:      apps/web/output/Voice-Rights-Aleo-refined.mp4
```

## Why Aleo

The core license is an Aleo private Record rather than a public NFT or Web2
database row. Buyer identity, purpose, policy, expiry, remaining quota, and
receipt details remain private. License use consumes the old Record, which
prevents replay. Public state contains only creator-bound revocation IDs and
opt-in receipt commitments.

## Architecture

```text
Creator / Licensee / Verifier browser
  |
  | same-origin HTTPS
  v
Node production server
  |- Bailian streaming ASR
  |- Qwen3.5-Flash policy agent
  |- CosyVoice v3.5 Flash
  |- FFmpeg / FFprobe provenance
  `- Provable Testnet verification
  |
  v
voice_rights_v1.aleo
  |- VoiceIdentity private Record
  |- VoiceLicense private Record
  |- UsageReceipt private Record
  |- revoked public mapping
  `- public_receipts public mapping
```

## Technology

- Leo 4.4.0 and Aleo private Records
- React 18, TypeScript 6, Vite 8
- official Provable Shield Wallet adapter
- Node.js 24 production server
- Alibaba Cloud Bailian streaming ASR
- Qwen3.5-Flash policy classification
- CosyVoice `cosyvoice-v3.5-flash`
- FFmpeg and FFprobe
- Docker, Zeabur, and Render deployment configuration

## Environment Variables

```text
BAILIAN_API_KEY
BAILIAN_WORKSPACE_ID
COSYVOICE_VOICE_ID
COSYVOICE_TARGET_MODEL=cosyvoice-v3.5-flash
RATE_LIMIT_SALT
METRICS_TOKEN
TRUST_PROXY=1
PREVIEW_SAMPLE_REQUIRED=0
```

No real values belong in Git, frontend variables, screenshots, or logs.

## Verification Results

Executed on 2026-08-03:

| Check | Result |
|---|---|
| Leo unit tests | 11 / 11 passed |
| Web unit tests | 4 / 4 passed |
| TypeScript and Vite build | passed |
| Oxlint | passed |
| Policy regression | 30 / 30 passed |
| Privacy source audit | 8 / 8 passed |
| Production HTTP smoke | passed |
| Docker image build | passed |
| Docker container health on `PORT=10000` | healthy |
| Container real ASR / policy / TTS / Aleo checks | passed |
| `/readyz` | HTTP 200, every check true |
| Metrics without token | HTTP 401 |
| Invalid audio MIME | HTTP 415 |
| Upload above 12 MB | HTTP 413 |
| Bailian consent ASR | `Create voice identity.` |
| Qwen authorized NPC request | `allow / GAME_NPC` |
| Qwen political request | `block / POLITICAL` |
| CosyVoice | HTTP 200, `cosyvoice-v3.5-flash`, valid MP3 |
| Embedded provenance | marker, policy, program, receipt, transaction verified |
| Aleo `use_license` lookup | accepted |
| Git history secret scan | 0 matches across 7 real values and 2 commits |
| Dependency audit | 0 vulnerabilities |

Public Testnet accepted transactions:

```text
deploy:          at1wa9erh058vw4u6tzkwm0qm7yy2cjs0ag37vm8klgm6rvf2gfysfqx85qlr
register_voice:  at1gctpxe4xqr0vcmxpt54xhs7edk7wem0fp0pdu7jyewrla54pjgpsd8q364
issue_license:   at188jn3mcpa8pzz26djds2vaxr9f3rqrqgqkftfrf2ml6wrdlql5qqxgy0ff
use_license:     at1zzg59ljxkrwr3c2wth7zeugspzz3gxetljat6f3ej3t0s9dtc5zqk92hxz
publish_receipt: at1nuze2r4eu8njc0mcexe42rtt7jael58ye4r2pucm9xlclr4efufqpfsd6h
revoke_license:  at14666phn8z7ssryfsmlxn8n0xamuuvsx86krykaeqy8a0p6fhzgpssmthyc
```

## Video Verification

The final VoiceRights-only video is 80.73 seconds, 1920x1080, 30 fps, H.264
with AAC stereo narration. Full decode, black-frame detection, representative
OCR, CosyVoice narration ASR, original VoxCPM2 demo voice ASR, BGM mix, visible click-flow OCR, and encoded-segment ASR passed. No ZeroClaw or other
project footage is included.

```text
SHA-256: edfdd2dbda9ad35b331be5424740f23fa0234ab70e8542a6bc5b8c45a7cf2b87
```

## Security Notes

- Raw enrollment audio never enters the Leo program.
- API keys, workspace IDs, cloned voice IDs, and Aleo private keys remain
  server-side and are absent from Git history.
- Uploaded audio is limited to 12 MB and validated by MIME type and file
  signature.
- Metrics require a bearer token.
- Per-client endpoint limits use a salted anonymized client hash.
- Logs omit prompts, audio, secrets, private Records, and raw IP addresses.
- CSP, frame denial, MIME sniffing protection, referrer policy, and permissions
  policy are enabled.

## Known Limitations

- Speaker embedding and duplicate-speaker detection are not implemented.
- The policy suite is a project regression set, not an external benchmark.
- VoiceRights ID3 provenance is not a signed C2PA assertion.
- Browser audit history is local IndexedDB, not encrypted cloud storage.
- Royalty settlement is not included.
- The Shield browser path still needs a recorded compatibility run against a
  selected wallet release; the complete public Testnet flow is proven by
  accepted transactions.
- The public Web URL remains pending because Zeabur currently presents a
  server-purchase flow and Render GitHub OAuth requires account security / 2FA
  confirmation.
