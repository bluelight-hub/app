# 8 — DevOps & Deployment

> CI/CD (GitHub Actions) · semantic-release + Gitmoji · Docker Multi-Stage · Tauri Cross-Platform-Build · Worktree-Setup

---

## 8.1 Überblick

```
Entwickler-Commit
  ├─ pre-commit Hook: tsc + DI-Check + Madge + oxlint/oxfmt (lint-staged)
  ├─ commit-msg Hook: Gitmoji-Validator (ADR-003)
  └─ Push → GitHub
                  │
                  ▼
          ┌────────────────────┐
          │  CI (ci.yml)       │
          │  – repo-hygiene    │
          │  – lint / build    │
          │  – tests (3 Shards DB + Unit + Frontend) │
          │  – docker smoke    │
          │  – summary gate    │
          └────────────────────┘
                  │ grün
                  ▼
          ┌────────────────────┐
          │ release.yml        │
          │ – semantic-release │
          │ – Docker multi-arch│
          │ – Tauri cross-build│
          │ – Claude Changelog │
          └────────────────────┘
                  │
                  ▼
      GitHub Release + GHCR Image + Tauri-Artefakte
```

---

## 8.2 CI/CD-Workflows (`.github/workflows/`)

### 8.2.1 `ci.yml` (Hauptpipeline)

Trigger: PR + Push auf `main`, `develop`, `feature/*`, `alpha`, `beta`, `release/*`.

| Job                         | Aufgabe                                                                 |
| --------------------------- | ----------------------------------------------------------------------- |
| `detect-changes`            | Path-Filter (`code`, `docker`) für Conditional-Jobs                     |
| `repo-hygiene`              | `pnpm check:repo-hygiene` (`.bak`, `.orig`, `.rej` verboten)             |
| `commit-message-validation` | Gitmoji-Validator für alle Commits einer PR                              |
| `linux-quality`             | Build + `pnpm lint:check`                                                |
| `linux-backend-unit`        | `pnpm --filter @bluelight-hub/backend test:unit` + Coverage              |
| `linux-backend-db`          | 3 Shards parallel (Integration + E2E + Smoke mit echter Postgres)        |
| `linux-frontend`            | Vitest + Performance-Gates + Coverage → Codecov                          |
| `docker-build`              | `Dockerfile` smoke-build (target: production)                            |
| `Summary`                   | Meta-Job (Branch Protection)                                             |

### 8.2.2 `release.yml`

Trigger: erfolgreicher CI-Run auf `main`, `alpha`, `beta`, `next`.

| Job                  | Aufgabe                                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------- |
| `check-test-success` | Validiert, dass vorheriger CI-Run grün war                                                   |
| `build-backend`      | Docker-Image (`amd64` + `arm64`) für `app` und `migrations`                                  |
| `merge-backend`      | Manifest-List erzeugen (Multi-Arch)                                                          |
| `build-frontend`     | Tauri-Cross-Build: macOS arm64/x64, Ubuntu, Windows                                          |
| `release`            | `semantic-release` → Version bestimmen, Tag, GitHub-Release, Claude-Changelog, Docker-Retag  |

### 8.2.3 Weitere Workflows

- `gitmoji-sync.yml` — wöchentlich (Montag 07:00) + manuell. Synchronisiert `scripts/gitmojis.snapshot.json` mit offizieller Gitmoji-Liste (ADR-003).
- `codeql.yml` — Security-Analyse (weekly, push/PR auf `main/alpha/beta/develop`).
- `docker-publish.yml` — Legacy (Tags + main); überschneidet sich funktional mit `release.yml`.

---

## 8.3 Release-Automation

### 8.3.1 Werkzeuge

- `semantic-release` `^25`
- `semantic-release-gitmoji` `^1.6` — Version aus Gitmoji + `!`-Marker ableiten.
- `semantic-release-claude-changelog` `^2.0` — KI-generierte Release-Notes (benötigt `ANTHROPIC_API_KEY`-Secret).
- `@semantic-release/changelog`, `@semantic-release/git`, `@semantic-release/github`, `@semantic-release/exec`.

### 8.3.2 Branch-Kanäle

| Branch    | Kanal      | Versionsschema                    |
| --------- | ---------- | --------------------------------- |
| `main`    | `latest`   | `1.x.y`                           |
| `alpha`   | Prerelease | `1.x.y-alpha.N`                   |
| `beta`    | Prerelease | `1.x.y-beta.N`                    |
| `next`    | Next       | `1.x.y-next.N`                    |

Aktuelle Version (Stand 2026-04-17): `1.0.0-alpha.102` (siehe `CHANGELOG.md`).

### 8.3.3 Benötigte Secrets

