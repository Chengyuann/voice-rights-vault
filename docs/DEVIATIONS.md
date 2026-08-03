# Deviations

Updated: 2026-08-03

## Current

### Public Testnet Is Now Deployed

`voice_rights_v1.aleo` is deployed on Aleo Testnet. Deployment and all five
contract transitions have accepted public transaction IDs. Local devnode
evidence remains useful for deterministic negative-case testing.

### Fast Smoke Skips Proof Generation

The default devnode smoke test uses placeholder deployment certificates and
skips execution proof generation for speed. A separate full-proof smoke path
successfully generated the deployment certificate and real proofs for
`register_voice`, `issue_license`, `use_license`, and `publish_receipt`.

### Wallet Path Awaits Testnet Compatibility Audit

The browser can submit all five transitions, including revocation using the
nonce generated during issuance. CLI execution has proven the complete public
Testnet flow; the browser path still needs a recorded compatibility run across
supported Shield Wallet builds.

### CosyVoice TTS Is Live In The Demo

The browser demo now uses a private `cosyvoice-v3.5-flash` cloned voice after
policy and license authorization succeed. The API key, source recording, and
voice ID remain server-side under `.secrets/`. Generated audio is hashed in the
browser and included in the downloadable manifest.

The Verifier workspace can independently load an audio file and manifest,
recompute SHA-256, and reject mismatched files. A simulation manifest proves
package consistency but is not presented as Testnet transaction evidence.

When a manifest includes an authorization transaction ID, the verifier queries
the Provable Testnet API and requires an accepted
`voice_rights_v1.aleo/use_license` transition. A published receipt claim also
requires an accepted `publish_receipt` transition; a transaction from the wrong
function or an unknown transaction ID is rejected.

### Voice Consent Is Enforced, Speaker Biometrics Are Not

The Creator workspace can record from the microphone or upload an audio sample.
It runs a local duration, level, and silence check, then requires Bailian ASR to
match the consent phrase `Create voice identity.` before registration. The
workspace can also generate a one-time random challenge phrase and bind a live
microphone recording to its nonce. Wallet registration requires this live
challenge; local simulation may continue with the preset consent sample. A
challenge is invalidated after a successful identity registration or whenever
the challenge is rotated, so the same recording cannot register twice.

This is explicit consent and liveness evidence, not production biometric
identity. Speaker embedding and duplicate-speaker detection remain out of scope.

### Policy Agent Uses A Fail-Closed Dual Gate

Every generation request is checked by the deterministic local classifier and
the server-side `qwen3.5-flash` classifier before any Aleo transaction or TTS
request is made. Both must classify the request as `GAME_NPC / allow`.
Political persuasion, financial impersonation, purpose mismatches, malformed
model responses, and remote model failures are blocked before synthesis.

The local 30-case regression suite remains the reproducible baseline. A larger
external benchmark and a human-review workflow are not implemented.

### Audio Carries VoiceRights Metadata, Not A C2PA Signature

The final MP3 includes a minimal ID3 comment containing a versioned VoiceRights
marker, provenance ID, purpose, receipt commitment, policy decision, program ID,
and optional authorization transaction ID. The Verifier extracts these fields
with FFprobe and requires them to match the external manifest.

This detects detached, stripped, or mismatched demo packages, but it is not a
cryptographically signed C2PA assertion. Production C2PA signing and trust-chain
validation remain unimplemented.

### Audit History Is Browser-Local

Successful generation stores the final MP3 and manifest snapshot in IndexedDB.
The Verifier can reload the package after refresh, repeat all file, metadata,
policy, and Testnet checks, download either artifact, and delete the local
record. Verification status is written back to the same record.

Enrollment audio, microphone recordings, API keys, private Records, and cloned
voice IDs are excluded. This history is not encrypted cloud storage and is lost
if the browser site data is cleared.

### A Standalone Production Server Is Available

The Bailian, FFmpeg, provenance, policy, and Aleo lookup routes are shared by
Vite development and a standalone Node HTTP server. The production server
serves the built frontend, supports SPA fallback and audio range requests, and
exposes `/healthz`.

It still requires an external hosting platform and TLS termination before
public deployment. The server now includes
per-IP endpoint limits, structured anonymized request logs, `/readyz`,
authenticated `/metrics`, graceful shutdown, and Docker/Compose templates.

The Docker image was built locally on 2026-08-03. The container ran as the
unprivileged `node` user with `PORT=10000`, reached Docker `healthy`, returned
ready status, and passed real Bailian ASR, Qwen policy, CosyVoice, Aleo lookup,
and metrics authorization checks.

### Free HTTPS Hosting Is Prepared, Not Yet Completed

The server accepts Bailian and CosyVoice credentials directly from environment
variables, so Zeabur or Render can deploy it without secret files. A Render
Blueprint and dashboard-only Zeabur instructions are included in
`docs/FREE_HOSTING.md`.

The public GitHub repository is current at
`https://github.com/Chengyuann/voice-rights-vault`. On 2026-08-03, Zeabur's
new-project flow for this account showed a server purchase flow rather than a
free shared-service path, so no Zeabur server was purchased. Render Blueprint
fallback opened successfully through GitHub OAuth, but GitHub disabled the
Render authorization button behind account security / 2FA management UI. Public
deployment therefore still requires the user to complete hosting login/security
confirmation and enter the prepared environment variables.

### Production Validation Is Local Until Public Hosting Exists

Local production verification passed with real Bailian ASR, Qwen policy
classification, CosyVoice `cosyvoice-v3.5-flash`, embedded provenance, and an
accepted Aleo Testnet transaction lookup. This is not presented as public HTTPS
verification. Public `/readyz`, browser console, mobile, proxy, and full-flow
checks remain pending until a Zeabur or Render URL exists.

### Final Demo Video Is Complete

The final VoiceRights-only video is 80.73 seconds, 1920x1080, H.264 with AAC
audio:

```text
apps/web/output/Voice-Rights-Aleo-refined.mp4
```

Full decode, black-frame checks, representative OCR, CosyVoice narration ASR,
original VoxCPM2 demo-voice ASR, BGM mix, visible click-flow OCR, and
encoded-segment ASR passed. The opening phrase was changed to "Artificial
intelligence" to avoid TTS pronouncing `AI` as separate letters.

### No Royalty Settlement

The MVP produces a private usage receipt but does not transfer real funds.
