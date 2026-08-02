# Aleo Evidence

Updated: 2026-08-02

## Toolchain

```text
leo 4.4.0 (320a595 HEAD) features=[noconfig]
platform: aarch64-apple-darwin
```

Release archive SHA-256:

```text
9419fc6f0af52f5f315c363e2cc33079275436bb497b6fcb4a0abe1c468f7dbe
```

The 4.4.0 migration replaced removed Leo source syntax with
`std::ctx::signer()` and `std::ctx::block_height()`. The generated Aleo
instructions and contract behavior remain equivalent.

## Public Testnet

Program:

```text
voice_rights_v1.aleo
```

Deployment:

```text
status: accepted
owner: aleo157paujr5h54grzxt3t2ggw2gxun29gu8eh9q3dxkvffvp87f5yzs3lmcwy
fee: 13.007115 credits
transaction: at1wa9erh058vw4u6tzkwm0qm7yy2cjs0ag37vm8klgm6rvf2gfysfqx85qlr
```

Accepted public transactions:

```text
register_voice:  at1gctpxe4xqr0vcmxpt54xhs7edk7wem0fp0pdu7jyewrla54pjgpsd8q364
issue_license:   at188jn3mcpa8pzz26djds2vaxr9f3rqrqgqkftfrf2ml6wrdlql5qqxgy0ff
use_license:     at1zzg59ljxkrwr3c2wth7zeugspzz3gxetljat6f3ej3t0s9dtc5zqk92hxz
publish_receipt: at1nuze2r4eu8njc0mcexe42rtt7jael58ye4r2pucm9xlclr4efufqpfsd6h
revoke_license:  at14666phn8z7ssryfsmlxn8n0xamuuvsx86krykaeqy8a0p6fhzgpssmthyc
```

The public flow used claimed height `18399760`, expiry height `18409753`,
and published this receipt commitment:

```text
6610397435077743748010476664191631872108731393908470993207354402980420406990field
```

Explorer:

```text
https://testnet.explorer.provable.com/program/voice_rights_v1.aleo
https://testnet.explorer.provable.com/transaction/at1wa9erh058vw4u6tzkwm0qm7yy2cjs0ag37vm8klgm6rvf2gfysfqx85qlr
https://testnet.explorer.provable.com/transaction/at1zzg59ljxkrwr3c2wth7zeugspzz3gxetljat6f3ej3t0s9dtc5zqk92hxz
```

Machine-readable evidence is stored in:

```text
outputs/test-reports/testnet/summary.json
outputs/test-reports/testnet/*-confirmed.json
```

## Unit Tests

Command:

```bash
scripts/verify-contract.sh
```

Result:

```text
11 / 11 tests passed
```

Covered:

- valid voice registration
- empty voice commitment rejection
- valid license issuance
- zero purpose rejection
- zero initial quota rejection
- empty identity commitment rejection variants
- empty/invalid license field rejection variants
- revocation finalization execution
- `publish_receipt` ABI generation

License consumption constraints are tested at transaction level through the
devnode smoke test because production `use_license` includes ledger-height and
revocation finalization.

## Devnode

Command:

```bash
scripts/devnode-smoke.sh
```

Latest result:

```json
{
  "deploy_tx": "at1sl9jyw0pwpyynfksszngwdr4q3ucjzhucu5dka8ahuwlc3nrgvgsssgw0y",
  "program_size_bytes": 5096,
  "register_tx": "at1m4e86ta3sehueqrstzmck0ekk67zen059wzr3tku8mqgpl9x9g9s2p7kee",
  "issue_tx": "at1g4xza06mtaf7rwleupr98qge9rnnq7dfhzavh24wxml9y0zd8ggqa58wwv",
  "use_tx": "at1cx2e8uddvrtv6euzrkl4huffmjqvckggz6p9e3dqce5dht4gp5rqa2vk33",
  "use_last_quota_tx": "at1m8k40zmd5ck6zr883k9g0z86a2yedl0ct3kn24e3k5t6j256jgfqzg09vc",
  "publish_receipt_tx": "at1l6any7s94zdsyahy5zn4gsskza5hu3vrcsswm4xg2n9vw35ekvqs6cde2v",
  "published_receipt_commitment": "5995717436235304422299799340888026181168199597914901529216463999649839251551field",
  "revoke_tx": "at1s7ss9a0n7w7mcww7m02u4gn7dzlhs4tl4u7zdg9l350drqvgegzq22ptp7",
  "remaining_uses": 1,
  "final_remaining_uses": 0,
  "replay_rejected": true,
  "exhausted_quota_rejected": true,
  "wrong_purpose_rejected": true,
  "revoked_license_rejected": true,
  "receipt_commitment_published": true
}
```

