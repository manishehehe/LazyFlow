#!/usr/bin/env bash
set -euo pipefail

name="${1:-}"

if [[ -z "$name" ]]; then
  echo "Usage: npm run git:feature -- <branch-name>"
  exit 1
fi

safe_name="$(echo "$name" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9._-]+/-/g; s/^-+|-+$//g')"

if [[ -z "$safe_name" ]]; then
  echo "Branch name did not contain any safe characters."
  exit 1
fi

branch="feature/$safe_name"

git rev-parse --is-inside-work-tree >/dev/null
git switch -c "$branch"
echo "Created and switched to $branch"
