# VoiceRights Vault Web

React + TypeScript product demo for private, usage-limited AI voice licensing
on Aleo.

## Included

- fixed-viewport module workspace with hash navigation
- Motion-powered enter and exit transitions
- Creator, Licensee, and Verifier workspaces
- browser-local SHA-256 and salted commitment demo
- deterministic browser flow plus optional live Shield Wallet execution
- fail-closed local + Qwen3.5-Flash policy classification
- 30-case policy regression and 8-check privacy audit
- authorized, political, financial impersonation, expired, exhausted, and
  revoked scenarios
- receipt-gated CosyVoice synthesis and downloadable manifest
- selective disclosure and privacy-boundary views
- Aleo proof evidence and implementation-plan status board
- optional Shield Wallet mode using the official
  `@provablehq/aleo-wallet-adaptor-*` packages

The deterministic browser flow keeps the public demo repeatable. Wallet mode can
submit `register_voice`, `issue_license`, `use_license`, `revoke_license`, and
`publish_receipt` to the deployed `voice_rights_v1.aleo` Testnet program when
the wallet has fees. Public Testnet and local devnode evidence is documented in
`../../docs/ALEO_EVIDENCE.md`.

Public demo: https://voice-rights-vault.onrender.com

## Run

```bash
npm install
npm run dev -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173/`.

## Verify

```bash
npm run build
npm run evaluate
npm run lint
npm test
npm run smoke:production
```
