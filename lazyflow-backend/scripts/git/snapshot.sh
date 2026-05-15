#!/usr/bin/env bash
set -euo pipefail

label="${1:-snapshot}"
safe_label="$(echo "$label" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9._-]+/-/g; s/^-+|-+$//g')"
timestamp="$(date +"%Y%m%d-%H%M%S")"
dir=".lazyflow/snapshots/${timestamp}-${safe_label:-snapshot}"

git rev-parse --is-inside-work-tree >/dev/null
mkdir -p "$dir"

{
  echo "# LazyFlow Execution Snapshot"
  echo
  echo "- Created: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo "- Label: $label"
  echo "- Branch: $(git branch --show-current || true)"
  echo "- HEAD: $(git rev-parse --verify HEAD 2>/dev/null || echo "no commits yet")"
} > "$dir/summary.md"

git status --short > "$dir/git-status.txt"
git --no-pager log --oneline --decorate -20 > "$dir/recent-commits.txt" 2>/dev/null || echo "No commits yet." > "$dir/recent-commits.txt"
npm run 2>&1 > "$dir/npm-scripts.txt" || true
npm run build > "$dir/build.log" 2>&1 || true

echo "Snapshot written to $dir"
