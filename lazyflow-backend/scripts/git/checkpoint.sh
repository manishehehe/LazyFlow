#!/usr/bin/env bash
set -euo pipefail

message="${1:-}"

if [[ -z "$message" ]]; then
  message="work in progress"
fi

git rev-parse --is-inside-work-tree >/dev/null

if [[ -z "$(git status --porcelain)" ]]; then
  echo "No changes to checkpoint."
  exit 0
fi

git add -A
git commit -m "checkpoint: $message"
echo "Checkpoint created: checkpoint: $message"
