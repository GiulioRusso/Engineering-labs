#!/usr/bin/env bash
# Headless-Chrome smoke test over every built lab, from file://. See smoke.mjs.
set -euo pipefail
cd "$(dirname "$0")/.."
node tools/smoke.mjs "$@"
