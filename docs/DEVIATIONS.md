# Deviations

Updated: 2026-08-02

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

It still requires an external hosting platform, TLS termination, monitoring,
and mounted secret files before public deployment. The server now includes
per-IP endpoint limits, structured anonymized request logs, `/readyz`,
authenticated `/metrics`, graceful shutdown, and Docker/Compose templates.

The Docker and Compose files were statically validated in the current
environment. An image build still requires a running Docker daemon.

### Free HTTPS Hosting Is Prepared, Not Yet Authorized

The server accepts Bailian and CosyVoice credentials directly from environment
variables, so Zeabur or Render can deploy it without secret files. A Render
Blueprint and dashboard-only Zeabur instructions are included in
`docs/FREE_HOSTING.md`.

The current local repository has no Git remote. Creating the public service
still requires the user to push the repository and authorize GitHub/GitLab in
the selected hosting dashboard.

### No Royalty Settlement

The MVP produces a private usage receipt but does not transfer real funds.
