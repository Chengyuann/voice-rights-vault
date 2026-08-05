# Evidence Notes

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

### Wallet Adapter Path Is Integrated

The browser can submit all five transitions, including revocation using the
nonce generated during issuance. CLI execution has proven the complete public
Testnet flow, and an injected-wallet browser audit validates the app-side
adapter contract, transition ordering, Record request shapes, and TTS lock while
authorization is pending. A live extension matrix can be added when selected
Shield Wallet builds are available in the evaluator's browser environment.

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

This submission claims explicit consent and liveness evidence. Speaker
embedding and duplicate-speaker detection are reserved for production hardening
instead of being overstated in the demo.

### Policy Agent Uses A Fail-Closed Dual Gate

Every generation request is checked by the deterministic local classifier and
the server-side `qwen3.5-flash` classifier before any Aleo transaction or TTS
request is made. Both must classify the request as `GAME_NPC / allow`.
Political persuasion, financial impersonation, purpose mismatches, malformed
model responses, and remote model failures are blocked before synthesis.

The local 30-case regression suite is the reproducible baseline for this
submission. A larger external benchmark and human-review workflow are compatible
production governance extensions.

### Audio Carries VoiceRights Metadata, Not A C2PA Signature

The final MP3 includes a minimal ID3 comment containing a versioned VoiceRights
marker, provenance ID, purpose, receipt commitment, policy decision, program ID,
and optional authorization transaction ID. The Verifier extracts these fields
with FFprobe and requires them to match the external manifest.

This detects detached, stripped, or mismatched demo packages. C2PA signing can
be layered on the same manifest fields for production trust-chain validation.

### Audit History Is Browser-Local

Successful generation stores the final MP3 and manifest snapshot in IndexedDB.
The Verifier can reload the package after refresh, repeat all file, metadata,
policy, and Testnet checks, download either artifact, and delete the local
record. Verification status is written back to the same record.

Enrollment audio, microphone recordings, API keys, private Records, and cloned
voice IDs are excluded. Keeping this history in browser-local storage is an
intentional privacy boundary for the MVP.

### A Standalone Production Server Is Available

The Bailian, FFmpeg, provenance, policy, and Aleo lookup routes are shared by
Vite development and a standalone Node HTTP server. The production server
serves the built frontend, supports SPA fallback and audio range requests, and
exposes `/healthz`.

The public Render deployment now provides TLS termination. The server includes
per-IP endpoint limits, structured anonymized request logs, `/readyz`,
authenticated `/metrics`, graceful shutdown, and Docker/Compose templates.

The Docker image was built locally on 2026-08-03. The container ran as the
unprivileged `node` user with `PORT=10000`, reached Docker `healthy`, returned
ready status, and passed real Bailian ASR, Qwen policy, CosyVoice, Aleo lookup,
and metrics authorization checks.

### Free HTTPS Hosting Is Live On Render

The server accepts Bailian and CosyVoice credentials directly from environment
variables, so Zeabur or Render can deploy it without secret files. A Render
Blueprint and dashboard-only Zeabur instructions are included in
`docs/FREE_HOSTING.md`.

The public GitHub repository is current at
`https://github.com/Chengyuann/voice-rights-vault`. On 2026-08-03, Zeabur's
new-project flow for this account showed a server purchase flow rather than a
free shared-service path, so no Zeabur server was purchased. The Render
Blueprint fallback was deployed on the Free plan:

```text
https://voice-rights-vault.onrender.com
```

The generated HTTPS host uses environment-only secrets.

### Production Validation Passed On Public HTTPS

Public production verification passed with real Bailian ASR, Qwen allow/block
classification, CosyVoice `cosyvoice-v3.5-flash`, embedded provenance, accepted
Aleo Testnet lookup, Creator / Licensee / Verifier browser flow, and desktop /
mobile overflow checks.

During public-browser verification, the original CSP blocked `fetch(blob:...)`
for uploaded/recorded audio even though `media-src` allowed `blob:`. The server
CSP now includes `blob:` in `connect-src`, with a production smoke regression
assertion.

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
