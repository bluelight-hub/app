---
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git commit:*), Bash(git diff:*), Bash(git log:*), Bash(git branch:*)
description: Create a git commit following project conventions
---

## Context

- Current git status: !`git status`
- Staged and unstaged changes: !`git diff HEAD`
- Current branch: !`git branch --show-current`
- Recent commits for style reference: !`git log --oneline -10`

## Commit Conventions

!`cat .claude/commit-conventions.md`

## Workflow

Execute automatically. Only stop to ask if a safety check triggers.

### Step 1: Pre-commit Safety Check

Analyze ALL changed/untracked files:

1. **Gitignore candidates** - Files that likely should NOT be committed:
   - `.env` files, credentials, API keys, certificates
   - Build artifacts, `node_modules`, `dist/`, coverage reports
   - IDE configs (`.idea/`, `.vscode/`), OS files (`.DS_Store`)
   - Temp/debug files, large binaries

2. **Accidental changes** - Files that look unintentionally modified:
   - Lock files changed without corresponding dependency changes
   - Unrelated formatting-only changes in files you didn't work on
   - Debug statements (`console.log`, `debugger`) left in production code
   - Changes in completely unrelated features/modules

**If probability >30% that something is wrong**: STOP, explain the concern, and ask the user before proceeding.
**If clean**: Proceed silently.

### Step 2: Stage & Commit

1. Stage relevant files with `git add <specific files>` (NEVER `git add -A` or `git add .`)
2. Create commit:

```
git commit -m "$(cat <<'EOF'
<emoji>(<context>): <title>

<optional body for complex changes>

🤖 Generated with Claude Code

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

### Step 3: Verify

1. `git status` to confirm success
2. If pre-commit hooks fail → fix and create a NEW commit (never amend)
3. Report result: committed files summary + commit hash
