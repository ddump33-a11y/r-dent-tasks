#!/bin/bash
# Install global safety hooks for Claude Code on macOS.
# Drops two PreToolUse hooks into ~/.claude/hooks/ and merges them into
# ~/.claude/settings.json without clobbering existing settings.
#
# Usage:
#   bash install-global-mac.sh
#
# Idempotent: safe to re-run. Backs up existing settings.json on every change.

set -euo pipefail

CLAUDE_DIR="$HOME/.claude"
HOOKS_DIR="$CLAUDE_DIR/hooks"
SETTINGS="$CLAUDE_DIR/settings.json"
RM_HOOK="$HOOKS_DIR/block-rm-rf.sh"
PUSH_HOOK="$HOOKS_DIR/block-force-push.sh"

mkdir -p "$HOOKS_DIR"

cat > "$RM_HOOK" <<'EOF'
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
EOF

cat > "$PUSH_HOOK" <<'EOF'
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
EOF

chmod +x "$RM_HOOK" "$PUSH_HOOK"

if [ -f "$SETTINGS" ]; then
  cp "$SETTINGS" "$SETTINGS.backup.$(date +%Y%m%d-%H%M%S)"
else
  echo '{}' > "$SETTINGS"
fi

python3 - "$SETTINGS" "$RM_HOOK" "$PUSH_HOOK" <<'PY'
import json, sys
path, rm_hook, push_hook = sys.argv[1], sys.argv[2], sys.argv[3]

with open(path) as f:
    data = json.load(f)

data.setdefault("hooks", {}).setdefault("PreToolUse", [])

bash_block = next((b for b in data["hooks"]["PreToolUse"] if b.get("matcher") == "Bash"), None)
if bash_block is None:
    bash_block = {"matcher": "Bash", "hooks": []}
    data["hooks"]["PreToolUse"].append(bash_block)
bash_block.setdefault("hooks", [])

existing_cmds = {h.get("command") for h in bash_block["hooks"]}
for cmd in (rm_hook, push_hook):
    if cmd not in existing_cmds:
        bash_block["hooks"].append({"type": "command", "command": cmd})

with open(path, "w") as f:
    json.dump(data, f, indent=2)
    f.write("\n")
PY

echo ""
echo "Installed:"
echo "  $RM_HOOK"
echo "  $PUSH_HOOK"
echo "  $SETTINGS (merged)"
echo ""
echo "Quick verification:"
echo '  echo '"'"'{"tool_input":{"command":"rm -rf /tmp/test"}}'"'"' | '"$RM_HOOK"
echo '  echo '"'"'{"tool_input":{"command":"git push --force"}}'"'"' | '"$PUSH_HOOK"
echo ""
echo "Both should print BLOCKED and exit non-zero."
