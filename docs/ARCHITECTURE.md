# Architecture

Updated: 2026-08-02

## System

VoiceRights Vault separates private authorization, off-chain voice processing,
and minimal public evidence.

```text
Creator / Licensee / Verifier browser workspace
  |
  | same-origin HTTPS
  v
Node production service
  |- Bailian Fun-ASR
  |- Qwen3.5-Flash policy classifier
  |- CosyVoice cloned speech
  |- FFmpeg / FFprobe provenance tools
  |- Provable Testnet transaction lookup
  |
  v
Aleo voice_rights_v1.aleo
  |- VoiceIdentity private Record
  |- VoiceLicense private Record
  |- UsageReceipt private Record
  |- revoked public mapping
  `- public_receipts public mapping
```

## Trust Boundaries

| Boundary | Trusted with | Must not receive |
|---|---|---|
| Browser | selected/recorded audio, prompts, private wallet UI, generated MP3 | API keys, cloned voice ID, server secrets |
| Node service | Bailian credentials, cloned voice ID, temporary audio processing | wallet private key, Aleo private Record plaintext |
| Shield Wallet | private Records, transaction approval | Bailian API key, server voice profile |
| Aleo program | commitments and private Record fields | raw audio, transcript, speaker embedding, prompt text |
| Public mappings | revocation IDs and opt-in receipt commitments | buyer, price, quota, full policy, raw audio |

## Creator Flow

1. Generate a one-time liveness challenge.
2. Record or upload a voice sample.
3. Check duration, RMS level, peak level, and silence ratio locally.
4. Send audio bytes to the server-side Fun-ASR adapter.
5. Require the fixed consent phrase; Wallet mode also requires the full
   microphone-bound random challenge.
6. Salt the audio hash, transcript evidence, quality evidence, and challenge
   commitment into `voice_commitment`.
7. Register the commitment as a private `VoiceIdentity`.

The challenge is consumed after registration. Rotating it invalidates the old
recording.

## License And Generation Flow

1. Creator consumes the current `VoiceIdentity` and issues a private
   `VoiceLicense`.
2. Licensee submits a generation request.
3. The local rule classifier and Qwen3.5-Flash must both return
   `GAME_NPC / allow`.
4. `use_license` checks ownership, purpose, quota, private expiry, bounded
   inclusion height, and public revocation state.
5. Aleo consumes the old license and returns a reduced-quota license plus a
   private `UsageReceipt`.
6. Only after authorization does CosyVoice generate audio.
7. The server embeds a versioned VoiceRights ID3 payload.
8. The browser computes the final MP3 SHA-256 and stores the MP3/manifest pair
   in IndexedDB.

## Verification Flow

The Verifier accepts an MP3 and manifest. It:

1. recomputes MP3 SHA-256;
2. extracts the ID3 VoiceRights payload with FFprobe;
3. checks provenance ID, purpose, receipt commitment, policy, liveness, and
   challenge commitment;
4. queries the Provable Testnet API when transaction IDs are present;
5. requires accepted `voice_rights_v1.aleo/use_license`;
6. requires accepted `publish_receipt` when public publication is claimed.

Simulation packages prove package consistency. They are not presented as
Testnet transaction evidence.

## Runtime

Development uses Vite with the shared API middleware. Production uses
`server/index.ts`, which serves `dist/` and the same API handlers.

Production controls include CSP, request IDs, per-client endpoint limits,
anonymized structured logs, `/healthz`, `/readyz`, authenticated `/metrics`,
graceful shutdown, and Docker/Compose templates.

## Storage

- `.secrets/`: server-only credentials, cloned voice ID, local preview sample.
- Aleo private Records: identity, license, receipt.
- Aleo public mappings: revocation and optional receipt commitment only.
- Browser IndexedDB: final generated MP3 and manifest snapshots.
- Temporary server directories: FFmpeg/FFprobe scratch data, deleted after use.

No raw enrollment audio is written to Aleo or IndexedDB.
