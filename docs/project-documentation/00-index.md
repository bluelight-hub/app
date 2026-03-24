# Bluelight Hub - Dokumentationsindex

> **Projekt:** Bluelight Hub - Einsatzverwaltung für Blaulichtorganisationen
> **Version:** siehe CHANGELOG.md
> **Generiert:** 2026-01-04
> **Quelle:** Projekt-Scan v1.2.0

---

## Schnellstart

```bash
# Installation
pnpm install
docker-compose up -d
pnpm --filter @bluelight-hub/backend prisma:migrate

# Development
pnpm -r dev

# Ports: Frontend :3090 | Backend :3091 | DB :3092
```

---

## Dokumentations-Übersicht

| # | Dokument | Beschreibung |
|---|----------|--------------|
| 1 | [Projektübersicht](./01-projektueberblick.md) | Repository-Struktur, Tech Stack, Architektur-Patterns |
| 2 | [Backend-Architektur](./02-backend-architektur.md) | Hexagonal Architecture, CQRS, DDD, Code Review Checkliste |
| 3 | [Frontend-Architektur](./03-frontend-architektur.md) | React + TanStack Ecosystem, Atomic Design, Tauri |
| 4 | [API-Referenz](./04-api-referenz.md) | REST Endpoints, DTOs, WebSocket Events |
| 5 | [Entwicklungshandbuch](./05-entwicklungshandbuch.md) | Setup, Commands, Konventionen, Troubleshooting |
| ADR | [ADR-001: Platform Storage Strategy](./ADR-001-platform-storage-strategy.md) | Browser vs. Desktop Encryption, localStorage vs. IndexedDB, Tauri Stronghold |

---

## Projekt-Klassifikation

| Eigenschaft | Wert |
|-------------|------|
| **Repository-Typ** | Monorepo (pnpm Workspaces) |
| **Backend** | NestJS 11 + Prisma + PostgreSQL |
| **Frontend** | React 19 + Vite + Tauri 2 |
| **Shared** | Generierter TypeScript API Client |
| **Architektur (Backend)** | Hexagonal + CQRS + DDD |
| **Architektur (Frontend)** | Feature-based + Atomic Design |

---

## Key Technologien

### Backend
- NestJS 11.0.11
- TypeScript 5.8.3
- Prisma 6.8.2
- PostgreSQL 17
- Jest 30.0.0-beta.3

### Frontend
- React 19.1.0
- Vite 6.3.5
- Tauri 2.5.1
- TanStack (Router, Query, Form, Store)
- Tailwind CSS 4.1.10
- Vitest 3.2.3

### DevOps
- GitHub Actions
- Biome 1.9.4
- Husky + lint-staged
- semantic-release

---

## Breaking Rules (NIEMALS umgehen!)

1. **API Client:** NUR generierter Client + TanStack Query
2. **Styling:** NUR Tailwind CSS + Headless UI
3. **Forms:** NUR TanStack Form + Zod
4. **State:** NUR TanStack Query/Store
5. **Git:** NIEMALS `--no-verify`

---

## Wichtige Pfade

```
bluelight-hub/
├── packages/
│   ├── backend/           # NestJS API
│   │   ├── src/
│   │   │   ├── domain/        # Business Logic
│   │   │   ├── application/   # Use Cases
│   │   │   ├── infrastructure/# Adapters
│   │   │   └── modules/       # Controllers
│   │   └── prisma/            # DB Schema
│   ├── frontend/          # React + Tauri
│   │   ├── src/
│   │   │   ├── features/      # Feature Modules
│   │   │   ├── shared/        # Shared Components
│   │   │   └── routes/        # File-based Routing
│   │   └── src-tauri/         # Rust Backend
│   └── shared/            # API Client
├── docs/                  # Diese Dokumentation
└── CLAUDE.md             # AI Agent Instruktionen
```

---

## Deep-Dive Dokumentation

Detaillierte exhaustive Analysen spezifischer Bereiche:

| Bereich | Datei | Beschreibung | Dateien | LOC |
|---------|-------|--------------|---------|-----|
| **Backend (Gesamt)** | [deep-dive-backend.md](../deep-dive-backend.md) | Umfassende Analyse aller 4 Layer (Domain, Application, Infrastructure, Modules) | ~810 | ~187.000 |
| **Frontend (Gesamt)** | [deep-dive-frontend.md](../deep-dive-frontend.md) | Features, Routing, State Management, UI Library, API Layer | ~424 | ~85.000 |
| **Externe Schnittstellen** | [deep-dive-externe-system-schnittstellen.md](../deep-dive-externe-system-schnittstellen.md) | HiOrg-Server OAuth2 Integration, Nominatim Geocoding, Ports/Adapters, REST API | 62 | ~4.500 |
| **Frontend-Backend Integration** | [deep-dive-frontend-backend-integration.md](./deep-dive-frontend-backend-integration.md) | API-Generierung, Shared Client, TanStack Query Hooks, Datenfluss, 95+ Endpoints, 70+ Hooks | 150+ | ~25.000 |

*Zuletzt aktualisiert am 2026-01-05 durch Deep-Dive Mode*

---

## Architecture Decision Records (ADRs)

| Dokument | Status | Kontext | Beschreibung |
|----------|--------|---------|--------------|
| [ADR-001: Platform Storage Strategy](./ADR-001-platform-storage-strategy.md) | Decided | Story 2.1 | Browser (localStorage+Web Crypto) vs Desktop (Tauri Stronghold) Encryption |

## Story-Spezifische Guides

| Dokument | Story | Beschreibung |
|----------|-------|--------------|
| [PLATFORM-STORAGE-SUMMARY.md](./PLATFORM-STORAGE-SUMMARY.md) | 2.1 | Executive Summary: Quick Decision & Key Findings |
| [IMPLEMENTATION-GUIDE.md](./IMPLEMENTATION-GUIDE.md) | 2.1 | Code Templates, Setup Checklist, Testing Guide |

## Frontend Research & Guides

| Dokument | Pfad | Beschreibung |
|----------|------|--------------|
| [Platform Storage Research](../frontend/platform-storage-research.md) | `/docs/frontend/` | Browser Storage Research: localStorage vs IndexedDB, Web Crypto API, AES-GCM Encryption |

## Weiterführende Dokumentation

| Dokument | Pfad | Beschreibung |
|----------|------|--------------|
| CLAUDE.md | `/CLAUDE.md` | AI Agent Instruktionen (Breaking Rules, Patterns) |
| README.md | `/README.md` | Projekt-Einführung |
| CHANGELOG.md | `/CHANGELOG.md` | Version History |
| architecture.md | `/architecture.md` | Detaillierte Architektur |

---

## Kontakt & Support

- **Repository:** github.com/rubenvitt/bluelight-hub
- **Issues:** GitHub Issues

---

*Dokumentation generiert am 2026-01-04*
