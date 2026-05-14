#!/bin/bash
set -euo pipefail

cmd=$(python3 -c 'import sys,json; print(json.load(sys.stdin).get("tool_input",{}).get("command",""))')

if echo "$cmd" | grep -qE '(^|[^a-zA-Z_])rm[[:space:]]+(-[a-zA-Z]*[rf][a-zA-Z]*[[:space:]]+|-[rf][[:space:]]+|--recursive|--force)'; then
  echo "BLOCKED: rm with -r or -f. Ask Daxton before running this command:" >&2
  echo "  $cmd" >&2
  echo "If destructive deletion is truly intended, run it manually in a separate terminal." >&2
  exit 1
fi

exit 0
