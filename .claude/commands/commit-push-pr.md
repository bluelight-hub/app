---
allowed-tools: Bash(git add:*), Bash(git status:*), Bash(git commit:*), Bash(git diff:*), Bash(git log:*), Bash(git push:*), Bash(gh pr create:*), Bash(git checkout -b:*), Bash(git branch:*), Bash(git rev-parse:*)
description: Commit, push, and create a PR with descriptive summary
---

## Context

- Current git status: !`git status`
- Staged and unstaged changes: !`git diff HEAD`
- Current branch: !`git branch --show-current`
- Recent commits for style reference: !`git log --oneline -10`
- Commits since base branch: !`git log --oneline alpha..HEAD 2>/dev/null || echo "(no divergence from alpha or branch not found)"`

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

### Step 3: Push

1. Push to origin: `git push -u origin <current-branch>`
2. If branch has no remote yet, the `-u` flag sets up tracking

### Step 4: Create PR

1. Analyze ALL commits on this branch since diverging from `alpha` (use `git log --oneline alpha..HEAD` and `git diff alpha...HEAD`)
2. Determine the overall theme/purpose of the branch
3. Create PR:

```
gh pr create --base alpha --title "<emoji>(<context>): <concise title>" --body "$(cat <<'EOF'
## Summary

<1-3 bullet points: what this PR does and why>

## Changes

<grouped list of concrete changes per area (frontend/backend/shared/config)>

## Test plan

- [ ] <testing checklist items>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

PR guidelines:
- Title follows same emoji convention as commits (under 70 chars)
- Summary explains the "why", Changes list the "what"
- Group changes by area (Frontend, Backend, Shared, Config, etc.)
- Test plan should be actionable checkboxes

### Step 5: Report

- Show the PR URL
- Summary: committed files, push status, PR link
