# CI/CD Pipeline

## GitHub Actions Workflows

**Location:** `.github/workflows/`

### 1. CI Pipeline (`ci.yml`)

**Triggers:**
- Pull requests to `main`, `develop`, `alpha`, `beta`, `release/*`
- Pushes to same branches

**Jobs:**
- **build-and-test:** Multi-platform build (Ubuntu, macOS, Windows)
  - Install dependencies
  - Generate Prisma client
  - Run linting (Biome)
  - Upload test artifacts on failure
  - Upload coverage to Codecov (Linux only)
- **docs:** Generate backend documentation (Compodoc)
- **code-quality:** TypeScript compiler check
- **summary:** Aggregate results for branch protection

**Status badges:**
```markdown
[![GitHub Actions](https://github.com/rubenvitt/bluelight-hub/actions/workflows/test.yml/badge.svg)](https://github.com/rubenvitt/bluelight-hub/actions/workflows/test.yml)
[![doccov](https://backend-docs.bluelight-hub.rubeen.dev/images/coverage-badge-documentation.svg)](https://backend-docs.bluelight-hub.rubeen.dev)
```

### 2. Release Pipeline (`release.yml`)

**Triggers:**
- CI pipeline success on `main`, `alpha`, `beta`, `next`

**Jobs:**
- **build-backend:** Docker image build (multi-arch: amd64, arm64)
  - Push to GitHub Container Registry (GHCR)
  - Tags: `latest`, `main`, `main:<build_number>`
- **build-frontend:** Tauri app build (4 platforms)
  - macOS: ARM64 + x86_64
  - Ubuntu: x86_64
  - Windows: x86_64
- **release:** Semantic Release
  - Generate release notes from commits
  - Create GitHub Release
  - Attach Docker image tags and Tauri artifacts

**Semantic Versioning:**
- Emoji-based commit messages trigger version bumps
- Automatic CHANGELOG generation
- Release to `main`, `alpha`, `beta`, `next` tracks

### 3. Docker Publish (`docker-publish.yml`)

Publishes Docker images to GHCR on release.

### 4. Documentation Deploy (`docs.yml`)

Generates and deploys arc42 architecture documentation.

## Semantic Release Configuration

**Commit format:** `<emoji>(<scope>): <subject>`

**Version bumps:**
- 💥 Breaking: Major (1.0.0 → 2.0.0)
- ✨ Feature: Minor (1.0.0 → 1.1.0)
- 🐛 Fix: Patch (1.0.0 → 1.0.1)

**Example commits:**
```bash
git commit -m "✨(einsatz): Add bulk archive endpoint"
git commit -m "🐛(auth): Fix JWT token refresh logic"
git commit -m "💥(api): Remove deprecated /v1 endpoints"
```

---
