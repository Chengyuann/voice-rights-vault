#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LEO="$ROOT/.tools/leo-4.4.0/leo"
PROGRAM="$ROOT/programs/voice_rights_v1"
REPORTS="$ROOT/outputs/test-reports"

mkdir -p "$REPORTS"

(
  cd "$PROGRAM"
  "$LEO" build \
    --disable-update-check \
    --json-output="$REPORTS/voice_rights_build.json" \
    >"$REPORTS/voice_rights_build.log" 2>&1

  "$LEO" test \
    --disable-update-check \
    --no-cache \
    --json-output="$REPORTS/voice_rights_test.json" \
    >"$REPORTS/voice_rights_test.log" 2>&1
)

tail -n 20 "$REPORTS/voice_rights_test.log"
