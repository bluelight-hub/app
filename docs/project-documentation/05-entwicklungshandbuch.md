# 5 — Entwicklungshandbuch

> Setup · Commands · Konventionen · Worktrees · HTTPS im Dev-Modus · Troubleshooting

---

## 5.1 Voraussetzungen

| Tool              | Version (verpflichtend)       | Quelle                                       |
| ----------------- | ----------------------------- | -------------------------------------------- |
| Node.js           | `>= 24` (`mise.toml: node=24`) | `mise use` oder `nvm use`                    |
| pnpm              | `10.32.1` (`packageManager`-Feld) | Corepack oder `npm i -g pnpm@10.32.1`    |
| Python            | `3` (`mise.toml`)             | für Tauri-Build / node-gyp                   |
| Rust              | neueste stabile (via `rustup`) | für Tauri-Cross-Compilation                  |
| Docker            | >= 24                         | PostgreSQL, optional Backend-Container       |
| mkcert            | beliebig                      | `brew install mkcert` (für HTTPS im Dev)     |
| `mise`            | optional empfohlen            | zentralisiert Node/Python-Version            |

> **Tipp:** `mise install` liest `mise.toml` und installiert Node 24 + Python 3 automatisch.

---

## 5.2 Ersteinrichtung

```bash
# Repository klonen
git clone https://github.com/…/bluelight-hub.git
cd bluelight-hub

# Tool-Versionen (optional via mise)
mise install

# Dependencies
pnpm install                          # hoisting + workspace

# HTTPS-Zertifikate (mkcert muss einmal mit CA initialisiert sein)
pnpm gen:certs                        # legt certs/localhost.pem + localhost-key.pem an

# Datenbank (Docker-Compose)
docker compose up -d postgres

# Prisma: Schema anwenden + Seeds
pnpm --filter @bluelight-hub/backend prisma:migrate --name init
pnpm --filter @bluelight-hub/backend prisma:seed          # (falls vorhanden)

# API-Client regenerieren (falls Schema geändert)
pnpm run generate-api
```

**HTTPS-Hintergrund:** Vite und NestJS binden self-signed Zertifikate aus `certs/` via `HTTPS_KEY_PATH` / `HTTPS_CERT_PATH` (relative Pfade, werden durch Worktree-Setup gefüllt). `http://localhost:3090` antwortet mit `ERR_EMPTY_RESPONSE` — immer `https://` verwenden.

---

## 5.3 Standard-Ports (Hauptrepo)

| Dienst              | Port  | Konfigurierbar via          |
| ------------------- | ----: | --------------------------- |
| Frontend (Vite)     | 3090  | `VITE_PORT`                 |
| Backend (NestJS)    | 3091  | `BACKEND_PORT` / `PORT`     |
| PostgreSQL          | 3092  | `DATABASE_PORT`             |
| Prisma Studio       | 3093  | Fix                         |

Im Worktree werden diese Ports automatisch um 1000 verschoben (`Worktree 1 → 4090/4091/4092`, `Worktree 2 → 5090/5091/5092`, …).

---

## 5.4 Entwicklungs-Workflow

### 5.4.1 Alles starten

```bash
pnpm -r dev                     # Parallel: backend dev, frontend dev (inkl. tauri dev)
pnpm run dev:web                # Backend + frontend Vite ohne Tauri
pnpm --filter @bluelight-hub/frontend dev:vite   # Nur Web-Frontend
pnpm --filter @bluelight-hub/frontend dev         # Frontend inkl. Tauri
pnpm --filter @bluelight-hub/backend dev          # Nur Backend mit Watch
```

### 5.4.2 API-Client neu generieren

```bash
# Nach Backend-Endpoint-Änderungen IMMER erforderlich
pnpm run generate-api
```

**Workflow-Regel:** Backend-Endpoint → `pnpm run generate-api` → TanStack-Query-Hook → Komponente. Keine manuellen `fetch()`-Calls!

### 5.4.3 Datenbank-Migrationen

