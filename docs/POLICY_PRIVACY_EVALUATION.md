# Policy and Privacy Evaluation

Updated: 2026-08-02

## Scope

This is a reproducible regression suite for the deterministic rule-first demo.
It is not presented as an external safety benchmark or a production ML
evaluation.

## Policy Results

**30 / 30 cases passed.**

| Case group | Result |
|---|---:|
| allowed narrative | 10 / 10 |
| political persuasion | 5 / 5 |
| financial impersonation | 5 / 5 |
| advertising mismatch | 5 / 5 |
| other purpose mismatch | 5 / 5 |

No regression failures were found.

The cases cover allowed fictional dialogue, political persuasion, financial
impersonation, advertising, customer support, news, and healthcare purpose
mismatches. Boundary cases include fictional references to a bank, election,
and campaign that do not request real-world persuasion or credentials.

## Privacy Results

**8 / 8 static checks passed.**

- [x] No raw audio field enters the program
- [x] VoiceIdentity fields are private
- [x] VoiceLicense purpose, expiry, quota, and nonce remain in a Record
- [x] UsageReceipt content and policy commitments remain private
- [x] Only two public mappings are defined
- [x] License consumption checks revocation in finalization
- [x] Receipt publication hashes the private receipt fields
- [x] Public receipt mapping stores only commitment to boolean

## Reproduce

```bash
node scripts/evaluate-policy.mts
```

Machine-readable output:

```text
outputs/evaluations/policy-privacy.json
```
