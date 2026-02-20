#!/usr/bin/env bash
# Claude Code PreToolUse hook: block destructive Docker Compose commands on the main branch.
# Reads tool input from stdin (JSON with tool_name, tool_input).

set -euo pipefail

branch=$(git symbolic-ref --short HEAD 2>/dev/null || echo "")

if [ "$branch" != "main" ]; then
  exit 0
fi

input=$(cat)
command=$(echo "$input" | jq -r '.tool_input.command // ""' 2>/dev/null || echo "")

# Check for destructive docker compose subcommands
if echo "$command" | grep -qE 'docker compose (down|stop|rm|up|build|restart|create|start)'; then
  cat <<EOF
{"decision":"block","reason":"Cannot run destructive Docker commands on the main worktree. Use a feature worktree with ./docker.sh instead."}
EOF
fi
