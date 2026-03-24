---
name: git-commit-push
description: Commit and push changes to remote without creating a PR. Use when OpenCode should commit and push but skip the pull request step.
---

# Git Commit Push

Run this workflow when the user wants to commit and push, but not create a PR.

## Required Reference

1. Read `{project-root}/.agents/skills/_shared/commit-conventions.md` before writing commit messages.
2. Apply commit type, context, and title rules from that file.
3. Use OpenCode attribution in commit output text.

## Workflow

### 1) Gather Context

Run:

- `git status`
- `git diff HEAD`
- `git branch --show-current`
- `git log --oneline -10`

### 2) Pre-commit Safety Check

Review all changed and untracked files for:

1. Gitignore candidates:

- `.env` files, credentials, API keys, certificates
- Build artifacts, `node_modules`, `dist/`, coverage outputs
- IDE/OS files (`.idea/`, `.vscode/`, `.DS_Store`)
- Temporary/debug files and large binaries

1. Accidental changes:

- Lockfile changes without matching dependency changes
- Unrelated formatting-only changes
- Debug leftovers (`console.log`, `debugger`)
- Changes in unrelated modules/features

If probability is greater than 30% that something is wrong, stop and ask the user before continuing.
If clean, proceed silently.

### 3) Stage and Commit

- Stage only explicit file paths: `git add <file1> <file2> ...`
- Never use `git add -A` or `git add .`
- Use commit format `<emoji>(<context>): <title>`
- Use only emojis allowed by `scripts/gitmojis.snapshot.json` (do not use a hardcoded list).
- Keep message in English and imperative mood.
- Never use `--no-verify` or `HUSKY=0`.
- Never create empty commits.

Commit template:

```bash
git commit -m "$(cat <<'EOF'
<emoji>(<context>): <title>

<optional body for complex changes>

🤖 Generated with OpenCode

Co-Authored-By: OpenCode <noreply@openai.com>
EOF
)"
```

If pre-commit hooks fail, fix issues and create a new commit (never amend).

### 4) Push

Push and set upstream:

```bash
git push -u origin "$(git branch --show-current)"
```

### 5) Report

Report:

- Commit hash
- Push status
