#!/bin/bash
set -euo pipefail

# Only run on remote (Claude Code on the web)
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Install dependencies
cd "$CLAUDE_PROJECT_DIR"
npm install

# Run the morning briefing
node "$CLAUDE_PROJECT_DIR/.claude/hooks/morning-briefing.js"
