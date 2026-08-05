# Submission Checklist

Updated: 2026-08-03

Deadline from the implementation plan: 2026-08-14 23:59.

## Ready

- [x] Aleo program source
- [x] 11 / 11 Leo unit tests
- [x] devnode replay, quota, purpose, expiry, and revocation evidence
- [x] full-proof local execution evidence
- [x] public Testnet deployment
- [x] accepted register, issue, use, publish, and revoke transactions
- [x] Creator / Licensee / Verifier product flow
- [x] real Bailian ASR
- [x] consent, quality, and one-time liveness challenge
- [x] fail-closed local + Qwen policy gate
- [x] real CosyVoice generation
- [x] audio hash, ID3 provenance, Manifest, and external verifier
- [x] local audit history
- [x] production Node server
- [x] health, readiness, metrics, logs, limits, Docker, and Compose files
- [x] architecture, threat model, privacy, operations, and limitations docs
- [x] reproducible policy/privacy report
- [x] focused Web API validation tests
- [x] production HTTP smoke script
- [x] real Bailian ASR, Qwen policy, CosyVoice, provenance, and Aleo lookup verification
- [x] Git history scan against the current real secret values
- [x] VoiceRights-only 80-second H.264/AAC demo video
- [x] final submission document

## Submission Complete

- [x] record app-side wallet adapter compatibility evidence
- [x] choose public hosting provider: Render Free
- [x] prepare Zeabur/Render free-hosting configuration and secret variables
- [x] configure generated HTTPS host
- [x] mount production secrets in Render
- [x] run Docker image build and container smoke with `PORT=10000`
- [x] publish public Demo URL
- [x] record final 80-second demo video
- [x] publish repository URL
- [x] complete submission form
- [x] perform final claim review against `docs/EVIDENCE_NOTES.md`

## Final Verification Commands

```bash
scripts/verify-contract.sh
ALEO_TEST_PRIVATE_KEY=... scripts/devnode-smoke.sh
node scripts/evaluate-policy.mts
cd apps/web
npm ci
npm test
npm run build
npm run lint
npm run smoke:production
```

Optional full proof:

```bash
ALEO_TEST_PRIVATE_KEY=... scripts/proof-smoke.sh
```

Production smoke:

```bash
cd apps/web
HOST=127.0.0.1 PORT=4174 npm start
curl http://127.0.0.1:4174/healthz
curl http://127.0.0.1:4174/readyz
```

## Submission Fields

Project:

> VoiceRights Vault

Tagline:

> Your voice can be cloned. Your rights should not be.

Short description:

> VoiceRights Vault is a privacy-preserving AI voice licensing agent built on
> Aleo. Creators issue private, purpose-scoped, expiring, usage-limited voice
> licenses. Every authorized synthesis consumes a license and produces a
> private receipt, while verifiers can check minimal provenance without seeing
> buyer identity, price, policy details, or remaining quota.

Required URLs:

```text
Repository:  https://github.com/Chengyuann/voice-rights-vault
Demo:        https://voice-rights-vault.onrender.com
Video:       https://voice-rights-vault.onrender.com/demo-video.mp4
Aleo program: https://testnet.explorer.provable.com/program/voice_rights_v1.aleo
```

Prepared Render Blueprint URL:

```text
https://dashboard.render.com/blueprint/new?repo=https://github.com/Chengyuann/voice-rights-vault
```

Public verification evidence:

```text
outputs/test-reports/render-public-e2e.json
apps/web/output/playwright/render-public-e2e-desktop.png
apps/web/output/playwright/render-public-mobile.png
```

Full submission copy and current evidence:

```text
docs/FINAL_SUBMISSION.md
```
