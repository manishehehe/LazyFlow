# LazyFlow Git Workflow

LazyFlow uses small feature branches, frequent checkpoint commits, and local execution snapshots.

## Feature Branches

Create a new branch from the current branch:

```bash
npm run git:feature -- agent-tool-polish
```

This creates a branch named `feature/agent-tool-polish`.

## Checkpoint Commits

Save a recoverable point while working:

```bash
npm run git:checkpoint -- "agent tools render in chat"
```

The checkpoint script stages all tracked and untracked project files, skips ignored build/runtime output, and commits with a `checkpoint:` prefix.

## Execution Snapshots

Capture local state before risky work or after a working milestone:

```bash
npm run git:snapshot -- "before refactor"
```

Snapshots are written to `.lazyflow/snapshots/` and include:

- current branch and HEAD
- git status
- recent commits
- package scripts
- optional build result

Snapshots are intentionally local-only and ignored by Git.

## Rollback Support

Preview recent checkpoints:

```bash
npm run git:rollback
```

Rollback to a known commit with an explicit confirmation flag:

```bash
npm run git:rollback -- <commit-sha> --confirm
```

The rollback script creates a safety branch before moving `HEAD`, so the previous state remains recoverable.

## Recommended Loop

1. Create a feature branch.
2. Take an execution snapshot before risky changes.
3. Make a focused change.
4. Run `npm run build`.
5. Create a checkpoint commit.
6. Repeat.