```bash
# Neue Migration erzeugen (IMMER mit --name, sonst interaktiv!)
pnpm --filter @bluelight-hub/backend prisma:migrate --name add_feature_xyz

# Schema-Produktion (ohne Dev-Reset)
pnpm --filter @bluelight-hub/backend prisma:deploy

# Prisma Studio
pnpm --filter @bluelight-hub/backend prisma:studio        # Port 3093
```

**Datenbank-Zugriff** (kein lokales `psql`):

```bash
docker compose exec postgres psql -U bluelight -d bluelight-hub -c "SELECT ..."
```

### 5.4.4 Tests

```bash
# Backend (Jest)
pnpm --filter @bluelight-hub/backend test                # alle
pnpm --filter @bluelight-hub/backend test:unit           # ohne DB
pnpm --filter @bluelight-hub/backend test:db             # Integration + E2E + Smoke
pnpm --filter @bluelight-hub/backend test:integration    # nur .integration.spec.ts
pnpm --filter @bluelight-hub/backend test:domain         # nur domain/
pnpm --filter @bluelight-hub/backend test:cov            # Coverage (Threshold 79 %)

# Empfehlung aus Memory: präzise Pattern nutzen
cd packages/backend
npx jest --testPathPatterns="einsatz.*\.spec\.ts$" --no-coverage

# Frontend (Vitest)
pnpm --filter @bluelight-hub/frontend test
pnpm --filter @bluelight-hub/frontend test:ui            # Vitest UI
pnpm --filter @bluelight-hub/frontend test:coverage
pnpm --filter @bluelight-hub/frontend test:performance   # 3 Performance-Suites

# Performance (Artillery, Backend)
pnpm --filter @bluelight-hub/backend test:perf:quick     # kurz
pnpm --filter @bluelight-hub/backend test:perf           # Voll (NFR-4: p95 < 200 ms)
pnpm --filter @bluelight-hub/backend seed:perf           # Testdaten-Seed
pnpm --filter @bluelight-hub/backend perf:report         # HTML-Report
```

### 5.4.5 Qualität

```bash
pnpm lint                                     # oxlint --fix + oxfmt --write
pnpm lint:check                               # nur prüfen (kein Fix)

# Backend-spezifisch
pnpm --filter @bluelight-hub/backend check:arch         # Madge + OXLint auf Layers
pnpm --filter @bluelight-hub/backend check:di:imports   # DI-Import-Hygiene (AC1)
pnpm --filter @bluelight-hub/backend check:jsdoc        # Fehlende JSDoc melden
pnpm --filter @bluelight-hub/backend check:deps         # madge --circular domain/
pnpm --filter @bluelight-hub/backend lint:deps:core     # domain + application

# Repository-weit
pnpm check:repo-hygiene                       # sucht .bak, .orig, .rej
pnpm gitmoji:check                            # Snapshot-Validierung
pnpm test:gitmoji                             # Gitmoji-Validator-Test
pnpm commit:check-range                       # Commits einer Range prüfen
```

### 5.4.6 CLI-Tools (Backend)

```bash
pnpm --filter @bluelight-hub/backend admin:reset            # Admin-Passwort zurücksetzen
pnpm --filter @bluelight-hub/backend cli:archive            # Einsätze archivieren (Batch)
pnpm --filter @bluelight-hub/backend cli:invite-once        # Einmal-Invite-Code generieren
```

---

## 5.5 Worktrees & dynamische Ports

Für parallele Feature-Arbeit in Git-Worktrees existiert ein Setup-Skript.

```bash
# Neuen Worktree anlegen (Beispiel)
git worktree add ../bluelight-hub-feature-xyz feature/xyz

# Setup im Worktree (wichtig!)
cd ../bluelight-hub-feature-xyz
bash scripts/worktree-setup.sh
```

Was `scripts/worktree-setup.sh` tut:

