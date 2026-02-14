<!-- Single Source of Truth for commit conventions. Referenced by /commit and /commit-push-pr -->
<!-- Authoritative format defined in CLAUDE.md → Commit Format section -->

Format: `<emoji>(<context>): <title>`

| Emoji | Type | Semver |
|-------|------|--------|
| 💥 | Breaking Changes | Major |
| ✨ | New Features | Minor |
| 🐛 | Bug Fixes | Patch |
| 🚑 | Critical Hotfixes | Patch |
| 🔒 | Security Fixes | Patch |
| ♻️ | Code Refactoring | - |
| 🔧 | Configuration | - |
| 📝 | Documentation | - |
| ✅ | Tests | - |
| 🎨 | UI/Style Updates | - |
| ⚡ | Performance | - |
| 👷 | CI/CD Changes | - |
| 🔨 | Build/Dev Tools | - |
| 🚧 | Work in Progress | - |
| ⏪ | Revert Changes | - |
| 🔖 | Release | - |

Context mapping: frontend, backend, shared, db, auth, api, config, docs, tests, ci, release, docker

Rules:
- English commit messages, imperative mood ("Add" not "Added")
- Title: 50-72 characters
- NEVER use `--no-verify` or `HUSKY=0`
- NEVER create empty commits
- NEVER commit secrets, API keys, or credentials
- If pre-commit hooks fail: fix the issue and create a NEW commit (NEVER --amend the previous one)
- Footer always includes Claude attribution
