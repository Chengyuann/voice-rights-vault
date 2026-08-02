# Threat Model

Updated: 2026-08-02

## Assets

- creator voice authorization;
- private Aleo Records;
- remaining license quota;
- policy and purpose restrictions;
- Bailian API credentials and cloned voice ID;
- generated audio and provenance package;
- wallet signing authority.

## Adversaries

- a user attempting to register someone else's voice;
- a licensee replaying or modifying a private license;
- a prompt attacker attempting to bypass policy;
- a verifier receiving swapped audio and manifests;
- an operator or log sink accidentally exposing secrets;
- a network client exhausting paid model APIs.

## Threats And Controls

| Threat | Current control | Residual risk |
|---|---|---|
| Replayed enrollment audio | one-time microphone challenge, nonce binding, consumed challenge | no speaker embedding or legal identity proof |
| Uploaded challenge recording | upload source never qualifies as liveness | compromised browser could misreport source |
| Quiet or empty recording | local duration, peak, RMS, and silence checks | not a full audio quality model |
| Stolen private license replay | Aleo Record consumption | wallet compromise remains possible |
| Purpose or quota modification | private Record constraints in `use_license` | relies on Aleo/wallet correctness |
| Revocation bypass | atomic finalization mapping check | bounded inclusion window is 120 blocks |
| Prompt policy bypass | deterministic rules plus fail-closed Qwen classifier | no external benchmark or human review |
| Direct TTS call | same-origin server route, authorization order in app | server does not independently verify Aleo Record plaintext |
| Audio/manifest swap | final MP3 SHA-256 and ID3/manifest cross-check | ID3 is not cryptographically signed C2PA |
| Fake Testnet transaction | Provable API lookup and program/function checks | upstream availability and trust |
| API cost exhaustion | route-specific token-bucket limits | in-memory limits reset on process restart |
| Secret leakage in logs | route-level structured logs, hashed client address | hosting platform may add its own logs |
| Secret leakage in bundle | server-only files and build scans | deployment misconfiguration remains possible |
| Browser audit theft | local IndexedDB excludes enrollment audio and secrets | final generated audio is intentionally stored locally |

## High-Risk Actions

Wallet confirmation is required for:

- voice identity registration;
- private license issuance;
- license consumption in Wallet mode;
- revocation;
- public receipt commitment publication.

## Fail-Closed Behavior

Generation does not proceed when:

- quality or consent checks fail;
- Wallet mode lacks live challenge evidence;
- the local or remote policy gate rejects;
- the remote policy model is unavailable or malformed;
- license, expiry, quota, purpose, or revocation checks fail;
- TTS or provenance embedding fails.

## Explicit Non-Claims

The system does not claim that:

- a voice challenge proves legal identity;
- all deepfakes are prevented;
- all generated content is lawful;
- ID3 metadata is a C2PA signature;
- the usage receipt transfers royalties;
- revocation deletes previously generated audio.
