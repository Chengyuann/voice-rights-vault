#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LEO="$ROOT/.tools/leo-4.4.0/leo"
PROGRAM="$ROOT/programs/voice_rights_v1"
REPORTS="$ROOT/outputs/test-reports/proof-smoke"
ENDPOINT="http://127.0.0.1:3031"
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
    --socket-addr 127.0.0.1:3031 \
    --storage "$ROOT/.devnode/proof-smoke" \
    --clear-storage \
    --verbosity 0 \
    >"$REPORTS/devnode.log" 2>&1
) &
DEVNODE_PID=$!

for _ in $(seq 1 30); do
  if curl -fsS "$ENDPOINT/$NETWORK/block/height/latest" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

(
  cd "$PROGRAM"

  leo_cmd deploy \
    --broadcast \
    --yes \
    --max-wait 30 \
    --json-output="$REPORTS/deploy.json" \
    >"$REPORTS/deploy.log" 2>&1

  leo_cmd execute register_voice \
    111field 222field 333field \
    --broadcast \
    --yes \
    --max-wait 30 \
    --json-output="$REPORTS/register_voice.json" \
    >"$REPORTS/register_voice.log" 2>&1

  identity_record="$(jq -r '.outputs[0]' "$REPORTS/register_voice.json" | tr '\n' ' ')"

  leo_cmd execute issue_license \
    "$identity_record" \
    "$TEST_ADDRESS" \
    1u8 444field 1000u32 1u32 777field \
    --broadcast \
    --yes \
    --max-wait 30 \
    --json-output="$REPORTS/issue_license.json" \
    >"$REPORTS/issue_license.log" 2>&1

  license_record="$(jq -r '.outputs[1]' "$REPORTS/issue_license.json" | tr '\n' ' ')"
  claimed_height="$(curl -fsS "$ENDPOINT/$NETWORK/block/height/latest")"

  leo_cmd execute use_license \
    "$license_record" \
    1u8 888field "${claimed_height}u32" \
    --broadcast \
    --yes \
    --max-wait 30 \
    --json-output="$REPORTS/use_license.json" \
    >"$REPORTS/use_license.log" 2>&1

  usage_receipt="$(jq -r '.outputs[1]' "$REPORTS/use_license.json" | tr '\n' ' ')"

  leo_cmd execute publish_receipt \
    "$usage_receipt" \
    --broadcast \
    --yes \
    --max-wait 30 \
    --json-output="$REPORTS/publish_receipt.json" \
    >"$REPORTS/publish_receipt.log" 2>&1

  total_variables="$(rg -o 'Total Variables:\s+[0-9,]+' "$REPORTS/deploy.log" | rg -o '[0-9,]+' | tr -d ',')"
  total_constraints="$(rg -o 'Total Constraints:\s+[0-9,]+' "$REPORTS/deploy.log" | rg -o '[0-9,]+' | tr -d ',')"

  jq --slurpfile register "$REPORTS/register_voice.json" \
     --slurpfile issue "$REPORTS/issue_license.json" \
     --slurpfile use "$REPORTS/use_license.json" \
     --slurpfile publish "$REPORTS/publish_receipt.json" \
     --argjson total_variables "$total_variables" \
     --argjson total_constraints "$total_constraints" \
     '{
       deploy_tx: .deployments[0].transaction_id,
       program_size_bytes: .deployments[0].stats.program_size_bytes,
       total_variables: $total_variables,
       total_constraints: $total_constraints,
       register_tx: $register[0].transaction_id,
       issue_tx: $issue[0].transaction_id,
       use_tx: $use[0].transaction_id,
       publish_receipt_tx: $publish[0].transaction_id,
       published_receipt_commitment: $publish[0].outputs[0],
       proof_chain_accepted: true
     }' "$REPORTS/deploy.json" >"$REPORTS/summary.json"
)

cat "$REPORTS/summary.json"