These transaction IDs belong to an ephemeral local devnode and are not
discoverable on the public Aleo explorer.

The deployment used:

```text
--skip-deploy-certificate
--skip-execute-proof
```

This is appropriate for local transaction-state testing, but it does not prove
public-network availability. The separate proof smoke below validates circuit
generation and full local proof execution.

## Full-Proof Devnode

Command:

```bash
scripts/proof-smoke.sh
```

Verified manually with the equivalent scripted flow:

```text
Program size:       4.98 KB
Total variables:    589,600 / 2,097,152
Total constraints:  472,059 / 2,097,152
Deployment tx:      at1kzjmqsqdyl6zxwlgs5pgv02k3ptuqs2jxdf72c3k2hrgj0cxqgzs0c49xt
Register tx:        at14szv6mu5s0g2y20xxm3p6t4g60rhk6gp3nawwuy3zrdcswa39qpsts0qmu
Issue tx:           at1pa3tnxt3u6dazrltvawfdq9m48kzzg6mvh020uw35nza6g7qyg9q005xr2
Use tx:             at1ngkr9kt7d0dd992hqeqrf73235259g5u3x9vqxgk6jf093hj4cgqv8jct5
Publish receipt tx: at1v58k65070jmkkgnlg3v3sr4kke82u9naskxgfc4845667vghc5qstcv69l
```

The deployment used a real deployment certificate. All four executions used
real proofs and were accepted by the local devnode.

## Replay Evidence

The smoke test broadcasts the exact same old `VoiceLicense` Record twice.

The second broadcast is rejected with:

```text
The input ID '...' already exists in the ledger
```

This demonstrates transaction-level prevention of old Record reuse.

## Purpose Evidence

The smoke test uses a valid `GAME_NPC` license with requested purpose
`POLITICAL`. Execution fails at:

```text
assert.eq requested_purpose license.purpose
```

No transaction is broadcast for the mismatched request.

## Height and Revocation Design

The private proof context checks:

```text
claimed_height <= private expiry_height
```

The same transaction finalizes only when:

```text
claimed_height <= block.height <= claimed_height + 120
revoked[BHP256(private voice commitment, private license nonce)] == false
```

This design prevents a client from bypassing revocation or claiming a future
height while allowing browser-wallet proof generation and network inclusion
delay. The claimed height must still be no later than the private expiry.

## Public Receipt Commitment

`publish_receipt` consumes a private `UsageReceipt` owned by the signer and
publishes only a one-way commitment to `public_receipts`.

The latest devnode smoke test executed the transition and verified:

```text
public_receipts[published_receipt_commitment] == true
```

The public mapping does not contain buyer, full policy, remaining quota,
content text, or raw audio.

## Remaining Evidence

- recorded end-to-end Shield Wallet compatibility run against the public program
- public Web URL
- submission video

## Policy and Privacy Evaluation

Command:

```bash
node scripts/evaluate-policy.mts
```

Result:

```text
policy regression: 30 / 30
privacy checks: 8 / 8
```

The policy cases are a deterministic regression suite for the rule-first demo,
not an external benchmark. They cover allowed fictional dialogue, political
persuasion, financial impersonation, advertising, customer support, news, and
healthcare purpose mismatches.

The privacy audit checks the production Leo source for private Record fields,
the two intended public mappings, atomic revocation enforcement, and
commitment-only receipt publication.

Reports:

```text
docs/POLICY_PRIVACY_EVALUATION.md
outputs/evaluations/policy-privacy.json
```

## Web Demo

Command:

```bash
cd apps/web
npm run build
npm run lint
```

Result:

```text
build passed
lint passed
browser console warnings: 0
390px mobile horizontal overflow: false
```

Additional browser audit after wallet UI integration:

```text
simulation flow: authorized and receipt commitment published
wallet mode: live controls disabled before wallet connection
injected wallet flow: all five transitions submitted in order
injected wallet flow: wallet-side Record requests match ABI record types
injected wallet flow: TTS stays locked while use_license is pending
desktop/mobile horizontal overflow: false
console warnings/errors: 0
```

Screenshots:

```text
apps/web/output/playwright/voice-rights-desktop-final.png
apps/web/output/playwright/voice-rights-mobile-final.png
```