| Secret                       | Zweck                                     |
| ---------------------------- | ----------------------------------------- |
| `GITHUB_TOKEN`               | GHCR-Login, Tag-Push                      |
| `ANTHROPIC_API_KEY`          | Claude-Changelog-Generierung              |
| `VERSION_BUMPER_APPID`       | GitHub-App für Release-Commits            |
| `VERSION_BUMPER_PRIVATE_KEY` | GitHub-App-Key                            |
| `CODECOV_TOKEN`              | Coverage-Upload                           |

---

## 8.4 Docker

### 8.4.1 `docker-compose.yml`

| Service      | Image / Target             | Port                | Profil         |
| ------------ | -------------------------- | ------------------- | -------------- |
| `postgres`   | `postgres:18`              | `3092` (→ 5432)     | default        |
| `migrations` | Dockerfile `migrations`    | —                   | `full-app`     |
| `app`        | Dockerfile `production`    | `3091` (→ 3091)     | `full-app`     |

- **Volumes:** `postgres_data` (benannt), `./uploads`.
- **Healthchecks:** `pg_isready` (Postgres), `wget /api/health` (App).
- **Resource-Limits:** App 512 MB reservation / 1 GB hard limit.
- **Netzwerk:** Standard-Bridge.

### 8.4.2 `Dockerfile` (Multi-Stage)

```
base        → Node 25-alpine + pnpm
  │
  ├─ workspace (Source-Tree kopieren)
  │    ├─ shared-builder     (packages/shared bauen)
  │    ├─ frontend-builder   (React + Vite bauen)
  │    └─ backend-builder    (NestJS bauen)
  ├─ prod-deps  (pnpm deploy → production node_modules)
  ├─ production (Final-Image, schlank)
  └─ migrations (Prisma CLI + Schema + Migrations)
```

Das Final-Image enthält:
- `dist/` des Backends
- `node_modules/` (prod-only)
- `prisma/schema.prisma` + `migrations/` (nur im `migrations`-Target)
- Uploads-Pfad als Volume-Mount-Target

---

## 8.5 Tauri Desktop-Build

### 8.5.1 Konfiguration (`packages/frontend/src-tauri/tauri.conf.json`)

- **Build-Inputs:** `../dist/` (Vite-Output) aus `https://localhost:3090` (Dev).
- **Build-Targets (Release):**
  - macOS: `aarch64-apple-darwin`, `x86_64-apple-darwin`
  - Linux: Standard (Ubuntu-Runner)
  - Windows: MSVC
- **Deep-Link-Scheme:** `bluelight://…`
- **Resources:** `sounds/*.mp3` (Audio-Alerts)
- **CSP:** im Dev `null`, in Production explizit konfiguriert.

### 8.5.2 Cross-Compilation

- **Runner:** GitHub Actions Matrix (macos-14, ubuntu-22, windows-latest).
- **Rust-Toolchain:** stable via `dtolnay/rust-toolchain`.
- **Abhängigkeiten:** Ubuntu braucht `webkit2gtk` (Dependencies-Installationsschritt im Workflow).
- **Artefakte:** `.dmg` (macOS), `.AppImage` / `.deb` (Linux), `.msi` / `.exe` (Windows) werden als GitHub-Release-Assets hochgeladen.

### 8.5.3 Mobile (iOS / Android)

Projekt enthält Android-Build-Profile (`android/`) und Tauri-2-Mobile-Konfiguration. Barcode-Scanner-Plugin wird nur auf Mobile aktiv gebunden.

---

## 8.6 Worktree-Support

**Script:** `scripts/worktree-setup.sh`

| Schritt                                     | Details                                                                 |
| ------------------------------------------- | ----------------------------------------------------------------------- |
| Worktree-ID ermitteln                       | 0 = Hauptrepo, 1 = erster Worktree, …                                   |
| Dynamische Ports berechnen                  | `scripts/worktree-ports.sh` (Offset 1000 pro Worktree)                  |
| Port-Kollisionen prüfen                     | `lsof`-Check                                                            |
| `.env`-Dateien generieren                   | Backend + Frontend, inkl. `MASTER_SECRET`, HTTPS-Pfaden                  |
| PostgreSQL-Container starten                | Eigener Docker-Compose-Projektname je Worktree                          |
| `pnpm install`, `prisma generate/migrate/seed` | Vollständige Initialisierung                                         |
| HTTPS-Zertifikate                           | `pnpm gen:certs` (mkcert)                                               |

**Standard-Ports vs. Worktree:**

| Index       | Frontend | Backend | Postgres |
| ----------- | -------: | ------: | -------: |
| Hauptrepo 0 | 3090     | 3091    | 3092     |
| Worktree 1  | 4090     | 4091    | 4092     |
| Worktree 2  | 5090     | 5091    | 5092     |

---

## 8.7 HTTPS im Dev-Modus

