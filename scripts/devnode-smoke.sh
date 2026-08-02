#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LEO="$ROOT/.tools/leo-4.4.0/leo"
PROGRAM="$ROOT/programs/voice_rights_v1"
REPORTS="$ROOT/outputs/test-reports/devnode-smoke"
ENDPOINT="http://127.0.0.1:3030"
NETWORK="testnet"

: "${ALEO_TEST_PRIVATE_KEY:?Set ALEO_TEST_PRIVATE_KEY to a disposable local devnode key.}"
TEST_KEY="$ALEO_TEST_PRIVATE_KEY"
TEST_ADDRESS="${ALEO_TEST_ADDRESS:-aleo1rhgdu77hgyqd3xjj8ucu3jj9r2krwz6mnzyd80gncr5fxcwlh5rsvzp9px}"

mkdir -p "$REPORTS"

leo_cmd() {
  "$LEO" "$@" \
    --disable-update-check \
    --network "$NETWORK" \
    --endpoint "$ENDPOINT" \
    --private-key "$TEST_KEY" \
    --devnet
}

wait_for_node() {
  for _ in $(seq 1 30); do
    if curl -fsS "$ENDPOINT/$NETWORK/block/height/latest" >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
  done
  return 1
}

cleanup() {
  if [[ -n "${DEVNODE_PID:-}" ]] && kill -0 "$DEVNODE_PID" 2>/dev/null; then
    kill "$DEVNODE_PID" 2>/dev/null || true
    wait "$DEVNODE_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

(
  cd "$PROGRAM"
  "$LEO" devnode start \
    --disable-update-check \
    --private-key "$TEST_KEY" \
    --socket-addr 127.0.0.1:3030 \
    --storage "$ROOT/.devnode/smoke" \
    --clear-storage \
    --verbosity 0 \
    >"$REPORTS/devnode.log" 2>&1
) &
DEVNODE_PID=$!

wait_for_node

(
  cd "$PROGRAM"

  leo_cmd deploy \
    --skip-deploy-certificate \
    --broadcast \
    --yes \
    --max-wait 20 \
    --json-output="$REPORTS/deploy.json" \
    >"$REPORTS/deploy.log" 2>&1

  leo_cmd execute register_voice \
    101field 202field 303field \
    --skip-execute-proof \
    --broadcast \
    --yes \
    --max-wait 20 \
    --json-output="$REPORTS/register_voice.json" \
    >"$REPORTS/register_voice.log" 2>&1

  identity_record="$(jq -r '.outputs[0]' "$REPORTS/register_voice.json" | tr '\n' ' ')"

  leo_cmd execute issue_license \
    "$identity_record" \
    "$TEST_ADDRESS" \
    1u8 404field 1000u32 2u32 606field \
    --skip-execute-proof \
    --broadcast \
    --yes \
    --max-wait 20 \
    --json-output="$REPORTS/issue_license.json" \
    >"$REPORTS/issue_license.log" 2>&1

  license_record="$(jq -r '.outputs[1]' "$REPORTS/issue_license.json" | tr '\n' ' ')"
  identity_after_issue="$(jq -r '.outputs[0]' "$REPORTS/issue_license.json" | tr '\n' ' ')"
  claimed_height="$(curl -fsS "$ENDPOINT/$NETWORK/block/height/latest")"

  leo_cmd execute use_license \
    "$license_record" \
    1u8 707field "${claimed_height}u32" \
    --skip-execute-proof \
    --broadcast \
    --yes \
    --max-wait 20 \
    --json-output="$REPORTS/use_license.json" \
    >"$REPORTS/use_license.log" 2>&1

  next_license="$(jq -r '.outputs[0]' "$REPORTS/use_license.json" | tr '\n' ' ')"
  second_claimed_height="$(curl -fsS "$ENDPOINT/$NETWORK/block/height/latest")"

  leo_cmd execute use_license \
    "$next_license" \
    1u8 1001field "${second_claimed_height}u32" \
    --skip-execute-proof \
    --broadcast \
    --yes \
    --max-wait 20 \
    --json-output="$REPORTS/use_last_quota.json" \
    >"$REPORTS/use_last_quota.log" 2>&1

  empty_license="$(jq -r '.outputs[0]' "$REPORTS/use_last_quota.json" | tr '\n' ' ')"
  usage_receipt="$(jq -r '.outputs[1]' "$REPORTS/use_license.json" | tr '\n' ' ')"
  exhausted_claimed_height="$(curl -fsS "$ENDPOINT/$NETWORK/block/height/latest")"

  leo_cmd execute publish_receipt \
    "$usage_receipt" \
    --skip-execute-proof \
    --broadcast \
    --yes \
    --max-wait 20 \
    --json-output="$REPORTS/publish_receipt.json" \
    >"$REPORTS/publish_receipt.log" 2>&1

  receipt_commitment="$(jq -r '.outputs[0]' "$REPORTS/publish_receipt.json" | tr -d '\n')"
  receipt_is_public="$(
    curl -fsS "$ENDPOINT/$NETWORK/program/voice_rights_v1.aleo/mapping/public_receipts/$receipt_commitment" |
      jq -r '.'
  )"
  if [[ "$receipt_is_public" != "true" ]]; then
    echo "Expected published receipt commitment in public mapping" >&2
    exit 1
  fi

  set +e
  leo_cmd execute use_license \
    "$license_record" \
    1u8 808field "${claimed_height}u32" \
    --skip-execute-proof \
    --broadcast \
    --yes \
    --max-wait 20 \
    >"$REPORTS/replay_old_license.log" 2>&1
  replay_status=$?

  leo_cmd execute use_license \
    "$empty_license" \
    1u8 1002field "${exhausted_claimed_height}u32" \
    --skip-execute-proof \
    --broadcast \
    --yes \
    --max-wait 20 \
    >"$REPORTS/exhausted_quota.log" 2>&1
  exhausted_status=$?

  leo_cmd execute use_license \
    "$next_license" \
    4u8 909field "${claimed_height}u32" \
    --skip-execute-proof \
    --broadcast \
    --yes \
    --max-wait 20 \
    >"$REPORTS/wrong_purpose.log" 2>&1
  purpose_status=$?
  set -e

  if [[ "$replay_status" -eq 0 ]]; then
    echo "Expected old-license replay to fail" >&2
    exit 1
  fi
  if ! rg -q "already exists in the ledger" "$REPORTS/replay_old_license.log"; then
    echo "Replay failed for an unexpected reason" >&2
    exit 1
  fi

  if [[ "$purpose_status" -eq 0 ]]; then
    echo "Expected purpose mismatch to fail" >&2
    exit 1
  fi
  if ! rg -q "assert.eq.*failed" "$REPORTS/wrong_purpose.log"; then
    echo "Purpose mismatch failed for an unexpected reason" >&2
    exit 1
  fi

  if [[ "$exhausted_status" -eq 0 ]]; then
    echo "Expected exhausted quota to fail" >&2
    exit 1
  fi
  if ! rg -q "remaining_uses > 0u32|assert.*failed" "$REPORTS/exhausted_quota.log"; then
    echo "Exhausted quota failed for an unexpected reason" >&2
    exit 1
  fi

  leo_cmd execute issue_license \
    "$identity_after_issue" \
    "$TEST_ADDRESS" \
    1u8 404field 1000u32 1u32 707field \
    --skip-execute-proof \
    --broadcast \
    --yes \
    --max-wait 20 \
    --json-output="$REPORTS/issue_revocable_license.json" \
    >"$REPORTS/issue_revocable_license.log" 2>&1

  identity_for_revoke="$(jq -r '.outputs[0]' "$REPORTS/issue_revocable_license.json" | tr '\n' ' ')"
  revocable_license="$(jq -r '.outputs[1]' "$REPORTS/issue_revocable_license.json" | tr '\n' ' ')"

  leo_cmd execute revoke_license \
    "$identity_for_revoke" \
    707field \
    --skip-execute-proof \
    --broadcast \
    --yes \
    --max-wait 20 \
    --json-output="$REPORTS/revoke_license.json" \
    >"$REPORTS/revoke_license.log" 2>&1

  revoked_claimed_height="$(curl -fsS "$ENDPOINT/$NETWORK/block/height/latest")"

  set +e
  leo_cmd execute use_license \
    "$revocable_license" \
    1u8 1003field "${revoked_claimed_height}u32" \
    --skip-execute-proof \
    --broadcast \
    --yes \
    --max-wait 20 \
    --json-output="$REPORTS/use_revoked_license.json" \
    >"$REPORTS/use_revoked_license.log" 2>&1
  revoked_status=$?
  set -e

  if [[ "$revoked_status" -eq 0 ]] && ! rg -q "Transaction rejected" "$REPORTS/use_revoked_license.log"; then
    echo "Expected revoked license to be rejected" >&2
    exit 1
  fi
  if ! rg -q "Transaction rejected|assert.*failed" "$REPORTS/use_revoked_license.log"; then
    echo "Revoked license failed for an unexpected reason" >&2
    exit 1
  fi

  jq '{
    deploy_tx: .deployments[0].transaction_id,
    program_size_bytes: .deployments[0].stats.program_size_bytes
  }' "$REPORTS/deploy.json" >"$REPORTS/summary.json"

  jq --slurpfile deploy "$REPORTS/deploy.json" \
     --slurpfile register "$REPORTS/register_voice.json" \
     --slurpfile issue "$REPORTS/issue_license.json" \
     --slurpfile use "$REPORTS/use_license.json" \
     --slurpfile last "$REPORTS/use_last_quota.json" \
     --slurpfile publish "$REPORTS/publish_receipt.json" \
     --slurpfile revoke "$REPORTS/revoke_license.json" \
     '. + {
       register_tx: $register[0].transaction_id,
       issue_tx: $issue[0].transaction_id,
       use_tx: $use[0].transaction_id,
       use_last_quota_tx: $last[0].transaction_id,
       publish_receipt_tx: $publish[0].transaction_id,
       published_receipt_commitment: $publish[0].outputs[0],
       revoke_tx: $revoke[0].transaction_id,
       remaining_uses: ($use[0].outputs[0] | capture("remaining_uses: (?<n>[0-9]+)u32").n | tonumber),
       final_remaining_uses: ($last[0].outputs[0] | capture("remaining_uses: (?<n>[0-9]+)u32").n | tonumber),
       replay_rejected: true,
       exhausted_quota_rejected: true,
       wrong_purpose_rejected: true,
       revoked_license_rejected: true,
       receipt_commitment_published: true
     }' "$REPORTS/summary.json" >"$REPORTS/summary.tmp.json"
  mv "$REPORTS/summary.tmp.json" "$REPORTS/summary.json"
)

cat "$REPORTS/summary.json"
