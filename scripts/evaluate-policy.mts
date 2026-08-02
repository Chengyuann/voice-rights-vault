import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { policyEvaluationResults, policyEvaluationSummary } from '../apps/web/src/policy-cases.ts'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const leoSource = readFileSync(resolve(root, 'programs/voice_rights_v1/src/main.leo'), 'utf8')
const mappings = [...leoSource.matchAll(/mapping\s+([a-z_]+)\s*:/g)].map((match) => match[1])

const privacyChecks = [
  { id: 'privacy-01', label: 'No raw audio field enters the program', passed: !/raw_audio|audio_bytes|speaker_embedding/i.test(leoSource) },
  { id: 'privacy-02', label: 'VoiceIdentity fields are private', passed: /record VoiceIdentity[\s\S]*?owner: address,[\s\S]*?issued_licenses: u32,/m.test(leoSource) },
  { id: 'privacy-03', label: 'VoiceLicense purpose, expiry, quota, and nonce remain in a Record', passed: /record VoiceLicense[\s\S]*?purpose: u8,[\s\S]*?expiry_height: u32,[\s\S]*?remaining_uses: u32,[\s\S]*?license_nonce: field,/m.test(leoSource) },
  { id: 'privacy-04', label: 'UsageReceipt content and policy commitments remain private', passed: /record UsageReceipt[\s\S]*?content_commitment: field,[\s\S]*?policy_commitment: field,/m.test(leoSource) },
  { id: 'privacy-05', label: 'Only two public mappings are defined', passed: mappings.length === 2 && mappings.includes('revoked') && mappings.includes('public_receipts') },
  { id: 'privacy-06', label: 'License consumption checks revocation in finalization', passed: /Mapping::get_or_use\(revoked,\s*revocation_id,\s*false\)/.test(leoSource) },
  { id: 'privacy-07', label: 'Receipt publication hashes the private receipt fields', passed: /BHP256::hash_to_field\(\s*ReceiptCommitmentSeed/.test(leoSource) },
  { id: 'privacy-08', label: 'Public receipt mapping stores only commitment to boolean', passed: /mapping public_receipts:\s*field => bool;/.test(leoSource) },
]

const privacyPassed = privacyChecks.filter((check) => check.passed).length
const report = {
  generated_at: new Date().toISOString(),
  policy: {
    methodology: 'Deterministic regression cases for the rule-first demo classifier; not an external benchmark.',
    ...policyEvaluationSummary,
    results: policyEvaluationResults,
  },
  privacy: {
    methodology: 'Static checks against the production Leo source and declared public mappings.',
    passed: privacyPassed,
    total: privacyChecks.length,
    checks: privacyChecks,
  },
}

const outputDir = resolve(root, 'outputs/evaluations')
mkdirSync(outputDir, { recursive: true })
writeFileSync(resolve(outputDir, 'policy-privacy.json'), `${JSON.stringify(report, null, 2)}\n`)

const groupRows = Object.entries(Object.groupBy(policyEvaluationResults, (result) => result.group)).map(([group, results]) => {
  const rows = results ?? []
  return `| ${group} | ${rows.filter((result) => result.passed).length} / ${rows.length} |`
}).join('\n')

const failures = policyEvaluationResults.filter((result) => !result.passed)
const markdown = `# Policy and Privacy Evaluation

Updated: ${report.generated_at.slice(0, 10)}

## Scope

This is a reproducible regression suite for the deterministic rule-first demo.
It is not presented as an external safety benchmark or a production ML
evaluation.

## Policy Results

**${policyEvaluationSummary.passed} / ${policyEvaluationSummary.total} cases passed.**

| Case group | Result |
|---|---:|
${groupRows}

${failures.length ? `Failures:\n\n${failures.map((failure) => `- ${failure.id}: expected ${failure.expectedDecision}/${failure.expectedPurpose}, got ${failure.actual.decision}/${failure.actual.purpose}`).join('\n')}` : 'No regression failures were found.'}

The cases cover allowed fictional dialogue, political persuasion, financial
impersonation, advertising, customer support, news, and healthcare purpose
mismatches. Boundary cases include fictional references to a bank, election,
and campaign that do not request real-world persuasion or credentials.

## Privacy Results

**${privacyPassed} / ${privacyChecks.length} static checks passed.**

${privacyChecks.map((check) => `- [${check.passed ? 'x' : ' '}] ${check.label}`).join('\n')}

## Reproduce

\`\`\`bash
node scripts/evaluate-policy.mts
\`\`\`

Machine-readable output:

\`\`\`text
outputs/evaluations/policy-privacy.json
\`\`\`
`

writeFileSync(resolve(root, 'docs/POLICY_PRIVACY_EVALUATION.md'), markdown)

console.log(`Policy: ${policyEvaluationSummary.passed}/${policyEvaluationSummary.total}`)
console.log(`Privacy: ${privacyPassed}/${privacyChecks.length}`)

if (policyEvaluationSummary.passed !== policyEvaluationSummary.total || privacyPassed !== privacyChecks.length) {
  process.exitCode = 1
}
