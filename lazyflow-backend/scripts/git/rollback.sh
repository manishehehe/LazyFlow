#!/usr/bin/env bash
set -euo pipefail

target="${1:-}"
confirm="${2:-}"

git rev-parse --is-inside-work-tree >/dev/null

if [[ -z "$target" ]]; then
  echo "Recent commits:"
  git --no-pager log --oneline --decorate -12
  echo
  echo "Usage: npm run git:rollback -- <commit-sha> --confirm"
  exit 0
fi

if [[ "$confirm" != "--confirm" ]]; then
  echo "Rollback is protected. Re-run with:"
  echo "npm run git:rollback -- $target --confirm"
  exit 1
fi

git rev-parse --verify "$target^{commit}" >/dev/null

current_branch="$(git branch --show-current)"
timestamp="$(date +"%Y%m%d-%H%M%S")"
safety_branch="rollback-safety/${current_branch:-detached}-$timestamp"

git branch "$safety_branch"
git reset --hard "$target"

echo "Rolled back to $target"
echo "Previous state preserved at $safety_branch"
