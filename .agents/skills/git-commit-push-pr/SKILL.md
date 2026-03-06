---
name: git-commit-push-pr
description: Commit, push, and create a GitHub pull request from local repository changes with safety checks, commit conventions, base branch detection, and branch guardrails. Use when OpenCode should deliver a full PR-ready Git workflow from working tree changes.
---

# Git Commit Push PR

Run this workflow when the user wants a full commit -> push -> PR flow.

## Required Reference

1. Read `{project-root}/.agents/skills/_shared/commit-conventions.md` before writing commit or PR titles.
2. Apply commit type, context, and title rules from that file.
3. Use OpenCode attribution in commit and PR output text.

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

### 3) Detect Base Branch

1. Resolve remote default branch:

```bash
BASE_BRANCH="$(git symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null | sed 's|^origin/||')"
```

2. If empty, fallback to `alpha`:

```bash
[ -n "$BASE_BRANCH" ] || BASE_BRANCH="alpha"
```

3. Validate base exists locally or on origin:

```bash
if ! git show-ref --verify --quiet "refs/heads/$BASE_BRANCH" \
  && ! git show-ref --verify --quiet "refs/remotes/origin/$BASE_BRANCH"; then
  echo "Base branch '$BASE_BRANCH' not found"
fi
```

If base does not exist, stop and ask the user before continuing.

### 4) Enforce Safe Working Branch

If current branch is `main`, `alpha`, or exactly `$BASE_BRANCH`, create and switch to a feature branch:

```bash
CURRENT_BRANCH="$(git branch --show-current)"
if [ "$CURRENT_BRANCH" = "main" ] || [ "$CURRENT_BRANCH" = "alpha" ] || [ "$CURRENT_BRANCH" = "$BASE_BRANCH" ]; then
  NEW_BRANCH="opencode/$(date +%Y%m%d-%H%M)-commit-pr"
  git checkout -b "$NEW_BRANCH"
  CURRENT_BRANCH="$NEW_BRANCH"
fi
```

### 5) Stage and Commit

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

### 6) Push

Push and set upstream:

```bash
git push -u origin "$(git branch --show-current)"
```

### 7) Create Pull Request

1. Analyze branch scope against base:
- `git log --oneline "${BASE_BRANCH}..HEAD"`
- `git diff "${BASE_BRANCH}...HEAD"`

2. Create PR:

```bash
gh pr create --base "$BASE_BRANCH" --title "<emoji>(<context>): <concise title>" --body "$(cat <<'EOF'
## Summary

- <what and why>

## Changes

- Frontend: <changes>
- Backend: <changes>
- Shared/Config: <changes>

## Test plan

- [ ] <checklist item>

🤖 Generated with OpenCode
EOF
)"
```

PR title follows commit convention and stays under 70 characters.

### 8) Report

Report:

- Commit hash
- Push status
- PR URL
