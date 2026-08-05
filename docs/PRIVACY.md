# Privacy And Disclosure

Updated: 2026-08-02

## Data Inventory

| Data | Location | Retention | Public |
|---|---|---|---|
| enrollment audio | browser memory and temporary server processing | not persisted by app | no |
| transcript | browser state | current session | no |
| voice sample SHA-256 | browser/manifest | package lifetime | selectively disclosed |
| liveness challenge text | browser state | current challenge | no |
| challenge commitment | private commitment/manifest | package lifetime | selectively disclosed |
| cloned voice ID | server secret file | operator controlled | no |
| API key/workspace ID | server secret file | operator controlled | no |
| buyer, purpose, expiry, quota | private Aleo Record | ledger lifetime | no |
| revocation ID | Aleo public mapping | ledger lifetime | yes, unlinkable field |
| usage receipt fields | private Aleo Record | ledger lifetime | no |
| public receipt commitment | Aleo public mapping, opt-in | ledger lifetime | yes |
| generated MP3 | browser IndexedDB | until user deletes site data/record | local only |
| manifest | browser IndexedDB/download | until user deletes | selectively disclosed |
| request logs | server stdout/log sink | operator controlled | no |

## Privacy Invariants

1. Raw audio never enters the Leo program.
2. Buyer, policy, expiry, quota, and nonce remain private Record fields.
3. Public revocation stores only a field-to-boolean mapping.
4. Public receipt publication stores only a one-way commitment.
5. API keys and cloned voice IDs never enter the frontend bundle.
6. Request logs omit prompt text, audio bytes, transaction inputs, and raw IPs.
7. IndexedDB excludes enrollment audio, API keys, wallet secrets, and private
   Record plaintext.

## Selective Disclosure

A verifier may learn:

- whether the package is internally consistent;
- the licensed purpose class;
- the generated audio hash;
- the TTS provider/model name;
- policy and liveness booleans;
- an authorization transaction ID when the user includes one;
- whether an opt-in receipt commitment was published.

The verifier does not need:

- the buyer's identity;
- price;
- full policy terms;
- remaining quota;
- raw enrollment audio;
- the creator's wallet key.

## Local Persistence

Generated packages remain in browser IndexedDB after refresh. Users can
download or delete each package. Clearing site data deletes the local audit
history. It is intentionally device-local for the MVP; encrypted sync can be
added as a production hardening layer.

## Operator Responsibilities

- mount secret files read-only;
- enable TLS at the reverse proxy;
- protect metrics with a strong token;
- set a stable random rate-limit salt;
- configure log retention;
- avoid backing up temporary FFmpeg files;
- rotate Bailian credentials and cloned voice profiles when compromised.