- **Tool:** [`mkcert`](https://github.com/FiloSottile/mkcert) (Memory-Override: keine externen Referenzen erfinden — Tool ist in CLAUDE.md erwähnt).
- **Script:** `scripts/generate-certs.sh` (`pnpm gen:certs`).
- **Output:** `certs/localhost.pem` + `certs/localhost-key.pem`.
- **Einbindung:** Vite + NestJS laden Zertifikate über `HTTPS_KEY_PATH` / `HTTPS_CERT_PATH` aus der jeweiligen `.env`.
- **Frontend-Proxy:** konfiguriert in `vite.config.ts` (`secure: false, changeOrigin: true`).
- `http://` liefert `ERR_EMPTY_RESPONSE` — im Dev immer HTTPS.

---

## 8.8 Environment & Secrets

- **`@dotenvx/dotenvx`** (`^1.59`) verwaltet signierte `.env`-Dateien (Integrität).
- **MASTER_SECRET** wird per Worktree-Setup generiert und für AES-Verschlüsselung (Secrets-at-Rest) genutzt.
- **Lokale ENV-Dateien:** `packages/backend/.env`, `packages/frontend/.env` — **nicht** commiten.
- **Runtime-Konfiguration** (ADR-002): Phase 1 via Env, Phase 2 Runtime-UI-Konfig geplant.

**Kritische Variablen (Auswahl):**

| Variable                     | Package   | Zweck                                 |
| ---------------------------- | --------- | ------------------------------------- |
| `DATABASE_URL`               | backend   | Postgres-Connection                   |
| `JWT_SECRET`                 | backend   | Access-Token-Signing                  |
| `JWT_REFRESH_SECRET`         | backend   | Refresh-Token-Signing                 |
| `MASTER_SECRET`              | backend   | AES-Encryption für IntegrationCredentials |
| `BACKEND_PORT` / `PORT`      | backend   | NestJS-Port                           |
| `VITE_PORT`                  | frontend  | Vite-Port                             |
| `DATABASE_PORT`              | beide     | Docker-Postgres                       |
| `HTTPS_KEY_PATH`             | beide     | mkcert-Key                            |
| `HTTPS_CERT_PATH`            | beide     | mkcert-Cert                           |
| `BLUELIGHT_OPENAPI_BASE_URL` | shared    | API-Generator                         |
| `HIORG_CLIENT_ID`            | backend   | HiOrg-Integration                     |
| `HIORG_CLIENT_SECRET`        | backend   | HiOrg-Integration                     |

---

## 8.9 Monitoring & Observability

- **Health-Check:** `/api/health` (Backend) — genutzt vom Docker-Healthcheck.
- **Metrics:** `infrastructure/metrics/` (Prometheus-Exporter).
- **Logging:** strukturierte Logs via `consola` (Frontend) und eigener Logger-Port im Backend (`ILogger`).
- **Circuit-Breaker** für externe Aufrufe (`infrastructure/resilience/`).

> Ein vollständiges **Monitoring-/Runbook-Dokument** fehlt noch (Dokumentations-Lücke).

---

## 8.10 Deployment-Optionen

| Modus                  | Beschreibung                                                                                   |
| ---------------------- | ---------------------------------------------------------------------------------------------- |
| **Self-Hosted Docker** | `docker compose --profile full-app up`. Primär-Deployment laut ADR-002.                         |
| **Kubernetes**         | Nicht offiziell dokumentiert — Image ist kompatibel (stateless Backend + externes Postgres).   |
| **Tauri Desktop**      | Installer aus Release-Workflow (DMG, AppImage, MSI).                                            |
| **Mobile (Tauri 2)**   | Experimentell — Android-Build-Profile vorhanden, iOS in Vorbereitung.                           |

---

## 8.11 Branch-Protection-Empfehlung

Für alle schützenswerten Branches (`main`, `alpha`, `beta`):

- Require PR reviews (mind. 1 Reviewer).
- Require `Summary`-Job aus `ci.yml` grün.
- Require signierte Commits (zusammen mit GitHub-App-Flow für Releases).
- Disallow force-push (`git push --force-with-lease` nur via PR-Review).
- `--no-verify` bleibt untersagt.

---

## 8.12 Versionierung (`mise.toml`)

```toml
[tools]
node = "24"
python = "3"
```

Keine Rust-Version via mise — sollte explizit über `rustup` gepflegt werden (siehe Tauri-Dokumentation).

---

## 8.13 Referenzen

- **CI/CD-Workflows:** `.github/workflows/`
- **Dockerfile + Compose:** `Dockerfile`, `docker-compose.yml`
- **Tauri-Config:** `packages/frontend/src-tauri/tauri.conf.json`
- **Scripts:**
  - `scripts/worktree-setup.sh`
  - `scripts/worktree-ports.sh`
  - `scripts/generate-certs.sh`
  - `scripts/sync-gitmojis.mjs`
  - `scripts/check-repo-hygiene.sh`
  - `scripts/check-commit-range.mjs`
- **ADR-002** (Runtime-Konfig), **ADR-003** (Gitmoji Source of Truth)