1. Ermittelt eine eindeutige **Worktree-ID** (0 = Hauptrepo, 1 = erster Worktree, …).
2. Berechnet dynamische **Ports** via `scripts/worktree-ports.sh` (Offset 1000 je Worktree).
3. Prüft Port-Kollisionen mit `lsof`.
4. Erzeugt `.env`-Dateien für Backend + Frontend (inkl. `MASTER_SECRET`, HTTPS-Pfade).
5. Startet PostgreSQL-Container mit eigenem Docker-Compose-Projektnamen.
6. Führt `pnpm install`, `prisma generate`, `prisma migrate`, `prisma:seed` aus.
7. Erzeugt HTTPS-Zertifikate über `pnpm gen:certs` (mkcert).

---

## 5.6 Projekt-Regeln (Enforcement)

| Regel                                  | Erzwingung                                        | Details                                   |
| -------------------------------------- | ------------------------------------------------- | ----------------------------------------- |
| **DI-Import (AC1)**                    | Pre-commit Hook + CI                              | Injectable Classes mit `import`, nicht `import type` |
| **API-Workflow**                       | Dev-Konvention + Code-Review                      | Backend → `generate-api` → TanStack → UI  |
| **Response-Decorators (AC7)**          | Swagger-Generierung + Review                      | `@ApiWrappedResponse` / `@ApiWrappedCreatedResponse` |
| **Tech-Stack-Whitelist**               | Code-Review                                       | Tailwind, Headless UI, TanStack, Zod, OXC |
| **Verbotene Tech**                     | Code-Review                                       | Redux, ESLint, Prettier, Biome, Formik, CSS-in-JS |
| **Umlaut-Regel**                       | `oxfmt`-Konvention, manuell geprüft               | `ä ö ü ß` in UI-Strings und Kommentaren   |
| **Einsatz-Routen-Nesting**             | Code-Review + Memory                              | `/einsatz/:einsatzId/…` statt Top-Level   |
| **Commit-Format**                      | `commit-msg` Husky-Hook (ADR-003)                 | `<emoji>(<context>): <title>`, `--no-verify` untersagt |
| **Layer-Isolation (Hexagonal)**        | `madge` + `oxlint` auf `domain`, `application`    | `pnpm --filter @bluelight-hub/backend check:arch` |
| **10-Jahre-Aufbewahrung**              | Datenbank-Trigger + Soft-Delete                   | Einsatz, ETB, Befehl dürfen nicht hart gelöscht werden |

---

## 5.7 Commit-Konventionen

### 5.7.1 Format

```
<emoji>(<context>): <titel>

[optional: mehrzeilige Beschreibung]
```

Max. 72 Zeichen in der ersten Zeile.

### 5.7.2 Gitmoji-Quelle

- **Source of Truth:** Offizielle Gitmoji-Liste von `carloscuesta/gitmoji`.
- **Lokaler Snapshot:** `scripts/gitmojis.snapshot.json`, wöchentlich synchronisiert via Workflow `gitmoji-sync.yml` (Montag 07:00).
- **Validator:** `scripts/gitmoji-commit-validator.mjs` → `commit-msg` Husky-Hook.

### 5.7.3 Häufige Emojis

| Emoji | Bedeutung        |
| ----- | ---------------- |
| ✨    | Feature          |
| 🐛    | Bugfix           |
| ♻️    | Refactor         |
| 📝    | Docs             |
| 🧪    | Tests            |
| 💥    | Breaking Change  |
| 🎨    | Styling / UI     |
| 🔒    | Security         |
| 🔖    | Release-Tag      |
| 🚀    | Deploy           |

Weitere siehe `scripts/gitmojis.snapshot.json`.

### 5.7.4 Pre-Commit-Hooks (`.husky/pre-commit`)

1. TypeScript-Typ-Check (`tsconfig.build.json`, `--noEmit`, ohne Tests).
2. DI-Import-Prüfung (`pnpm --filter @bluelight-hub/backend check:di:imports`).
3. Circular-Deps-Check (`pnpm --filter @bluelight-hub/backend lint:deps:core`).
4. `lint-staged`: oxlint + oxfmt für alle gematchten Dateien.

