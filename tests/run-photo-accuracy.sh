#!/usr/bin/env bash
# Keys exist only in this process and its test child, never in shell history/files.
set -e
cd "$(dirname "$0")/.."
if [ -z "${1:-}" ] || [ ! -f "$1" ]; then
    printf 'Usage: bash tests/run-photo-accuracy.sh /absolute/path/to/private-manifest.json\n'
    exit 1
fi
export APEX_EVAL_MANIFEST="$1"
eval_runtime='/Users/ken/.cache/codex-runtimes/codex-primary-runtime/dependencies/node'
if [ -x "$eval_runtime/bin/node" ]; then
    eval_node="$eval_runtime/bin/node"
    export NODE_PATH="$eval_runtime/node_modules"
else
    eval_node="$(command -v node)"
fi
"$eval_node" tests/actual-photo-accuracy.cjs --preflight
printf '\nThis sends the listed inspection photos to Claude and consumes API usage.\n'
printf 'Paste your Claude API key, then press Return (input is hidden): '
IFS= read -r -s APEX_EVAL_API_KEY
printf '\n'
if [ -z "$APEX_EVAL_API_KEY" ]; then printf 'No key entered; cancelled.\n'; exit 1; fi
export APEX_EVAL_API_KEY
trap 'unset APEX_EVAL_API_KEY' EXIT
printf 'Workspace ID, if your API setup requires one (otherwise press Return): '
IFS= read -r APEX_EVAL_WORKSPACE_ID
export APEX_EVAL_WORKSPACE_ID
eval_report_dir="$(mktemp -d /private/tmp/apex-accuracy.XXXXXX)"
export APEX_EVAL_REPORT="$eval_report_dir/results.json"
set +e
"$eval_node" tests/actual-photo-accuracy.cjs --live
eval_status=$?
unset APEX_EVAL_API_KEY
if [ -f "$APEX_EVAL_REPORT" ]; then printf '\nPrivate report: %s\n' "$APEX_EVAL_REPORT"; fi
printf 'Finished. Code 0 = OCR checks passed; 1 = failure; 2 = visual review needed.\n'
exit "$eval_status"
