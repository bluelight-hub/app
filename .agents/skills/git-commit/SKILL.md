---
name: git-commit
description: Create Git commits with a strict pre-commit safety check, selective staging, and standardized commit messages. Use when OpenCode needs to commit repository changes, craft a compliant commit message, or run a safe commit workflow that prevents accidental file inclusion.
---

# Git Commit

Run this workflow end-to-end whenever the user asks to commit changes.

## Required Reference

1. Read `{project-root}/.agents/skills/_shared/commit-conventions.md` before writing the commit message.
2. Apply commit type, context, and title rules from that file.
3. Use OpenCode attribution in the commit footer.

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

2. Accidental changes:
- Lockfile changes without matching dependency changes
- Unrelated formatting-only changes
- Debug leftovers (`console.log`, `debugger`)
- Changes in unrelated modules/features

If probability is greater than 30% that something is wrong, stop and ask the user before continuing.
If clean, proceed silently.

### 3) Stage Relevant Files

- Stage only explicit file paths: `git add <file1> <file2> ...`
- Never use `git add -A` or `git add .`

### 4) Create Commit

- Format: `<emoji>(<context>): <title>`
- Use only emojis allowed by `scripts/gitmojis.snapshot.json` (do not use a hardcoded list).
- Keep message in English and imperative mood.
- Keep title concise and convention-aligned.
- Never use `--no-verify` or `HUSKY=0`.
- Never create empty commits.

Use this commit template:

```bash
git commit -m "$(cat <<'EOF'
<emoji>(<context>): <title>

<optional body for complex changes>

🤖 Generated with OpenCode

Co-Authored-By: OpenCode <noreply@openai.com>
EOF
)"
```

### 5) Verify

1. Run `git status` and confirm the commit succeeded.
2. If pre-commit hooks fail, fix the issue and create a new commit (never amend).

### 6) Report

Report:

- Committed files summary
- Commit hash
