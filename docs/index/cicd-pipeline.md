# CI/CD Pipeline

## GitHub Actions Workflows

**Location:** `.github/workflows/`

| Workflow | Triggers | Purpose |
|----------|----------|---------|
| **CI Pipeline** | PR/Push to main, develop, alpha | Multi-platform build, lint, tests |
| **Release** | CI success on main, alpha, beta | Docker images, Tauri apps, GitHub Release |
| **Docker Publish** | Release | Publish to GHCR |
| **Docs** | Push to main | Deploy arc42 docs |

**Semantic Release:**
- Emoji-based commit messages trigger version bumps
- Automatic CHANGELOG generation
- Release to multiple tracks (main, alpha, beta)

---
