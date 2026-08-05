# Demo Script

Updated: 2026-08-03

Final video length: 80.73 seconds.

## 0:00-0:09 — Problem And Product

Show the home screen.

Narration:

> AI can clone a voice in seconds, but permission, purpose, quota, and
> revocation are usually handled by opaque platform databases. VoiceRights
> Vault makes those rights private and programmable on Aleo.

## 0:09-0:19 — Creator Identity

Open Creator Studio.

1. Point to the one-time liveness challenge.
2. Explain that Wallet mode requires a live microphone recording.
3. For the deterministic recording, use the local consent sample.
4. Click **Verify sample with Bailian ASR**.
5. Click **Create voice identity**.

Call out:

- quality and consent gates;
- raw audio stays off-chain;
- only a salted commitment becomes a private `VoiceIdentity`.

## 0:19-0:29 — Private License

Show the default policy and license request.

Click **Sign private license**.

Narration:

> The license privately carries purpose, expiry, remaining uses, policy, and a
> revocation nonce. It is not a public NFT.

## 0:29-0:41 — Authorized Generation

Use:

> Welcome, traveler. The northern gate closes at sunset.

Click **Authorize on Aleo and run CosyVoice**.

Show:

- local and Qwen policy gates allow `GAME_NPC`;
- quota changes from 3 to 2;
- receipt is created before TTS;
- real CosyVoice audio is returned;
- Manifest and audio can be downloaded.

## 0:41-0:50 — Misuse Rejection

Select **Political misuse**.

Click authorize.

Show:

- local and remote policy block the request;
- Aleo/TTS are not called;
- quota remains 2.

Optionally repeat with financial impersonation.

## 0:50-1:01 — Verification

Return to the authorized package or load it from local audit history.

Open Verifier and click **Use current generated package**.

Show checks for:

- SHA-256;
- ID3 VoiceRights provenance;
- receipt and policy;
- liveness evidence;
- Aleo Testnet transaction when Wallet mode is used.

State clearly:

> Simulation proves package consistency. Testnet mode additionally verifies the
> accepted `use_license` transaction.

## 1:01-1:12 — Aleo Testnet Evidence

Show the accepted Testnet program and five business transitions:

- register;
- issue;
- use;
- publish receipt;
- revoke.

State that buyer, policy, and quota remain private.

## 1:12-1:18 — Close

Show the VoiceRights Vault product identity and repository.

Closing line:

> Your voice can be cloned. Your rights should not be.

## Recording Checklist

- use a clean browser profile;
- keep Simulation mode for the stable main recording;
- record Wallet mode separately when Shield compatibility is confirmed;
- do not display `.secrets`, wallet keys, API keys, or private Record plaintext;
- capture the accepted Explorer links;
- keep claims consistent with `docs/DEVIATIONS.md`.

Final artifact:

```text
apps/web/output/Voice-Rights-Aleo-refined.mp4
```
