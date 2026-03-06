<!-- Single source of truth for commit conventions. -->
<!-- Referenced by git-commit and git-commit-push-pr OpenCode skills. -->

Format: `<emoji>(<context>): <title>`

Emoji Source of Truth:
- Allowed emojis are defined by `scripts/gitmojis.snapshot.json`.
- The snapshot is synced from:
  `https://raw.githubusercontent.com/carloscuesta/gitmoji/master/packages/gitmojis/src/gitmojis.json`
- Sync/update command: `pnpm gitmoji:sync`
- Drift check command: `pnpm gitmoji:check`
- Validation is enforced by `.husky/commit-msg` via `scripts/gitmoji-commit-validator.mjs`.

Release note:
- Not every allowed gitmoji triggers a semantic-release bump.
- Current release bump mapping is intentionally defined in `.releaserc.js`.

Context mapping: frontend, backend, shared, db, auth, api, config, docs, tests, ci, release, docker

Rules:
- English commit messages, imperative mood ("Add" not "Added")
- Title: 50-72 characters
- Emoji must exist in `scripts/gitmojis.snapshot.json`
- NEVER use `--no-verify` or `HUSKY=0`
- NEVER create empty commits
- NEVER commit secrets, API keys, or credentials
- If pre-commit hooks fail: fix the issue and create a NEW commit (NEVER `--amend` the previous one)
- Footer always includes OpenCode attribution