---

## 5.8 Branch- & Release-Strategie

- **alpha** — aktuelle Arbeitsversion (→ Prerelease).
- **beta** — Stabilisierung (→ Prerelease).
- **main** — stabile Release-Branch (→ `latest`-Tag).
- **Feature-Branches:** `feature/<ticket>-<kurzbeschreibung>`.

**Release-Automation:** `semantic-release` + `semantic-release-gitmoji` + `semantic-release-claude-changelog` triggern auf erfolgreichem CI auf `main/alpha/beta/next`.

---

## 5.9 Umgebungsvariablen

- **Signierte .env-Dateien** (`@dotenvx/dotenvx`): `packages/backend/.env`, `packages/frontend/.env`.
- **Auto-Generierung:** `scripts/worktree-setup.sh` erzeugt / aktualisiert diese Dateien je Worktree.
- **Kritische Variablen:**
  - `MASTER_SECRET` — AES-Key für Secrets-at-Rest (wird pro Setup generiert).
  - `DATABASE_URL` — Postgres-Connection.
  - `JWT_SECRET` / `JWT_REFRESH_SECRET`.
  - `BACKEND_PORT`, `VITE_PORT`, `DATABASE_PORT`.
  - `HTTPS_KEY_PATH`, `HTTPS_CERT_PATH` — relative Pfade in den .env-Dateien.
  - `BLUELIGHT_OPENAPI_BASE_URL` — für Client-Generierung.
  - `HIORG_*` — OAuth2-Konfiguration (siehe Kapitel 9).

---

## 5.10 Troubleshooting

| Problem                                                   | Lösung                                                                                      |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `ERR_EMPTY_RESPONSE` auf `http://localhost:3090`          | HTTPS verwenden: `https://localhost:3090` — Backend akzeptiert nur HTTPS.                    |
| `NET::ERR_CERT_AUTHORITY_INVALID`                         | `mkcert -install` einmalig ausführen, danach `pnpm gen:certs`.                               |
| Port bereits belegt                                       | `scripts/worktree-setup.sh` erkennt via `lsof` — Fehlerausgabe beachten, Port freigeben.     |
| API-Client zeigt veraltete Typen                          | `pnpm run generate-api` nach Backend-Endpoint-Änderung.                                      |
| `pnpm --filter … test -- --testPathPatterns`              | Memory: Pipe-Problem — direkt `cd packages/backend && npx jest --testPathPatterns=…` nutzen. |
| NestJS DI `Nest can't resolve dependencies …`             | `import type` für Injectable entfernt? `pnpm check:di:imports` laufen lassen.                |
| Swagger-Client hat keine Typen                            | Controller nutzt `@ApiOkResponse` statt `@ApiWrappedResponse` — AC7-Regel.                   |
| Commit wird abgelehnt („gitmoji invalid“)                 | `pnpm gitmoji:sync` (aktualisiert Snapshot) + Emoji aus offizieller Liste.                   |
| Circular Dependency in `domain/`                          | `pnpm --filter @bluelight-hub/backend lint:deps:core` zeigt Kette.                           |
| Prisma-Migration wartet auf DB                            | `docker compose up -d postgres` und Healthcheck prüfen.                                      |

---

## 5.11 Nützliche Ressourcen

- [Projektüberblick](./01-projektueberblick.md)
- [Backend-Architektur](./02-backend-architektur.md) · [Frontend-Architektur](./03-frontend-architektur.md)
- [API-Referenz](./04-api-referenz.md) · [Datenmodell](./06-datenmodell.md)
- [Testing & Qualität](./07-testing-und-qualitaet.md) · [DevOps](./08-devops-und-deployment.md)
- [ADRs](../adr/) · [Architecture Principles](../architecture-principles.md)
- [Code Conventions](../development-guide/code-conventions.md) · [Tauri-Plugins](../development-guide/tauri-plugins.md)
