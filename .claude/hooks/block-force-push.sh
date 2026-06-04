#!/bin/bash
set -euo pipefail

cmd=$(python3 -c 'import sys,json; print(json.load(sys.stdin).get("tool_input",{}).get("command",""))')

if ! echo "$cmd" | grep -qE 'git[[:space:]]+push([[:space:]]|$)'; then
  exit 0
fi

if echo "$cmd" | grep -qE 'force-with-lease'; then
  exit 0
fi

if echo "$cmd" | grep -qE '(^|[[:space:]])(--force|-f)([[:space:]]|$)'; then
  echo "BLOCKED: git push --force / -f rewrites remote history." >&2
  echo "  $cmd" >&2
  echo "Use --force-with-lease instead, which only force-pushes if no one else has updated the branch." >&2
  exit 1
fi

exit 0
