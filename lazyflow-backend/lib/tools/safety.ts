import path from "node:path";

// Commands that are always blocked regardless of allowlist position.
// Covers destructive ops, privilege escalation, network egress, and injection vectors.
const blockedCommandPatterns = [
  /\brm\b/,
  /\bsudo\b/,
  /\bchmod\b/,
  /\bchown\b/,
  /\bkill(all)?\b/,
  /\bpkill\b/,
  /\bdd\b/,
  /\bmkfs\b/,
  /\bshutdown\b/,
  /\breboot\b/,
  /\bssh\b/,
  /\bscp\b/,
  /\bcurl\b/,
  /\bwget\b/,
  /[;&|`]/,
  /\$\(/,
  />/
];

const allowedCommandPrefixes = [
  // macOS app & URL launcher
  "open",

  // Navigation & inspection
  "pwd",
  "ls",
  "cat",
  "head",
  "tail",
  "wc",
  "diff",
  "find",
  "grep",
  "rg",
  "sed",

  // File creation (no overwrite, no rm)
  "mkdir",
  "touch",

  // Git — full coding workflow
  "git status",
  "git diff",
  "git log",
  "git show",
  "git add",
  "git commit",
  "git checkout",
  "git branch",
  "git stash",
  "git remote",
  "git fetch",
  "git pull",
  "git merge",

  // Node / npm / package management
  "node",
  "npm run",
  "npm test",
  "npm list",
  "npm install",
  "npm uninstall",
  "npm ci",
  "npm -v",
  "npm audit",
  "npx",

  // Build & type-check
  "tsc",
  "eslint",
  "prettier",

  // Python
  "python3",
  "python",
];

export function validateShellCommand(command: string) {
  const compact = command.trim();

  if (!compact) return "Command is empty.";
  if (compact.length > 512) return "Command is too long for safe execution.";

  const allowed = allowedCommandPrefixes.some(
    (prefix) => compact === prefix || compact.startsWith(`${prefix} `)
  );

  if (!allowed) {
    return "Command is outside the current safe allowlist.";
  }

  if (blockedCommandPatterns.some((pattern) => pattern.test(compact))) {
    return "Command contains an operator or program that LazyFlow blocks for safety.";
  }

  return null;
}

export function resolveWorkspacePath(workspaceRoot: string, targetPath = ".") {
  const resolved = path.resolve(workspaceRoot, targetPath);
  const relative = path.relative(workspaceRoot, resolved);

  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Path is outside the LazyFlow workspace.");
  }

  const parts = relative.split(path.sep);
  if (
    parts.includes("node_modules") ||
    parts.includes(".git") ||
    parts.some((part) => part.startsWith(".env"))
  ) {
    throw new Error("Path is blocked by the workspace safety policy.");
  }

  return resolved;
}
